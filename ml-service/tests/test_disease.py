import json
import numpy as np
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from server import app
from disease_inference import DiseaseOutput, disease_safety_floor, load_bundle, map_symptoms
from ml_pipeline.ddxplus_data import DATA, SERVICE, age_group, feature_schema, load_metadata, parse_evidence

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as value:
        yield value

def test_ddxplus_source_schema():
    evidences, conditions = load_metadata()
    assert len(evidences) == 223 and len(conditions) == 49
    assert sum(not item["is_antecedent"] for item in evidences.values()) == 110
    assert sum(item["is_antecedent"] for item in evidences.values()) == 113
    assert set(feature_schema()) >= {"age", "age_group_child", "age_group_teen", "age_group_adult", "age_group_elderly", "sex_unknown"}
    assert parse_evidence("['E_53', 'E_54_@_V_112']") == ["E_53", "E_54_@_V_112"]
    assert age_group(12) == "child" and age_group(13) == "teen" and age_group(19) == "adult" and age_group(50) == "elderly"

def test_pipeline_report_schema_and_no_leakage():
    report=json.loads((SERVICE/"reports/ml_report.json").read_text(encoding="utf-8"))
    for field in ["dataset","training","evaluation","calibration","explainability","urgency","artifacts","baselines","noise_robustness","severity_table","license"]:
        assert field in report
    assert report["schema_version"] == 1
    assert report["dataset"]["source"].startswith("https://figshare.com/")
    assert report["dataset"]["sample_sizes"]["train"]["rows_after_sampling"] <= report["dataset"]["sample_sizes"]["train"]["rows_before_sampling"]
    overlaps=report["dataset"]["split_overlap_fingerprints"]
    assert all(isinstance(overlaps[key],int) and overlaps[key]>=0 for key in ["train_validate","train_test","validate_test"])
    assert overlaps["scope"].startswith("all raw records")
    assert report["dataset"]["patient_id_available"] is False
    assert report["dataset"]["preprocessing"]["fitted_on"] == "training split only"
    assert report["license"]["text_sha256"] == report["dataset"]["input_sha256"]["CC-BY-4.0.txt"]
    for model in report["training"]["comparison"]:
        for metric in ["accuracy","precision_macro","recall_macro","f1_macro","top3_accuracy"]:
            values=model["metrics"][metric]
            assert len(values["folds"]) == 5
            assert np.isclose(values["mean"],np.mean(values["folds"]))
            assert np.isclose(values["std"],np.std(values["folds"]))
    assert len(report["evaluation"]["confusion_matrix"]) == 49
    assert len(report["evaluation"]["per_class"]) == 49
    assert [x["percent_dropped"] for x in report["evaluation"]["robustness"]] == [0,10,20,30,40]
    assert [x["percent_wrong_evidence"] for x in report["noise_robustness"][:4]] == [0,10,20,30]
    assert len(report["explainability"]["global_importance"]) == 15

def test_valid_prediction_contract(client):
    response=client.post("/predict-disease",json={"symptoms":["E_91"],"age_group":"adult","sex":"F"})
    assert response.status_code == 200
    data=DiseaseOutput.model_validate(response.json())
    assert len(data.top3)==3 and len(data.shap_top5)==5
    assert data.confidence==data.top3[0].probability
    assert data.uncertain==(data.confidence < data.uncertainty_threshold)
    assert data.age_group_used=="adult" and data.sex_used=="Female"
    assert "not a medical diagnosis" in data.disclaimer.lower()

def test_invalid_unknown_and_empty_symptoms(client):
    for symptoms in [[],["not_a_real_evidence"],[""]]:
        response=client.post("/predict-disease",json={"symptoms":symptoms})
        assert response.status_code == 422
    assert "ignored_symptoms" in response.json()["detail"]

def test_name_mapping_and_ignored_list():
    bundle=load_bundle()
    used,ignored,mapped=map_symptoms(["cough","imaginary symptom"],bundle["known_tokens"],bundle["vocabulary"])
    assert used==["E_201"] and ignored==["imaginary symptom"]
    assert mapped==[{"input":"cough","symptom":"E_201"}]

def test_red_flag_evidence_and_stroke_case_override(client):
    chest=client.post("/predict-disease",json={"symptoms":["E_14"]}).json()
    assert chest["red_flag_override"] is True and chest["urgency"]=="High"
    response=client.post("/predict-disease",json={"symptoms":["vomiting","weakness_of_one_body_side","altered_sensorium"]})
    assert response.status_code==200
    stroke=response.json()
    assert stroke["red_flag_override"] is True and stroke["urgency"]=="High"
    assert {"E_211","E_156","E_39"}.issubset(set(stroke["symptoms_used"]))

def test_throat_swelling_conditional_red_flag(client):
    response=client.post("/predict-disease",json={"symptoms":["E_151","E_152_@_V_115"]})
    assert response.status_code==200
    assert response.json()["red_flag_override"] is True and response.json()["urgency"]=="High"

def test_severe_pathology_floors():
    for disease,expected in [("Anaphylaxis","High"),("Pulmonary embolism","High"),("Stable angina","Medium")]:
        floor,matches=disease_safety_floor([{"disease":disease,"probability":0.2}])
        assert floor==expected and matches==[disease]
    floor,_=disease_safety_floor([{"disease":"Stable angina","probability":0.3},{"disease":"Anaphylaxis","probability":0.2}])
    assert floor=="High"

def test_severe_floor_is_project_choice_documented():
    source=(Path(__file__).parents[1]/"disease_inference.py").read_text(encoding="utf-8")
    assert "PROJECT SAFETY CHOICES, NOT CLINICAL GUIDELINES" in source
    assert "pulmonary_embolism" in source and "anaphylaxis" in source

def test_report_and_legacy_health_endpoints(client):
    assert client.get("/ml-report").json()["schema_version"]==1
    assert client.get("/health").status_code==200
