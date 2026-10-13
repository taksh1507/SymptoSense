"""One prediction contract and model artifact for standalone and serverless serving."""
import hashlib
import json
import logging
import os
from pathlib import Path
from threading import RLock
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from storage import ROOT

logger = logging.getLogger(__name__)
MODEL_PATH = Path(os.getenv('MODEL_PATH', str(ROOT / 'ml-service' / 'confidence_model.joblib'))).resolve()
FEATURE_COLUMNS = ['age_group', 'severity', 'duration', 'fever', 'cough', 'chest_pain', 'dizziness', 'fatigue', 'diabetes', 'heart_disease', 'rule_score', 'risk_level', 'symptom_intensity_score', 'symptom_consistency_score', 'symptom_progression', 'answer_confidence_proxy', 'ambiguity_score', 'multi_symptom_density']
_store = {'key': None, 'model': None, 'version': None, 'kind': 'synthetic_heuristic'}
_lock = RLock()

class PredictionInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    age_group: int = Field(..., ge=0, le=2, strict=True)
    severity: int = Field(..., ge=1, le=4, strict=True)
    duration: int = Field(..., ge=1, le=4, strict=True)
    fever: int = Field(0, ge=0, le=1, strict=True)
    cough: int = Field(0, ge=0, le=1, strict=True)
    chest_pain: int = Field(0, ge=0, le=1, strict=True)
    dizziness: int = Field(0, ge=0, le=1, strict=True)
    fatigue: int = Field(0, ge=0, le=1, strict=True)
    diabetes: int = Field(0, ge=0, le=1, strict=True)
    heart_disease: int = Field(0, ge=0, le=1, strict=True)
    rule_score: float = Field(..., ge=0, le=100, allow_inf_nan=False)
    risk_level: int = Field(..., ge=0, le=2, strict=True)
    symptom_intensity_score: float = Field(1, ge=0, le=4, allow_inf_nan=False)
    symptom_consistency_score: float = Field(1, ge=0, le=1, allow_inf_nan=False)
    symptom_progression: float = Field(1, ge=0, le=2, allow_inf_nan=False)
    answer_confidence_proxy: float = Field(0.8, ge=0, le=1, allow_inf_nan=False)
    ambiguity_score: float = Field(0, ge=0, le=1, allow_inf_nan=False)
    multi_symptom_density: float = Field(0, ge=0, le=1, allow_inf_nan=False)

def load_model():
    with _lock:
        try:
            stat = MODEL_PATH.stat()
            metadata = MODEL_PATH.with_suffix('.json')
            meta_stat = metadata.stat() if metadata.exists() else None
            key = (stat.st_mtime_ns, stat.st_size, meta_stat.st_mtime_ns if meta_stat else None)
            if key != _store['key']:
                model = joblib.load(MODEL_PATH)
                if list(model.feature_names_in_) != FEATURE_COLUMNS:
                    raise ValueError('Model feature contract mismatch')
                version = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()[:16]
                manifest = json.loads(metadata.read_text()) if meta_stat else {}
                if manifest.get('modelVersion', version) != version:
                    raise ValueError('Model promotion in progress')
                _store.update(key=key, model=model, version=version, kind=manifest.get('scoreKind', 'synthetic_heuristic'))
            return _store['model']
        except Exception:
            logger.warning('Confidence model unavailable')
            return None

def predict_confidence(payload: PredictionInput):
    # One snapshot of weights, kind and version even during concurrent reloads.
    with _lock:
        return _predict(payload)

def _predict(payload: PredictionInput):
    model = load_model()
    if model is None:
        raise HTTPException(503, 'Model unavailable')
    data = payload.model_dump()
    data['rule_score'] /= 100.0  # API accepts raw 0–100 only; no ambiguous auto-detection.
    try:
        frame = pd.DataFrame([data], columns=FEATURE_COLUMNS)
        if _store['kind'] == 'reviewed_appropriateness_probability':
            confidence = float(model.predict_proba(frame)[0, list(model.classes_).index(1)])
        else:
            confidence = float(model.predict(frame)[0])
        if not 0 <= confidence <= 1:
            raise ValueError('Invalid model score')
        return {'confidence': round(confidence, 4), 'confidenceLevel': 'High' if confidence >= .8 else 'Medium' if confidence >= .55 else 'Low', 'modelVersion': _store['version'], 'scoreKind': _store['kind']}
    except Exception:
        logger.warning('Confidence prediction unavailable')
        raise HTTPException(503, 'Prediction unavailable') from None

def health():
    model = load_model()
    return {'status': 'healthy' if model is not None else 'unavailable', 'model_loaded': model is not None, 'modelVersion': _store['version'] if model is not None else None}

def prediction_app():
    app = FastAPI(title='SymptoSense Model Score API')
    for path in ['/predict-confidence', '/api/predict-confidence', '/']:
        app.post(path)(predict_confidence)
    for path in ['/health', '/api/health']:
        app.get(path)(health)
    return app
