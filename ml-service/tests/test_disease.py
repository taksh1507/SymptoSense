import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from server import app
from disease_inference import DiseaseOutput, disease_safety_floor, load_bundle, map_symptoms
from ml_pipeline.data import load_dataset, SERVICE

@pytest.fixture(scope='module')
def client():
    with TestClient(app) as value:
        yield value

def test_pipeline_schema_and_leakage():
    report = json.loads((SERVICE / 'reports/ml_report.json').read_text())
    for field in ['dataset', 'training', 'evaluation', 'calibration', 'explainability', 'urgency', 'artifacts']:
        assert field in report
    X, y, symptoms, _ = load_dataset()
    train, test = report['split']['train_indices'], report['split']['test_indices']
    assert not set(train) & set(test)
    assert len(train) + len(test) == len(X)
    assert set(map(tuple, X.iloc[train].to_numpy())).isdisjoint(set(map(tuple, X.iloc[test].to_numpy())))
    assert set(y.iloc[train]) == set(y.iloc[test])
    assert report['symptoms'] == symptoms
    assert len(report['training']['comparison']) == 4
    assert len({row['model'] for row in report['training']['hyperparameters']}) == 2
    for model in report['training']['comparison']:
        for metric in ['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'top3_accuracy']:
            values = model['metrics'][metric]
            assert len(values['folds']) == 5
            assert np.isclose(values['mean'], np.mean(values['folds']))
            assert np.isclose(values['std'], np.std(values['folds']))
    assert len(report['evaluation']['confusion_matrix']) == len(report['classes'])
    assert np.array(report['evaluation']['confusion_matrix']).sum() == len(test)
    assert [p['percent_dropped'] for p in report['evaluation']['robustness']] == [0, 10, 20, 30, 40]
    assert len(report['explainability']['global_importance']) == 15
    for curve in ['curve_before', 'curve_after']:
        assert sum(point['count'] for point in report['calibration'][curve]) == len(test)
    assert len(list((SERVICE / 'reports/figures').glob('*.png'))) >= 10

def test_valid_disease_and_probability(client):
    response = client.post('/predict-disease', json={'symptoms': ['itching', 'skin_rash', 'nodal_skin_eruptions']})
    assert response.status_code == 200
    data = DiseaseOutput.model_validate(response.json())
    assert len(data.top3) == 3 and len(data.shap_top5) == 5
    assert data.confidence == data.top3[0].probability
    assert data.uncertain == (data.confidence < data.uncertainty_threshold)
    assert 'Not a medical diagnosis' in data.disclaimer

@pytest.mark.parametrize('symptoms', [[], ['invented_symptom'], [''], [123]])
def test_invalid_and_empty(client, symptoms):
    assert client.post('/predict-disease', json={'symptoms': symptoms}).status_code == 422

def test_unknown_symptoms_are_not_model_features():
    known = load_bundle()['symptoms']
    used, ignored, mapped = map_symptoms(['skin rash', 'invented_symptom'], known)
    assert used == ['skin_rash']
    assert ignored == ['invented_symptom']
    assert mapped == [{'input': 'skin rash', 'symptom': 'skin_rash'}]

def test_red_flag_override(client):
    data = client.post('/predict-disease', json={'symptoms': ['itching', 'chest_pain']}).json()
    assert data['urgency'] == 'High' and data['red_flag_override'] is True

def test_stroke_like_dataset_symptoms_trigger_red_flag_override(client):
    symptoms = ['vomiting', 'headache', 'weakness_of_one_body_side', 'altered_sensorium']
    data = client.post('/predict-disease', json={'symptoms': symptoms}).json()
    assert data['urgency'] == 'High' and data['red_flag_override'] is True
    assert set(symptoms).issubset(set(data['symptoms_used']))

@pytest.mark.parametrize(('disease', 'expected'), [
    ('Heart attack', 'High'),
    ('Paralysis (brain hemorrhage)', 'High'),
    ('Tuberculosis', 'Medium'),
])
def test_disease_level_safety_floors(disease, expected):
    floor, matches = disease_safety_floor([{'disease': disease, 'probability': 0.01}])
    assert floor == expected and matches == [disease]

def test_highest_disease_safety_floor_wins():
    floor, matches = disease_safety_floor([
        {'disease': 'Tuberculosis', 'probability': 0.4},
        {'disease': 'Heart attack', 'probability': 0.2},
    ])
    assert floor == 'High' and matches == ['Tuberculosis', 'Heart attack']

def test_unsupported_red_flag_still_signals_emergency(client):
    response = client.post('/predict-disease', json={'symptoms': ['severe_bleeding']})
    assert response.status_code == 422
    assert response.json()['detail']['urgency'] == 'High'
    assert response.json()['detail']['red_flag_override'] is True

def test_uncertainty_threshold_is_configurable(client, monkeypatch):
    monkeypatch.setenv('DISEASE_CONFIDENCE_THRESHOLD', '1')
    response = client.post('/predict-disease', json={'symptoms': ['itching']})
    assert response.status_code == 200 and response.json()['uncertain'] is True

def test_report_and_legacy_health(client):
    assert client.get('/ml-report').json()['schema_version'] == 1
    assert client.get('/health').status_code == 200

def test_model_unavailable_has_no_fabricated_prediction(client, monkeypatch):
    import disease_inference as inference
    monkeypatch.setattr(inference, '_cache', None)
    monkeypatch.setattr(inference, 'REPORT_PATH', SERVICE / 'not-a-real-report.json')
    response = client.post('/predict-disease', json={'symptoms': ['itching']})
    assert response.status_code == 503
    assert 'top3' not in response.json()


def test_severity_ambiguity_and_vocabulary_provenance():
    report = json.loads((SERVICE / 'reports/ml_report.json').read_text())
    assert report['urgency']['severity_aliases']['foul_smell_of_urine'] == 'foul_smell_ofurine'
    assert report['urgency']['duplicate_severity_entries'] == [{'symptom': 'fluid_overload', 'weight': 6}, {'symptom': 'fluid_overload', 'weight': 4}]
    assert 'symptom_list.json' in report['artifacts']
    assert 'red_flags.json' in report['artifacts']
    assert report['split']['calibration_folds'] <= report['split']['minimum_training_class_rows']
