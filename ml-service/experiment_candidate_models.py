"""Candidate model experimentation and robustness benchmarking for SymptoSense Random Forest.

Evaluates:
- Baseline (Production RF, Calibrated Sigmoid)
- Candidate 1: Regularized Random Forest (max_depth=12, min_samples_leaf=2)
- Candidate 2: Perturbation-Augmented Random Forest (trained with symptom dropout and noise injection)

Evaluated across:
1. Held-out Benchmark (61 patterns)
2. Symptom Omission Perturbation (1 and 2 dropped symptoms)
3. Noise Perturbation (1 and 2 added distractor symptoms)
4. Calibration and Uncertainty Deferral on Ambiguous Combinations
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, log_loss

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / 'data'
ARTIFACTS_DIR = ROOT / 'artifacts' / 'clinical'
REPORTS_DIR = ROOT / 'reports'
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

from train_clinical import normalize, deduplicate_dataset, multiclass_brier_score

def run_experiments():
    print("=" * 70)
    print("SYMPTOSENSE RANDOM FOREST CANDIDATE MODEL EXPERIMENTATION")
    print("=" * 70)

    # 1. Load data and rebuild fixed train/test split
    raw_df = pd.read_csv(DATA_DIR / 'dataset.csv')
    symptom_columns = [c for c in raw_df.columns if c != 'Disease']
    all_symptoms = sorted({normalize(s) for col in symptom_columns for s in raw_df[col].dropna() if normalize(s)})
    symptom_to_idx = {s: i for i, s in enumerate(all_symptoms)}
    num_symptoms = len(all_symptoms)

    unique_records = deduplicate_dataset(raw_df, symptom_columns)
    X = np.zeros((len(unique_records), num_symptoms), dtype=np.float32)
    labels = []
    for i, (disease, syms) in enumerate(unique_records):
        labels.append(disease)
        for s in syms:
            if s in symptom_to_idx:
                X[i, symptom_to_idx[s]] = 1.0

    encoder = LabelEncoder()
    y = encoder.fit_transform(labels)
    num_classes = len(encoder.classes_)

    # Fixed holdout split (80/20) identical to production
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Dataset split: {len(X_train)} train rows, {len(X_test)} held-out test rows across {num_classes} classes.")

    # -------------------------------------------------------------
    # MODEL 1: BASELINE (Production Configuration)
    # -------------------------------------------------------------
    print("\nTraining Model 1: Baseline Production (Unconstrained RF + Sigmoid Calibration)...")
    base_rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    model_baseline = CalibratedClassifierCV(estimator=base_rf, cv=3, method='sigmoid')
    model_baseline.fit(X_train, y_train)

    # -------------------------------------------------------------
    # MODEL 2: CANDIDATE 1 (Regularized RF)
    # -------------------------------------------------------------
    print("Training Model 2: Candidate 1 (Regularized RF: depth=12, min_leaf=2)...")
    reg_rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        class_weight='balanced'
    )
    model_reg = CalibratedClassifierCV(estimator=reg_rf, cv=3, method='sigmoid')
    model_reg.fit(X_train, y_train)

    # -------------------------------------------------------------
    # MODEL 3: CANDIDATE 2 (Perturbation-Augmented RF)
    # -------------------------------------------------------------
    print("Training Model 3: Candidate 2 (Data-Augmented RF: Symptom Dropout + Noise)...")
    # Generate augmented training data by sampling symptom subsets
    np.random.seed(42)
    aug_X_list = [X_train]
    aug_y_list = [y_train]

    for _ in range(3): # 3 augmented variants per training pattern
        X_aug = X_train.copy()
        for r in range(len(X_aug)):
            active_indices = np.where(X_aug[r] == 1.0)[0]
            if len(active_indices) > 3:
                # Randomly drop 1 symptom with probability 0.4
                if np.random.rand() < 0.4:
                    drop_idx = np.random.choice(active_indices)
                    X_aug[r, drop_idx] = 0.0
            # Randomly add 1 noise symptom with probability 0.15
            if np.random.rand() < 0.15:
                inactive_indices = np.where(X_aug[r] == 0.0)[0]
                add_idx = np.random.choice(inactive_indices)
                X_aug[r, add_idx] = 1.0
        aug_X_list.append(X_aug)
        aug_y_list.append(y_train)

    X_train_aug = np.vstack(aug_X_list)
    y_train_aug = np.concatenate(aug_y_list)
    print(f"  Augmented training size: {len(X_train_aug)} rows (from {len(X_train)} original).")

    aug_rf = RandomForestClassifier(
        n_estimators=120,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42,
        class_weight='balanced'
    )
    model_aug = CalibratedClassifierCV(estimator=aug_rf, cv=3, method='sigmoid')
    model_aug.fit(X_train_aug, y_train_aug)

    models = {
        'Baseline (Production)': model_baseline,
        'Candidate 1 (Regularized)': model_reg,
        'Candidate 2 (Perturbation-Augmented)': model_aug
    }

    # -------------------------------------------------------------
    # EVALUATION SUITE
    # -------------------------------------------------------------
    results = {}

    for name, m in models.items():
        print(f"\n--- Evaluating: {name} ---")
        probs = m.predict_proba(X_test)
        preds = np.argmax(probs, axis=1)

        acc = float(accuracy_score(y_test, preds))
        macro_prec = float(precision_score(y_test, preds, average='macro', zero_division=0))
        macro_rec = float(recall_score(y_test, preds, average='macro', zero_division=0))
        macro_f1 = float(f1_score(y_test, preds, average='macro', zero_division=0))
        top3_acc = float(np.mean([y_test[i] in np.argsort(probs[i])[-3:] for i in range(len(y_test))]))
        brier = multiclass_brier_score(y_test, probs, num_classes)
        loss = float(log_loss(y_test, probs, labels=list(range(num_classes))))

        # ---------------------------------------------------------
        # ROBUSTNESS TEST A: SYMPTOM OMISSION (Drop 1 and Drop 2)
        # ---------------------------------------------------------
        # For all test patterns with >= 4 symptoms, drop 1 symptom systematically
        drop1_correct = 0
        drop1_top3_correct = 0
        drop1_total = 0

        drop2_correct = 0
        drop2_top3_correct = 0
        drop2_total = 0

        for i in range(len(X_test)):
            active = np.where(X_test[i] == 1.0)[0]
            true_cls = y_test[i]
            if len(active) >= 3:
                # Drop 1 symptom across each active symptom
                for s_idx in active:
                    x_mod = X_test[i].copy()
                    x_mod[s_idx] = 0.0
                    p_mod = m.predict_proba(x_mod.reshape(1, -1))[0]
                    top_cls = np.argmax(p_mod)
                    top3_cls = np.argsort(p_mod)[-3:]
                    if top_cls == true_cls:
                        drop1_correct += 1
                    if true_cls in top3_cls:
                        drop1_top3_correct += 1
                    drop1_total += 1

            if len(active) >= 4:
                # Drop 2 symptoms (sample up to 4 pairs per case)
                for _ in range(4):
                    drop_pair = np.random.choice(active, size=2, replace=False)
                    x_mod = X_test[i].copy()
                    x_mod[drop_pair] = 0.0
                    p_mod = m.predict_proba(x_mod.reshape(1, -1))[0]
                    top_cls = np.argmax(p_mod)
                    top3_cls = np.argsort(p_mod)[-3:]
                    if top_cls == true_cls:
                        drop2_correct += 1
                    if true_cls in top3_cls:
                        drop2_top3_correct += 1
                    drop2_total += 1

        drop1_top1_acc = drop1_correct / max(1, drop1_total)
        drop1_top3_acc = drop1_top3_correct / max(1, drop1_total)
        drop2_top1_acc = drop2_correct / max(1, drop2_total)
        drop2_top3_acc = drop2_top3_correct / max(1, drop2_total)

        # ---------------------------------------------------------
        # ROBUSTNESS TEST B: NOISE PERTURBATION (Add 1 and Add 2 distractors)
        # ---------------------------------------------------------
        noise1_correct = 0
        noise1_top3 = 0
        noise1_total = 0

        noise2_correct = 0
        noise2_top3 = 0
        noise2_total = 0

        for i in range(len(X_test)):
            inactive = np.where(X_test[i] == 0.0)[0]
            true_cls = y_test[i]
            for _ in range(5): # 5 trials per case
                add1 = np.random.choice(inactive, size=1)
                x_mod1 = X_test[i].copy()
                x_mod1[add1] = 1.0
                p_mod1 = m.predict_proba(x_mod1.reshape(1, -1))[0]
                if np.argmax(p_mod1) == true_cls:
                    noise1_correct += 1
                if true_cls in np.argsort(p_mod1)[-3:]:
                    noise1_top3 += 1
                noise1_total += 1

                add2 = np.random.choice(inactive, size=2, replace=False)
                x_mod2 = X_test[i].copy()
                x_mod2[add2] = 1.0
                p_mod2 = m.predict_proba(x_mod2.reshape(1, -1))[0]
                if np.argmax(p_mod2) == true_cls:
                    noise2_correct += 1
                if true_cls in np.argsort(p_mod2)[-3:]:
                    noise2_top3 += 1
                noise2_total += 1

        noise1_top1_acc = noise1_correct / max(1, noise1_total)
        noise1_top3_acc = noise1_top3 / max(1, noise1_total)
        noise2_top1_acc = noise2_correct / max(1, noise2_total)
        noise2_top3_acc = noise2_top3 / max(1, noise2_total)

        # ---------------------------------------------------------
        # AMBIGUITY & UNCERTAINTY TEST: Stomach Pain + Cough + Mild Fever
        # ---------------------------------------------------------
        amb_vec = np.zeros((1, num_symptoms), dtype=np.float32)
        for s in ['stomach_pain', 'cough', 'mild_fever']:
            if s in symptom_to_idx:
                amb_vec[0, symptom_to_idx[s]] = 1.0
        amb_p = m.predict_proba(amb_vec)[0]
        amb_conf = float(np.max(amb_p))
        amb_top2 = float(np.partition(amb_p, -2)[-2])
        amb_margin = amb_conf - amb_top2
        amb_top_disease = encoder.classes_[np.argmax(amb_p)]
        amb_abstains = amb_conf < 0.20 or amb_margin < 0.08

        print(f"  Holdout Top-1 Acc: {acc*100:.1f}%, Top-3 Acc: {top3_acc*100:.1f}%, F1: {macro_f1*100:.1f}%")
        print(f"  Symptom Omission: Drop-1 Top-1={drop1_top1_acc*100:.1f}% (Top-3={drop1_top3_acc*100:.1f}%), Drop-2 Top-1={drop2_top1_acc*100:.1f}% (Top-3={drop2_top3_acc*100:.1f}%)")
        print(f"  Distractor Noise: +1 Noise Top-1={noise1_top1_acc*100:.1f}% (Top-3={noise1_top3_acc*100:.1f}%), +2 Noise Top-1={noise2_top1_acc*100:.1f}% (Top-3={noise2_top3_acc*100:.1f}%)")
        print(f"  Ambiguous Triple: Top={amb_top_disease} ({amb_conf*100:.1f}%), Margin={amb_margin*100:.1f}%, Abstains={amb_abstains}")

        results[name] = {
            'heldout_benchmark': {
                'samples': len(X_test),
                'top1_accuracy': acc,
                'top3_accuracy': top3_acc,
                'macro_precision': macro_prec,
                'macro_recall': macro_rec,
                'macro_f1': macro_f1,
                'brier_score': brier,
                'log_loss': loss
            },
            'symptom_omission_stress_test': {
                'drop_1_symptom': {
                    'trials': drop1_total,
                    'top1_accuracy': drop1_top1_acc,
                    'top3_accuracy': drop1_top3_acc
                },
                'drop_2_symptoms': {
                    'trials': drop2_total,
                    'top1_accuracy': drop2_top1_acc,
                    'top3_accuracy': drop2_top3_acc
                }
            },
            'noise_distractor_stress_test': {
                'add_1_distractor': {
                    'trials': noise1_total,
                    'top1_accuracy': noise1_top1_acc,
                    'top3_accuracy': noise1_top3_acc
                },
                'add_2_distractors': {
                    'trials': noise2_total,
                    'top1_accuracy': noise2_top1_acc,
                    'top3_accuracy': noise2_top3_acc
                }
            },
            'ambiguous_case_uncertainty': {
                'symptoms': ['stomach_pain', 'cough', 'mild_fever'],
                'top_prediction': amb_top_disease,
                'top_confidence': amb_conf,
                'margin': amb_margin,
                'safe_abstention': amb_abstains
            }
        }

    # Save comprehensive candidate model report
    comp_path = REPORTS_DIR / 'candidate_comparison.json'
    comp_path.write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(f"\nSaved candidate model comparison to: {comp_path}")
    print("=" * 70)

if __name__ == '__main__':
    run_experiments()
