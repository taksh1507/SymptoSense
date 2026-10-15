import json
from pathlib import Path
import pandas as pd
import pytest
from starlette.testclient import TestClient

SERVICE = Path(__file__).resolve().parent.parent
DATA_DIR = SERVICE / 'data'
REPORTS_DIR = SERVICE / 'reports'
ARTIFACTS_DIR = SERVICE / 'artifacts' / 'clinical'

from train_clinical import deduplicate_dataset, normalize
from server import app

def test_clinical_dataset_deduplication():
    csv_path = DATA_DIR / 'dataset.csv'
    assert csv_path.exists(), "dataset.csv must exist"
    df = pd.read_csv(csv_path)
    assert len(df) == 4920, f"Expected 4920 raw rows, got {len(df)}"

    symptom_columns = [c for c in df.columns if c != 'Disease']
    unique_records = deduplicate_dataset(df, symptom_columns)
    assert len(unique_records) == 304, f"Expected exactly 304 unique patterns, got {len(unique_records)}"

    diseases = {r[0] for r in unique_records}
    assert len(diseases) == 41, f"Expected 41 distinct diseases, got {len(diseases)}"

def test_clinical_report_schema_and_metrics():
    report_path = REPORTS_DIR / 'clinical_report.json'
    assert report_path.exists(), "clinical_report.json must be saved in reports/"
    report = json.loads(report_path.read_text(encoding='utf-8'))

    assert report['schema_version'] == 1
    assert report['dataset']['raw_rows'] == 4920
    assert report['dataset']['unique_rows'] == 304
    assert report['dataset']['num_diseases'] == 41
    assert report['dataset']['deduplication_ratio'] > 15.0

    assert report['split']['train_rows'] == 243
    assert report['split']['test_rows'] == 61
    assert report['split']['stratified'] is True

    test_metrics = report['holdout_test_metrics']
    assert test_metrics['accuracy'] >= 0.95
    assert test_metrics['macro_f1'] >= 0.95
    assert test_metrics['top3_accuracy'] >= 0.95
    assert test_metrics['top5_accuracy'] >= 0.95
    assert 0.0 < test_metrics['multiclass_brier_score'] < 1.0
    assert 0.0 < test_metrics['log_loss'] < 5.0

def test_clinical_report_fastapi_endpoint():
    client = TestClient(app)
    response = client.get('/clinical-report')
    assert response.status_code == 200
    data = response.json()
    assert data['schema_version'] == 1
    assert data['dataset']['num_diseases'] == 41
    assert 'holdout_test_metrics' in data
