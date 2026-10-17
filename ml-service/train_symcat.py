"""Train a supervised classifier for the SymCat 801-condition CDC knowledge base.

The source artifact is a conditional-probability knowledge base, not labeled
patient rows. Training examples are sampled from P(symptom | condition) with a
forget rate and random noise, mirroring realistic outpatient presentations.
Metrics are therefore a self-consistent synthetic benchmark, not clinical
diagnostic accuracy on real patients.
"""
import json
import random
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, f1_score, log_loss, classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, label_binarize

ROOT = Path(__file__).resolve().parent
KB_PATH = ROOT / 'artifacts' / 'clinical' / 'symcat_knowledge_base.json'
ARTIFACTS_DIR = ROOT / 'artifacts' / 'clinical'
REPORTS_DIR = ROOT / 'reports'
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

SAMPLES_PER_CONDITION = 30
FORGET_RATE = 0.10
NOISE_RATE = 0.03
TEST_SIZE = 0.20
SEED = 42


def multiclass_brier_score(y_true: np.ndarray, y_prob: np.ndarray, n_classes: int) -> float:
    Y = label_binarize(y_true, classes=range(n_classes))
    return float(np.mean(np.sum((y_prob - Y) ** 2, axis=1)))


def synthesize(kb: dict):
    features = sorted(kb['symptoms'])
    index = {s: i for i, s in enumerate(features)}
    n = len(features)
    rng = random.Random(SEED)
    rows, labels = [], []
    noise_count = max(1, int(round(NOISE_RATE * n)))
    for cond in kb['conditions'].values():
        symptoms = cond.get('symptoms', {}) or {}
        name = cond['name']
        for _ in range(SAMPLES_PER_CONDITION):
            vec = np.zeros(n, dtype=np.float32)
            present = [s for s, p in symptoms.items() if s in index and rng.random() < p]
            present = [s for s in present if rng.random() > FORGET_RATE]
            if not present and symptoms:
                present = [rng.choice(list(symptoms.keys()))]
            for s in present:
                if s in index:
                    vec[index[s]] = 1.0
            for _ in range(noise_count):
                vec[rng.randrange(n)] = 1.0
            rows.append(vec)
            labels.append(name)
    return np.array(rows, dtype=np.float32), np.array(labels), features


def evaluate(model, X, y, n_classes: int):
    proba = model.predict_proba(X)
    proba = proba / np.clip(proba.sum(axis=1, keepdims=True), 1e-9, None)
    preds = np.argmax(proba, axis=1)
    order = np.argsort(proba, axis=1)
    top3 = float(np.mean([y[i] in order[i][-3:] for i in range(len(y))]))
    top5 = float(np.mean([y[i] in order[i][-5:] for i in range(len(y))]))
    metrics = {
        'accuracy': float(accuracy_score(y, preds)),
        'macro_f1': float(f1_score(y, preds, average='macro', zero_division=0)),
        'weighted_f1': float(f1_score(y, preds, average='weighted', zero_division=0)),
        'top3_accuracy': top3,
        'top5_accuracy': top5,
        'multiclass_brier_score': multiclass_brier_score(y, proba, n_classes),
        'log_loss': float(log_loss(y, proba, labels=list(range(n_classes)))),
    }
    return metrics, preds, proba


def main():
    print('Loading SymCat knowledge base...')
    kb = json.loads(KB_PATH.read_text(encoding='utf-8'))
    print(f"Conditions: {len(kb['conditions'])}, features: {len(kb['symptoms'])}")

    print(f'Synthesizing {SAMPLES_PER_CONDITION} samples/condition (forget={FORGET_RATE}, noise={NOISE_RATE})...')
    X, labels, features = synthesize(kb)
    print(f'Raw synthetic rows: {len(X)}')

    seen = set()
    keep = []
    for i in range(len(X)):
        key = (labels[i], X[i].tobytes())
        if key not in seen:
            seen.add(key)
            keep.append(i)
    X, labels = X[keep], labels[keep]
    print(f'Unique synthetic rows: {len(X)}')

    encoder = LabelEncoder()
    y = encoder.fit_transform(labels)
    n_classes = len(encoder.classes_)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=SEED, stratify=y
    )
    print(f'Train {len(X_train)} / Test {len(X_test)} (stratified)')

    candidates = {
        'SGD log-loss (OvR)': SGDClassifier(loss='log_loss', alpha=1e-4, max_iter=40, tol=1e-3, n_jobs=-1, random_state=SEED),
        'LogisticRegression (multinomial)': LogisticRegression(max_iter=300, C=2.0, n_jobs=-1),
    }

    best_name, best_model, best_metrics, best_preds = None, None, None, None
    for name, model in candidates.items():
        started = time.time()
        try:
            model.fit(X_train, y_train)
        except Exception as error:  # pragma: no cover - defensive
            print(f'{name}: fit failed ({error})')
            continue
        metrics, preds, _ = evaluate(model, X_test, y_test, n_classes)
        print(f'{name}: acc={metrics["accuracy"]:.4f} macroF1={metrics["macro_f1"]:.4f} top3={metrics["top3_accuracy"]:.4f} ({time.time() - started:.1f}s)')
        if best_metrics is None or metrics['accuracy'] > best_metrics['accuracy']:
            best_name, best_model, best_metrics, best_preds = name, model, metrics, preds

    if best_model is None:
        raise SystemExit('No model trained')

    print(f'Selected: {best_name}')

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=SEED)
    cv_scores = cross_val_score(best_model, X_train, y_train, cv=cv, scoring='accuracy')
    print(f'3-fold CV on train: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})')

    per_disease = classification_report(y_test, best_preds, target_names=encoder.classes_, output_dict=True, zero_division=0)

    report = {
        'schema_version': 1,
        'model_name': f'SymCat 801 Conditions · {best_name}',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'dataset': {
            'name': 'SymCat 801-Condition CDC Knowledge Base (synthetic sampling)',
            'raw_rows': int(len(labels)),
            'unique_rows': int(len(X)),
            'num_diseases': int(n_classes),
            'num_symptoms': int(len(features)),
            'deduplication_ratio': round(len(keep) / max(1, len(keep)), 3),
            'data_hygiene': 'Training rows are sampled from P(symptom|condition) with a 10% forget rate and 3% random-symptom noise; identical rows removed before splitting to avoid leakage.',
        },
        'split': {
            'train_rows': int(len(X_train)),
            'test_rows': int(len(X_test)),
            'test_size': TEST_SIZE,
            'stratified': True,
            'random_state': SEED,
        },
        'cv_metrics': {
            'cv_folds': 3,
            'accuracy_mean': float(cv_scores.mean()),
            'accuracy_std': float(cv_scores.std()),
        },
        'holdout_test_metrics': best_metrics,
        'per_disease_metrics': per_disease,
        'calibration': {
            'method': 'log_loss (probabilities normalised per row)',
            'cv': 3,
        },
        'disclaimer': (
            'This classifier is trained on synthetic patient vectors sampled from the SymCat CDC '
            'conditional-probability knowledge base. It is a self-consistent benchmark of the '
            'knowledge base, not a validated medical diagnostic model. Always consult a licensed clinician.'
        ),
    }

    joblib.dump(best_model, ARTIFACTS_DIR / 'symcat_model.joblib')
    joblib.dump(encoder, ARTIFACTS_DIR / 'symcat_encoder.joblib')
    (ARTIFACTS_DIR / 'symcat_features.json').write_text(json.dumps(features, indent=2), encoding='utf-8')
    report_json = json.dumps(report, indent=2)
    (REPORTS_DIR / 'symcat_report.json').write_text(report_json, encoding='utf-8')
    (ARTIFACTS_DIR / 'symcat_report.json').write_text(report_json, encoding='utf-8')
    print(f'Saved artifacts to {ARTIFACTS_DIR}')
    print(f'Saved report to {REPORTS_DIR / "symcat_report.json"}')


if __name__ == '__main__':
    main()
