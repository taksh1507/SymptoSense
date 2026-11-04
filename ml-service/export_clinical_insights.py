"""Evaluate existing Kaggle artifacts without fitting or replacing any model.

Reconstruct the deterministic split used by train_clinical.py, require agreement
with the saved report, and export a confusion matrix and native forest importance.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from train_clinical import deduplicate_dataset

ROOT = Path(__file__).resolve().parent
INPUTS = [
    'data/dataset.csv', 'artifacts/clinical/clinical_model.joblib',
    'artifacts/clinical/clinical_encoder.joblib', 'artifacts/clinical/symptom_list.json',
    'reports/clinical_report.json',
]


def export():
    report = json.loads((ROOT / INPUTS[-1]).read_text(encoding='utf-8'))
    frame = pd.read_csv(ROOT / INPUTS[0])
    records = deduplicate_dataset(frame, [column for column in frame.columns if column != 'Disease'])
    vocabulary = json.loads((ROOT / INPUTS[3]).read_text(encoding='utf-8'))
    indices = {name: index for index, name in enumerate(vocabulary)}
    model = joblib.load(ROOT / INPUTS[1])
    encoder = joblib.load(ROOT / INPUTS[2])
    features = np.zeros((len(records), len(vocabulary)), dtype=np.float32)
    for index, (_, symptoms) in enumerate(records):
        for symptom in symptoms:
            features[index, indices[symptom]] = 1
    labels = encoder.transform([record[0] for record in records])
    train, test = train_test_split(np.arange(len(records)), test_size=report['split']['test_size'],
                                   random_state=report['split']['random_state'], stratify=labels)
    assert len(train) == report['split']['train_rows'] and len(test) == report['split']['test_rows']
    assert not set(train).intersection(test)
    probabilities = model.predict_proba(features[test])
    predicted = np.asarray(model.classes_)[np.argmax(probabilities, axis=1)]
    class_ids = np.arange(len(encoder.classes_))
    evaluated = classification_report(labels[test], predicted, labels=class_ids,
                                     target_names=encoder.classes_, output_dict=True, zero_division=0)
    # Do not attach diagnostics to a report describing different predictions.
    for name in encoder.classes_:
        for metric in ('precision', 'recall', 'f1-score', 'support'):
            if not np.isclose(evaluated[name][metric], report['per_disease_metrics'][name][metric], atol=1e-10):
                raise ValueError(f'Saved report does not match artifact evaluation: {name}, {metric}')
    forests = [classifier.estimator for classifier in model.calibrated_classifiers_]
    importance = np.mean([forest.feature_importances_ for forest in forests], axis=0)
    assert len(importance) == len(vocabulary) and np.isfinite(importance).all()
    payload = {
        'schema_version': 1,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'sklearn_version': sklearn.__version__,
        'input_sha256': {relative: hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() for relative in INPUTS},
        'methodology': 'Reconstructed the original sorted, deduplicated stratified split using its saved seed. Evaluated the existing calibrated model; no fitting or model replacement. Per-class results match the original report.',
        'test_rows': len(test),
        'classes': encoder.classes_.tolist(),
        'confusion_matrix': confusion_matrix(labels[test], predicted, labels=class_ids).tolist(),
        'global_importance': [{'symptom': name, 'importance': float(value)} for name, value in
                              sorted(zip(vocabulary, importance), key=lambda item: (-item[1], item[0]))],
        'importance_method': f'Mean impurity-based feature importance across {len(forests)} Random Forest estimators inside the sigmoid-calibrated ensemble.',
        'importance_limitations': 'Native tree importance describes training-time split usage, not individual prediction attribution or the calibration mapping. Correlated features can share or dilute importance; impurity importance can be biased. These are not SHAP values, probabilities, or causal effects.',
    }
    destination = ROOT / 'reports' / 'clinical_insights.json'
    destination.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(destination), 'test_rows': len(test), 'accuracy': evaluated['accuracy'],
                      'feature_count': len(importance), 'model_modified': False}))


if __name__ == '__main__':
    export()
