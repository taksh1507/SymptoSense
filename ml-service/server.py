from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import hmac
import json
import logging
import os
import threading
from fastapi import HTTPException, Request
from inference import prediction_app
from storage import ROOT

logger = logging.getLogger(__name__)
REPORT_PATH = ROOT / 'ml-service' / 'retrain_report.json'
_retrain_lock = threading.Lock()
_scheduler_stop = threading.Event()

def authorize(request: Request):
    expected = os.getenv('RETRAIN_TOKEN')
    provided = request.headers.get('X-Retrain-Token', '')
    if not expected or not hmac.compare_digest(provided, expected):
        raise HTTPException(403, 'Administrative service authentication required')

def _run_retrain_background():
    if not _retrain_lock.acquire(blocking=False):
        return
    try:
        from retrain import run_retrain
        report = run_retrain()
        temporary = REPORT_PATH.with_suffix('.tmp')
        temporary.write_text(json.dumps(report, indent=2), encoding='utf-8')
        temporary.replace(REPORT_PATH)
    except Exception:
        logger.exception('Retraining failed')
    finally:
        _retrain_lock.release()

def _scheduler_loop():
    interval = max(60, int(os.getenv('REMINDER_CHECK_MINUTES', '60')) * 60)
    retrain_interval = max(0, float(os.getenv('RETRAIN_INTERVAL_HOURS', '0'))) * 3600
    last_retrain = datetime.now(timezone.utc)
    while not _scheduler_stop.wait(interval):
        try:
            from followup_reminders import run_reminders
            run_reminders()
        except Exception:
            logger.exception('Reminder scan failed')
        if retrain_interval and (datetime.now(timezone.utc) - last_retrain).total_seconds() >= retrain_interval:
            threading.Thread(target=_run_retrain_background, daemon=True).start()
            last_retrain = datetime.now(timezone.utc)

@asynccontextmanager
async def lifespan(app):
    _scheduler_stop.clear()
    thread = None
    if os.getenv('SCHEDULER_DISABLED', '1') != '1':
        thread = threading.Thread(target=_scheduler_loop, daemon=True)
        thread.start()
    try:
        yield
    finally:
        _scheduler_stop.set()
        if thread:
            thread.join(timeout=2)

from disease_inference import router as disease_router

app = prediction_app()
app.include_router(disease_router)
app.router.lifespan_context = lifespan

@app.post('/api/retrain')
def trigger_retrain(request: Request):
    authorize(request)
    if _retrain_lock.locked():
        raise HTTPException(409, 'Retraining already running')
    # Claim before starting the worker to prevent concurrent request races.
    if not _retrain_lock.acquire(blocking=False):
        raise HTTPException(409, 'Retraining already running')
    def worker():
        try:
            from retrain import run_retrain
            report = run_retrain()
            temporary = REPORT_PATH.with_suffix('.tmp')
            temporary.write_text(json.dumps(report, indent=2), encoding='utf-8')
            temporary.replace(REPORT_PATH)
        except Exception:
            logger.exception('Retraining failed')
        finally:
            _retrain_lock.release()
    threading.Thread(target=worker, daemon=True).start()
    return {'status': 'accepted'}

@app.get('/api/retrain/report')
def retrain_report(request: Request):
    authorize(request)
    if not REPORT_PATH.exists():
        raise HTTPException(404, 'No retraining report')
    data = json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    data.pop('db', None)
    return data

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=os.getenv('ML_HOST', '127.0.0.1'), port=int(os.getenv('ML_PORT', '8000')))
