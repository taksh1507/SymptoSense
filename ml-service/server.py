from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import numpy as np
import logging
import os
import threading
import time
import json
from datetime import datetime, timezone
from pathlib import Path

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = "confidence_model.joblib"
REPORT_PATH = Path(__file__).resolve().parent / "retrain_report.json"

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")  # optional
except Exception:
    pass

# Model is reloaded lazily whenever the weights file changes on disk, so a
# finished retrain takes effect without restarting the server.
_model_store = {"key": None, "model": None}


def load_model():
    try:
        st = os.stat(MODEL_PATH)
        key = (st.st_mtime_ns, st.st_size)
        if _model_store["key"] != key:
            model = joblib.load(MODEL_PATH)
            _model_store["model"] = model
            _model_store["key"] = key
            logger.info("Model (re)loaded from %s", MODEL_PATH)
        return _model_store["model"]
    except FileNotFoundError:
        return None
    except Exception as e:
        logger.error("Failed to load model: %s", e)
        return None


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
    model = load_model()
    if model is None:
        logger.warning("Model not loaded — returning service unavailable")
        raise HTTPException(status_code=503, detail="Model not loaded")

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
        logger.error(f"Prediction failed: {e}", exc_info=True)
        # Report the failure as unavailable instead of silently returning a
        # fake 0.7/Medium — the Next.js proxy maps non-OK to confidence:null.
        raise HTTPException(status_code=503, detail=f"Prediction failed: {e}")


def _run_retrain_background():
    try:
        from retrain import run_retrain
        report = run_retrain()
    except Exception as e:
        logger.error(f"Retrain failed: {e}", exc_info=True)
        report = {
            "createdAt": None,
            "error": f"Retrain failed: {e}",
            "promoted": False,
        }
    try:
        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logger.info("Retrain finished: promoted=%s", report.get("promoted"))
    except Exception as e:
        logger.error(f"Failed to write retrain report: {e}")


@app.post("/api/retrain")
async def trigger_retrain(request: Request):
    token = os.environ.get("RETRAIN_TOKEN")
    if token:
        if request.headers.get("X-Retrain-Token") != token:
            raise HTTPException(status_code=403, detail="Invalid retrain token")
    threading.Thread(target=_run_retrain_background, daemon=True).start()
    return {"status": "accepted"}


@app.get("/api/retrain/report")
async def retrain_report():
    if not REPORT_PATH.is_file():
        raise HTTPException(status_code=404, detail="No retrain report yet")
    return json.loads(REPORT_PATH.read_text(encoding="utf-8"))


@app.get("/health")
async def health():
    model = load_model()
    return {"status": "healthy", "model_loaded": model is not None}


# ── Background scheduler: follow-up reminders + periodic retrain ──
# The loop can run itself while the server is up:
#   REMINDER_CHECK_MINUTES    (default 60)   how often to scan for due check-ins
#   RETRAIN_INTERVAL_HOURS    (default 0)    >0 enables periodic retraining
#   RETRAIN_MIN_REAL          (default 20)   real rows needed before blending
def _scheduler_loop():
    reminder_minutes = int(os.environ.get("REMINDER_CHECK_MINUTES", "60"))
    retrain_hours = float(os.environ.get("RETRAIN_INTERVAL_HOURS", "0"))
    reminder_interval_s = max(60, reminder_minutes * 60)
    retrain_interval_s = retrain_hours * 3600 if retrain_hours > 0 else None
    last_retrain = datetime.now(timezone.utc)

    while True:
        time.sleep(reminder_interval_s)
        try:
            from followup_reminders import run_reminders
            run_reminders()
        except Exception as e:
            logger.error("Reminder scan failed: %s", e)

        if retrain_interval_s:
            now = datetime.now(timezone.utc)
            if (now - last_retrain).total_seconds() >= retrain_interval_s:
                logger.info("Scheduled retrain starting")
                threading.Thread(target=_run_retrain_background, daemon=True).start()
                last_retrain = now


def _start_scheduler():
    if os.environ.get("SCHEDULER_DISABLED") == "1":
        return
    threading.Thread(target=_scheduler_loop, daemon=True).start()
    logger.info("Background scheduler started")


if __name__ == "__main__":
    _start_scheduler()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
else:
    _start_scheduler()