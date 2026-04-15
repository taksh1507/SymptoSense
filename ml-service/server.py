from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load model
MODEL_PATH = "confidence_model.joblib"
try:
    model = joblib.load(MODEL_PATH)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

app = FastAPI(title="SymptoSense Confidence API")

class PredictionInput(BaseModel):
    # Features
    age_group: int = Field(..., ge=0, le=2, description="0=child, 1=adult, 2=senior")
    severity: int = Field(..., ge=1, le=3, description="1=mild, 2=moderate, 3=severe")
    duration: int = Field(..., ge=1, le=3, description="1=<1d, 2=1-3d, 3=>3d")
    fever: int = Field(0, ge=0, le=1)
    cough: int = Field(0, ge=0, le=1)
    chest_pain: int = Field(0, ge=0, le=1)
    dizziness: int = Field(0, ge=0, le=1)
    fatigue: int = Field(0, ge=0, le=1)
    diabetes: int = Field(0, ge=0, le=1)
    heart_disease: int = Field(0, ge=0, le=1)
    # rule_score: accepts raw 0–100 (normalized server-side before prediction)
    rule_score: float = Field(..., ge=0, le=100, description="Raw rule score 0–100, normalized internally")
    risk_level: int = Field(..., ge=0, le=2, description="0=LOW, 1=MEDIUM, 2=HIGH")

    # Dynamic behavioral features
    symptom_intensity_score: float = Field(1.0, ge=0, le=3)
    symptom_consistency_score: float = Field(1.0, ge=0, le=1)
    symptom_progression: float = Field(1.0, ge=0, le=2)
    answer_confidence_proxy: float = Field(0.8, ge=0, le=1)
    ambiguity_score: float = Field(0.0, ge=0, le=1)
    multi_symptom_density: float = Field(0.0, ge=0, le=1)

@app.post("/predict-confidence")
async def predict_confidence(input_data: PredictionInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Confidence model not loaded")

    data = input_data.dict()

    # ── STEP 2: Normalize rule_score to 0–1 before prediction ──
    # Matches the training schema where rule_score is stored as 0–1
    data['rule_score'] = round(data['rule_score'] / 100.0, 4)

    df = pd.DataFrame([data])
    
    # Prediction
    try:
        confidence = float(model.predict(df)[0])
        
        # Classification of Level aligned with expanded distribution:
        # High: ≥0.80, Medium: 0.55–0.80, Low: <0.55
        if confidence >= 0.80:
            level = "High"
        elif confidence >= 0.55:
            level = "Medium"
        else:
            level = "Low"
            
        logger.info(f"Prediction: rule_score={input_data.rule_score:.1f} ({data['rule_score']:.2f} normalized), "
                    f"Confidence={confidence:.2f} ({level})")
        
        return {
            "confidence": round(confidence, 4),
            "confidenceLevel": level
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Internal prediction error")

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
