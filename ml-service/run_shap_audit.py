import json
from pathlib import Path
import joblib, numpy as np
from ml_pipeline.ddxplus_data import encode_patient
from ml_pipeline.explain import explain_input
from ml_pipeline.model_input import predict_proba
from disease_inference import map_symptoms, load_bundle

bundle = load_bundle()

cases = [
    ('Case 1: Common respiratory', ['fever', 'cough', 'runny_nose', 'sore_throat']),
    ('Case 2: Gastrointestinal', ['stomach_pain', 'nausea', 'vomiting', 'diarrhea']),
    ('Case 3: Headache', ['headache', 'light_sensitivity', 'nausea']),
    ('Case 4: Respiratory concern', ['fever', 'persistent_cough', 'shortness_of_breath']),
    ('Case 5: Urinary symptoms', ['burning_urination', 'frequent_urination', 'lower_abdominal_discomfort']),
    ('Case 6: Ambiguous symptoms', ['fever', 'cough', 'stomach_pain']),
    ('Case 7: Minimal evidence', ['headache']),
    ('Case 8: Unrecognized symptoms', ['quantum_fluctuations', 'cosmic_resonance']),
]

for name, symptoms in cases:
    print(f'=== {name} ===')
    used, ignored, mapped = map_symptoms(symptoms, bundle['known_tokens'], bundle['vocabulary'])
    print('  Input symptoms:', symptoms)
    print('  Used tokens:', used)
    print('  Ignored symptoms:', ignored)
    if not used:
        print('  -> ABSTAINED (No recognized tokens)\n')
        continue
    row = {'AGE': 35.0, 'SEX': 'unknown', 'EVIDENCES': repr(used)}
    values = encode_patient(row, bundle['feature_columns'])
    vector = np.zeros(len(bundle['feature_columns']), dtype=np.float32)
    col_index = {name: i for i, name in enumerate(bundle['feature_columns'])}
    for k, v in values.items():
        vector[col_index[k]] = v
    probs = predict_proba(bundle['model'], vector)[0]
    order = np.argsort(probs)[::-1]
    top3 = [(str(bundle['encoder'].classes_[i]), round(float(probs[i]), 4)) for i in order[:3]]
    print('  Top-3:', top3)
    top_class_idx = int(order[0])
    shap_vals = explain_input(bundle['model'], bundle['background'], bundle['feature_columns'], vector, top_class_idx)
    present_shap = [(c['symptom'], round(c['contribution'], 4)) for c in shap_vals if c.get('present')]
    print('  Present SHAP contributors for top class:', present_shap)
    print()
