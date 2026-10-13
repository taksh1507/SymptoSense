"""Disease inference is independent of the retained legacy confidence endpoint."""
from difflib import get_close_matches
import hashlib
import json
import math
import os
import threading
import numpy as np
import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictStr
from ml_pipeline.data import SERVICE, normalize
from ml_pipeline.explain import explain_input

router = APIRouter()
REPORT_PATH = SERVICE / 'reports' / 'ml_report.json'
ARTIFACTS = SERVICE / 'artifacts'
_lock = threading.RLock()
_cache = None
_cache_version = None
ALIASES = {'rash': 'skin_rash', 'skin rash': 'skin_rash', 'stomach ache': 'stomach_pain', 'abdominal pain': 'abdominal_pain', 'shortness of breath': 'breathlessness', 'difficulty breathing': 'breathlessness', 'dizzy': 'dizziness', 'tiredness': 'fatigue', 'head ache': 'headache', 'sneezing': 'continuous_sneezing', 'low fever': 'mild_fever'}

class DiseaseInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    symptoms: list[StrictStr] = Field(min_length=1, max_length=132)
    age_group: StrictStr | None = Field(default=None, max_length=80)
    severity: StrictStr | None = Field(default=None, max_length=80)
    duration: StrictStr | None = Field(default=None, max_length=80)

class Condition(BaseModel):
    disease: str
    probability: float = Field(ge=0, le=1)

class Contribution(BaseModel):
    symptom: str
    contribution: float
    present: bool

class DiseaseOutput(BaseModel):
    top3: list[Condition]
    confidence: float = Field(ge=0, le=1)
    uncertain: bool
    urgency: str
    model_urgency: str
    red_flag_override: bool
    shap_top5: list[Contribution]
    ignored_symptoms: list[str]
    mapped_symptoms: list[dict[str, str]]
    symptoms_used: list[str]
    uncertainty_threshold: float
    model_version: str
    disclaimer: str
    context_note: str

def load_bundle():
    global _cache, _cache_version
    with _lock:
        try:
            version = REPORT_PATH.stat().st_mtime_ns
            if _cache is not None and _cache_version == version:
                return _cache
            report = json.loads(REPORT_PATH.read_text(encoding='utf-8'))
            for filename, expected in report['artifacts'].items():
                if hashlib.sha256((ARTIFACTS / filename).read_bytes()).hexdigest() != expected:
                    raise ValueError('Artifact hash mismatch')
            bundle = {key: joblib.load(ARTIFACTS / filename) for key, filename in {'model': 'calibrated_model.joblib', 'encoder': 'label_encoder.joblib', 'urgency': 'urgency_model.joblib', 'background': 'shap_background.joblib'}.items()}
            bundle.update(symptoms=json.loads((ARTIFACTS / 'symptom_list.json').read_text()), red_flags=json.loads((ARTIFACTS / 'red_flags.json').read_text()), report=report)
            if bundle['symptoms'] != report['symptoms']:
                raise ValueError('Vocabulary mismatch')
            _cache, _cache_version = bundle, version
            return bundle
        except Exception as error:
            raise HTTPException(503, {'status': 'unavailable', 'error': 'Disease model unavailable; run train_pipeline.py'}) from error

def map_symptoms(raw, known):
    used, ignored, mapped = [], [], []
    for value in raw:
        key = normalize(value)
        alias = normalize(ALIASES.get(value.lower().strip(), ALIASES.get(key.replace('_', ' '), key)))
        candidate = alias if alias in known else None
        if candidate is None:
            # Correct close spelling only: ambiguous near matches are rejected.
            close = get_close_matches(key, known, n=2, cutoff=0.94)
            if len(close) == 1:
                candidate = close[0]
        if candidate is None:
            ignored.append(value)
        else:
            if candidate not in used:
                used.append(candidate)
            if candidate != value:
                mapped.append({'input': value, 'symptom': candidate})
    return used, ignored, mapped

@router.post('/predict-disease', response_model=DiseaseOutput)
def predict_disease(data: DiseaseInput):
    bundle = load_bundle()
    if any(not symptom.strip() or len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, 'Symptoms must be non-empty strings of at most 100 characters')
    used, ignored, mapped = map_symptoms(data.symptoms, bundle['symptoms'])
    flags = set(bundle['red_flags'])
    override = any(normalize(v) in flags or normalize(ALIASES.get(v.lower().strip(), v)) in flags for v in data.symptoms + used)
    if not used:
        raise HTTPException(422, {'error': 'No known symptoms supplied', 'ignored_symptoms': ignored, 'known_symptoms': bundle['symptoms'], 'red_flag_override': override, 'urgency': 'High' if override else None})
    vector = np.array([float(symptom in used) for symptom in bundle['symptoms']])
    with _lock:
        probability = bundle['model'].predict_proba(vector.reshape(1, -1))[0]
        order = np.argsort(probability)[::-1][:3]
        confidence = float(probability[order[0]])
        model_urgency = str(bundle['urgency'].predict(vector.reshape(1, -1))[0])
        contributions = explain_input(bundle['model'], bundle['background'], bundle['symptoms'], vector, int(order[0]))
    try:
        threshold = float(os.getenv('DISEASE_CONFIDENCE_THRESHOLD', str(bundle['report']['calibration']['uncertainty_threshold'])))
        if not math.isfinite(threshold) or not 0 <= threshold <= 1:
            raise ValueError()
    except ValueError as error:
        raise HTTPException(503, 'Invalid DISEASE_CONFIDENCE_THRESHOLD configuration') from error
    return {'top3': [{'disease': str(bundle['encoder'].classes_[i]), 'probability': float(probability[i])} for i in order], 'confidence': confidence, 'uncertain': confidence < threshold, 'urgency': 'High' if override else model_urgency, 'model_urgency': model_urgency, 'red_flag_override': override, 'shap_top5': contributions, 'ignored_symptoms': ignored, 'mapped_symptoms': mapped, 'symptoms_used': used, 'uncertainty_threshold': threshold, 'model_version': bundle['report']['model_version'], 'disclaimer': bundle['report']['disclaimer'], 'context_note': 'Age, intensity and duration are not disease-model features. Urgency is a derived-label research model; clinical triage uses the rule engine.'}

@router.get('/ml-report')
def ml_report():
    try:
        return json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise HTTPException(503, {'status': 'unavailable', 'error': 'Training report unavailable'}) from error
