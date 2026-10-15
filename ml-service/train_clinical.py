"""Train calibrated classifier on the 41-disease clinical symptom association dataset."""
import json
import re
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / 'data'
ARTIFACTS_DIR = ROOT / 'artifacts' / 'clinical'
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def normalize(s: str) -> str:
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', str(s).lower().strip())).strip('_')

def main():
    print("Loading clinical datasets...")
    df = pd.read_csv(DATA_DIR / 'dataset.csv')
    desc_df = pd.read_csv(DATA_DIR / 'symptom_Description.csv')
    prec_df = pd.read_csv(DATA_DIR / 'symptom_precaution.csv')

    # Build description and precaution lookups
    descriptions = {}
    for _, row in desc_df.iterrows():
        if pd.notna(row['Disease']) and pd.notna(row['Description']):
            descriptions[normalize(row['Disease'])] = str(row['Description']).strip()

    precautions = {}
    for _, row in prec_df.iterrows():
        if pd.notna(row['Disease']):
            p_list = [str(row[f'Precaution_{i}']).strip() for i in range(1, 5) if pd.notna(row.get(f'Precaution_{i}')) and str(row.get(f'Precaution_{i}')).strip()]
            precautions[normalize(row['Disease'])] = p_list

    # Extract all unique symptoms
    symptom_columns = [c for c in df.columns if c != 'Disease']
    all_symptoms = set()
    for col in symptom_columns:
        for s in df[col].dropna():
            norm_s = normalize(s)
            if norm_s:
                all_symptoms.add(norm_s)
    
    sorted_symptoms = sorted(all_symptoms)
    symptom_to_idx = {s: i for i, s in enumerate(sorted_symptoms)}
    num_symptoms = len(sorted_symptoms)

    print(f"Total diseases: {df['Disease'].nunique()}, Total distinct symptoms: {num_symptoms}")

    # Build multi-hot feature matrix X and target y
    X = np.zeros((len(df), num_symptoms), dtype=np.float32)
    for row_idx, row in df.iterrows():
        for col in symptom_columns:
            val = row[col]
            if pd.notna(val):
                norm_val = normalize(val)
                if norm_val in symptom_to_idx:
                    X[row_idx, symptom_to_idx[norm_val]] = 1.0

    raw_labels = df['Disease'].str.strip()
    encoder = LabelEncoder()
    y = encoder.fit_transform(raw_labels)

    # Train Random Forest with probability calibration
    base_rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    model = CalibratedClassifierCV(estimator=base_rf, cv=5, method='sigmoid')
    
    cv_scores = cross_val_score(base_rf, X, y, cv=5, scoring='accuracy')
    print(f"5-Fold Cross-Validation Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    model.fit(X, y)

    # Save artifacts
    joblib.dump(model, ARTIFACTS_DIR / 'clinical_model.joblib')
    joblib.dump(encoder, ARTIFACTS_DIR / 'clinical_encoder.joblib')
    (ARTIFACTS_DIR / 'symptom_list.json').write_text(json.dumps(sorted_symptoms, indent=2), encoding='utf-8')
    (ARTIFACTS_DIR / 'disease_descriptions.json').write_text(json.dumps(descriptions, indent=2), encoding='utf-8')
    (ARTIFACTS_DIR / 'disease_precautions.json').write_text(json.dumps(precautions, indent=2), encoding='utf-8')

    print(f"Artifacts successfully saved to {ARTIFACTS_DIR}")

if __name__ == '__main__':
    main()
