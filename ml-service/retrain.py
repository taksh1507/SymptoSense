"""Train only against independently reviewed assessment correctness.

Synthetic heuristic labels and symptom improvement are never treated as clinical
correctness labels. A fixed patient-level holdout stays outside all training.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.model_selection import GroupKFold
from inference import FEATURE_COLUMNS, MODEL_PATH, PredictionInput
from storage import ROOT, connect_db, database_path

DEFAULT_REPORT_FILE = ROOT / 'ml-service' / 'retrain_report.json'
MIN_REAL_ROWS = 50

def derive_label(outcome):
    reviewed = outcome.get('reviewedCorrect')
    return int(reviewed) if reviewed in (0, 1, False, True) and reviewed is not None else None

def normalize_rule_score(value):
    if value is None or not 0 <= float(value) <= 100:
        return None
    return float(value) / 100.0

def load_real_rows(db_path):
    con = connect_db(db_path)
    try:
        return con.execute('''
          WITH ranked AS (
            SELECT pl.*, ROW_NUMBER() OVER (PARTITION BY pl.testSessionId ORDER BY pl.createdAt DESC, pl.id DESC) AS rn
            FROM PredictionLog pl WHERE pl.mlAvailable = 1
          )
          SELECT pl.features, fu.reviewedCorrect, COALESCE(ts.userId, ts.id), ts.id
          FROM ranked pl JOIN FollowUp fu ON fu.testSessionId = pl.testSessionId
          JOIN TestSession ts ON ts.id = pl.testSessionId
          WHERE pl.rn = 1 AND ts.assessmentPayload IS NOT NULL AND ts.ruleVersion IS NOT NULL
            AND pl.userId = ts.userId AND pl.ruleScore = ts.score AND pl.modelVersion IS ts.modelVersion
            AND fu.status = 'responded' AND fu.reviewedCorrect IS NOT NULL AND fu.reviewedAt IS NOT NULL
        ''').fetchall()
    finally:
        con.close()

def reviewed_dataframe(db_path):
    records = []
    skipped = 0
    for features_json, label, patient, session in load_real_rows(db_path):
        try:
            validated = PredictionInput.model_validate(json.loads(features_json)).model_dump()
            validated['rule_score'] /= 100
            validated.update(target=int(label), patient=patient, session=session)
            records.append(validated)
        except (ValueError, TypeError):
            skipped += 1
    return pd.DataFrame(records), skipped

def fixed_holdout(patient):
    return int(hashlib.sha256(str(patient).encode()).hexdigest()[:8], 16) % 5 == 0

def safety_gate(y_true, y_pred, champion_metrics=None, baseline_brier=.25):
    failures = []
    if not np.isfinite(y_pred).all() or ((y_pred < 0) | (y_pred > 1)).any():
        return ['Invalid probabilities'], {'brier': None, 'logLoss': None}
    metrics = {'brier': float(brier_score_loss(y_true, y_pred)), 'logLoss': float(log_loss(y_true, y_pred, labels=[0, 1]))}
    if champion_metrics and metrics['brier'] >= champion_metrics['brier']:
        failures.append('Candidate does not improve the reviewed holdout Brier score')
    if metrics['brier'] >= min(.25, baseline_brier):
        failures.append('Candidate does not beat the independent holdout baseline')
    return failures, metrics

def run_retrain(min_real=MIN_REAL_ROWS, model_path=MODEL_PATH, db_path=None):
    db_path = db_path or database_path()
    frame, skipped = reviewed_dataframe(db_path)
    report = {'createdAt': datetime.now(timezone.utc).isoformat(), 'rows_real': len(frame), 'rows_real_skipped': skipped,
              'rows_synthetic': 0, 'rows_synth_used': 0, 'scoreKind': 'reviewed_appropriateness_probability', 'promoted': False}
    if len(frame) < min_real:
        report['note'] = 'Insufficient independently reviewed outcomes; current heuristic model remains unchanged.'
        report['gate'] = {'passed': False, 'failed': ['Reviewed outcome evidence is required']}
        return report
    holdout = frame['patient'].map(fixed_holdout)
    train, test = frame[~holdout], frame[holdout]
    if len(train) < 20 or len(test) < 10 or train.patient.nunique() < 3 or train.target.nunique() < 2 or test.target.nunique() < 2:
        report['gate'] = {'passed': False, 'failed': ['Need sufficient patients and both outcome classes in training and fixed holdout']}
        return report
    splits = list(GroupKFold(3).split(train[FEATURE_COLUMNS], train.target, groups=train.patient))
    if any(train.iloc[fit].target.nunique() < 2 or train.iloc[cal].target.nunique() < 2 for fit, cal in splits):
        report['gate'] = {'passed': False, 'failed': ['Calibration folds require both outcome classes']}
        return report
    classifier = RandomForestClassifier(n_estimators=250, max_depth=12, min_samples_leaf=6, max_features='sqrt', random_state=42, n_jobs=-1)
    candidate = CalibratedClassifierCV(classifier, method='sigmoid', cv=splits)
    candidate.fit(train[FEATURE_COLUMNS], train.target)
    prediction = candidate.predict_proba(test[FEATURE_COLUMNS])[:, list(candidate.classes_).index(1)]
    champion_metrics = None
    metadata_path = Path(model_path).with_suffix('.json')
    if metadata_path.exists() and json.loads(metadata_path.read_text()).get('scoreKind') == report['scoreKind']:
        try:
            champion = joblib.load(model_path)
            probabilities = champion.predict_proba(test[FEATURE_COLUMNS])[:, list(champion.classes_).index(1)]
            champion_metrics = {'brier': float(brier_score_loss(test.target, probabilities))}
        except Exception:
            report['champion_error'] = 'Current reviewed model could not be evaluated'
            report['gate'] = {'passed': False, 'failed': ['Unable to compare candidate with current reviewed model']}
            return report
    baseline_brier = float(brier_score_loss(test.target, np.full(len(test), train.target.mean())))
    failures, metrics = safety_gate(test.target, prediction, champion_metrics, baseline_brier)
    report.update(candidate=metrics, champion=champion_metrics, baselineBrier=baseline_brier, rows_train=len(train), rows_holdout=len(test), gate={'passed': not failures, 'failed': failures})
    if not failures:
        path = Path(model_path)
        temporary = path.with_suffix('.candidate')
        joblib.dump(candidate, temporary)
        version = hashlib.sha256(temporary.read_bytes()).hexdigest()[:16]
        metadata_temp = metadata_path.with_suffix('.json.tmp')
        metadata_temp.write_text(json.dumps({'scoreKind': report['scoreKind'], 'modelVersion': version, 'ruleVersion': '2026-10-13.1', 'metrics': metrics, 'createdAt': report['createdAt']}, indent=2), encoding='utf-8')
        metadata_temp.replace(metadata_path)
        temporary.replace(path)
        report.update(promoted=True, modelVersion=version)
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--min-real', type=int, default=int(os.getenv('RETRAIN_MIN_REAL', str(MIN_REAL_ROWS))))
    args = parser.parse_args()
    report = run_retrain(min_real=args.min_real)
    DEFAULT_REPORT_FILE.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
