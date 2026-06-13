from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import os
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load model
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "confidence_model.joblib")

try:
    model = joblib.load(model_path)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

class PredictionInput(BaseModel):
    age_group: int = Field(..., ge=0, le=2)
    severity: int = Field(..., ge=1, le=3)
    duration: int = Field(..., ge=1, le=3)
    fever: int = Field(0, ge=0, le=1)
    cough: int = Field(0, ge=0, le=1)
    chest_pain: int = Field(0, ge=0, le=1)
    dizziness: int = Field(0, ge=0, le=1)
    fatigue: int = Field(0, ge=0, le=1)
    diabetes: int = Field(0, ge=0, le=1)
    heart_disease: int = Field(0, ge=0, le=1)
    rule_score: float = Field(..., ge=0, le=100)
    risk_level: int = Field(..., ge=0, le=2)
    symptom_intensity_score: float = Field(1.0, ge=0, le=3)
    symptom_consistency_score: float = Field(1.0, ge=0, le=1)
    symptom_progression: float = Field(1.0, ge=0, le=2)
    answer_confidence_proxy: float = Field(0.8, ge=0, le=1)
    ambiguity_score: float = Field(0.0, ge=0, le=1)
    multi_symptom_density: float = Field(0.0, ge=0, le=1)

@app.post("/api/predict-confidence")
def predict_confidence(input_data: PredictionInput):
    if model is None:
        logger.warning("Model not loaded — returning fallback confidence")
        return {"confidence": 0.7, "confidenceLevel": "Medium"}

    data = input_data.dict()
    data['rule_score'] = round(data['rule_score'] / 100.0, 4)

    df = pd.DataFrame([data])
    
    try:
        confidence = float(model.predict(df)[0])
        if confidence >= 0.80:
            level = "High"
        elif confidence >= 0.55:
            level = "Medium"
        else:
            level = "Low"
            
        logger.info(f"Prediction: rule_score={input_data.rule_score:.1f}, Confidence={confidence:.2f} ({level})")
        return {
            "confidence": round(confidence, 4),
            "confidenceLevel": level
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {
            "confidence": 0.7,
            "confidenceLevel": "Medium"
        }

@app.get("/api/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}
