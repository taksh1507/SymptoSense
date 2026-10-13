"""All model selection, preprocessing and calibration use training rows only."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import warnings
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, top_k_accuracy_score, confusion_matrix, roc_curve, roc_auc_score, make_scorer, f1_score
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_validate, GridSearchCV
from sklearn.naive_bayes import BernoulliNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler, label_binarize
from .data import SERVICE, SEED, load_dataset, normalize
from .explain import make_explainer
from xgboost import XGBClassifier

METRICS = ['accuracy', 'precision_macro', 'recall_macro', 'f1_macro', 'top3_accuracy']
ARTIFACTS = SERVICE / 'artifacts'
REPORT = SERVICE / 'reports' / 'ml_report.json'

def top3(estimator, X, y):
    return top_k_accuracy_score(y, estimator.predict_proba(X), k=3, labels=estimator.classes_)

def scores(y, probability, classes):
    prediction = np.argmax(probability, axis=1)
    p, r, f, _ = precision_recall_fscore_support(y, prediction, average='macro', zero_division=0)
    return dict(zip(METRICS, map(float, [accuracy_score(y, prediction), p, r, f, top_k_accuracy_score(y, probability, k=3, labels=classes)])))

def pipeline(estimator, scale=False):
    steps = [('impute', SimpleImputer(strategy='constant', fill_value=0, keep_empty_features=True))]
    if scale:
        steps.append(('scale', StandardScaler()))
    return Pipeline(steps + [('model', estimator)])

def save_figure(name):
    plt.tight_layout()
    plt.savefig(SERVICE / 'reports' / 'figures' / (name + '.png'), dpi=150)
    plt.close()

def line_figure(name, points, x, series, xlabel=None):
    plt.figure(figsize=(8, 5))
    for key in series:
        plt.plot([v[x] for v in points], [v[key] for v in points], 'o-', label=key)
    plt.xlabel(xlabel or x); plt.legend(); save_figure(name)

def rule_predictions(rows):
    completed = subprocess.run(['node', '--import', './scripts/register-typescript.mjs', './scripts/ml-rule-reference.ts'], cwd=SERVICE.parent, input=json.dumps(rows), text=True, capture_output=True, check=True)
    return json.loads(completed.stdout)

def train():
    warnings.filterwarnings('ignore', message='The number of unique classes is greater than 50%.*', category=UserWarning)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (SERVICE / 'reports' / 'figures').mkdir(parents=True, exist_ok=True)
    X, disease, symptoms, eda = load_dataset()
    indices = np.arange(len(X))
    train_ids, test_ids = train_test_split(indices, test_size=0.2, stratify=disease, random_state=SEED)
    X_train, X_test = X.iloc[train_ids].to_numpy(), X.iloc[test_ids].to_numpy()
    encoder = LabelEncoder().fit(disease.iloc[train_ids])
    y_train, y_test = encoder.transform(disease.iloc[train_ids]), encoder.transform(disease.iloc[test_ids])
    classes = np.arange(len(encoder.classes_))
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    scoring = {'accuracy': 'accuracy', 'precision_macro': make_scorer(lambda y, p: precision_recall_fscore_support(y, p, average='macro', zero_division=0)[0]), 'recall_macro': make_scorer(lambda y, p: precision_recall_fscore_support(y, p, average='macro', zero_division=0)[1]), 'f1_macro': make_scorer(f1_score, average='macro', zero_division=0), 'top3_accuracy': top3}
    models = {
        'Logistic Regression': pipeline(LogisticRegression(C=1, max_iter=3000, random_state=SEED), True),
        'Naive Bayes': pipeline(BernoulliNB(alpha=1)),
        'Random Forest': pipeline(RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=2)),
        'XGBoost': pipeline(XGBClassifier(n_estimators=80, max_depth=3, learning_rate=0.1, objective='multi:softprob', eval_metric='mlogloss', random_state=SEED, n_jobs=2)),
    }
    comparison = []
    for name, model in models.items():
        print('5-fold comparison:', name, flush=True)
        result = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring, error_score='raise')
        comparison.append({'model': name, 'metrics': {m: {'mean': float(np.mean(result['test_' + m])), 'std': float(np.std(result['test_' + m])), 'folds': result['test_' + m].tolist()} for m in METRICS}})
    best_two = sorted(comparison, key=lambda row: row['metrics']['f1_macro']['mean'], reverse=True)[:2]
    grids = {
        'Logistic Regression': {'model__C': [0.1, 1, 10]},
        'Naive Bayes': {'model__alpha': [0.01, 0.1, 1]},
        'Random Forest': {'model__n_estimators': [100, 200], 'model__max_depth': [None, 8]},
        'XGBoost': {'model__n_estimators': [80, 150], 'model__max_depth': [2, 3]},
    }
    tuning, searches = [], {}
    for row in best_two:
        name = row['model']; print('Tuning:', name, flush=True)
        search = GridSearchCV(models[name], grids[name], scoring='f1_macro', cv=cv, n_jobs=1, error_score='raise').fit(X_train, y_train)
        searches[name] = search
        tuning.extend({'model': name, 'parameters': params, 'mean_f1': float(mean), 'std_f1': float(std), 'rank': int(rank)} for params, mean, std, rank in zip(search.cv_results_['params'], search.cv_results_['mean_test_score'], search.cv_results_['std_test_score'], search.cv_results_['rank_test_score']))
    winner = max(searches, key=lambda name: searches[name].best_score_)
    best = searches[winner].best_estimator_
    calibration_folds = min(5, int(np.bincount(y_train).min()))
    print('Winner:', winner, 'calibration folds:', calibration_folds, flush=True)
    calibrated = CalibratedClassifierCV(clone(best), method='sigmoid', cv=StratifiedKFold(calibration_folds, shuffle=True, random_state=SEED), n_jobs=1).fit(X_train, y_train)
    probability = calibrated.predict_proba(X_test)
    uncalibrated_probability = best.predict_proba(X_test)
    prediction = probability.argmax(axis=1)
    precision, recall, f1, support = precision_recall_fscore_support(y_test, prediction, labels=classes, zero_division=0)
    truth = label_binarize(y_test, classes=classes)
    roc = []
    for i, name in enumerate(encoder.classes_):
        fpr, tpr, _ = roc_curve(truth[:, i], probability[:, i])
        roc.append({'disease': name, 'auc': float(roc_auc_score(truth[:, i], probability[:, i])), 'points': [{'fpr': float(a), 'tpr': float(b)} for a, b in zip(fpr, tpr)]})
    # Confidence reliability: top prediction correctness versus its calibrated probability.
    def reliability(probs):
        confidence = probs.max(axis=1); correct = (probs.argmax(axis=1) == y_test).astype(int)
        observed, predicted = calibration_curve(correct, confidence, n_bins=10, strategy='uniform')
        # Match sklearn's exact bin edges; floating increments can lose boundary rows.
        bin_ids = np.searchsorted(np.linspace(0, 1, 11)[1:-1], confidence)
        counts = np.bincount(bin_ids, minlength=10)
        return [{'predicted': float(p), 'observed': float(o), 'count': int(n)} for p, o, n in zip(predicted, observed, counts[counts > 0])]
    brier = lambda probs: float(np.mean(np.sum((probs - truth) ** 2, axis=1)))
    learning = []
    for fraction in [0.4, 0.6, 0.8, 1.0]:
        train_scores, validation_scores, sizes = [], [], []
        for fold, (fit, valid) in enumerate(cv.split(X_train, y_train)):
            rng = np.random.default_rng(SEED + fold)
            # Stratified subsampling keeps every disease in each learning-curve training subset.
            selected = np.concatenate([rng.choice(fit[y_train[fit] == c], max(1, int(len(fit[y_train[fit] == c]) * fraction)), replace=False) for c in classes])
            model = clone(best).fit(X_train[selected], y_train[selected])
            train_scores.append(f1_score(y_train[selected], model.predict(X_train[selected]), average='macro', zero_division=0))
            validation_scores.append(f1_score(y_train[valid], model.predict(X_train[valid]), average='macro', zero_division=0))
            sizes.append(len(selected))
        learning.append({'fraction': fraction, 'train_size': float(np.mean(sizes)), 'train_f1': float(np.mean(train_scores)), 'validation_f1': float(np.mean(validation_scores)), 'train_std': float(np.std(train_scores)), 'validation_std': float(np.std(validation_scores))})
    robustness = []
    for percent in [0, 10, 20, 30, 40]:
        accuracy = []
        for repeat in range(10):
            damaged = X_test.copy(); rng = np.random.default_rng(SEED + repeat)
            for vector in damaged:
                active = np.flatnonzero(vector == 1)
                # Bernoulli dropping gives the requested expected fraction even for sparse patients.
                vector[active[rng.random(len(active)) < percent / 100]] = 0
            accuracy.append(accuracy_score(y_test, calibrated.predict(damaged)))
        robustness.append({'percent_dropped': percent, 'accuracy': float(np.mean(accuracy)), 'std': float(np.std(accuracy)), 'repeats': accuracy})
    severity_path = SERVICE / 'data' / 'Symptom-severity.csv'
    severity_data = pd.read_csv(severity_path)
    severity_data = severity_data.iloc[:, :2].copy()
    severity_data.columns = ['symptom', 'weight']
    severity_data['symptom'] = severity_data['symptom'].map(normalize)
    severity_duplicates = severity_data[severity_data['symptom'].duplicated(keep=False)].to_dict('records')
    weights = severity_data.groupby('symptom')['weight'].mean().to_dict()
    missing_weights = sorted(set(symptoms) - set(weights))
    if missing_weights:
        # Known spelling errors in the published severity file, never inferred disease labels.
        aliases = {'foul_smell_of_urine': 'foul_smell_ofurine'}
        for symptom in missing_weights:
            if aliases.get(symptom) not in weights:
                raise ValueError('Missing symptom severity weight: ' + symptom)
            weights[symptom] = weights[aliases[symptom]]
    per_row_weight = X_train @ np.array([weights[s] for s in symptoms]) / np.maximum(1, X_train.sum(axis=1))
    disease_weights = {name: float(per_row_weight[y_train == i].mean()) for i, name in enumerate(encoder.classes_)}
    low_cut, high_cut = np.quantile(list(disease_weights.values()), [1/3, 2/3])
    urgency_by_disease = {name: 'Low' if weight <= low_cut else 'Medium' if weight <= high_cut else 'High' for name, weight in disease_weights.items()}
    urgency_train = np.array([urgency_by_disease[name] for name in encoder.inverse_transform(y_train)])
    urgency_test = np.array([urgency_by_disease[name] for name in encoder.inverse_transform(y_test)])
    urgency_model = pipeline(RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=2)).fit(X_train, urgency_train)
    urgency_prediction = urgency_model.predict(X_test)
    rule = rule_predictions([[s for s, value in zip(symptoms, vector) if value == 1] for vector in X_test])
    final_urgency = np.array(['High' if any(s in rule['red_flags'] for s, value in zip(symptoms, vector) if value == 1) else u for vector, u in zip(X_test, urgency_prediction)])
    print('Computing calibrated-probability SHAP', flush=True)
    rng = np.random.default_rng(SEED)
    background = X_train[rng.choice(len(X_train), min(12, len(X_train)), replace=False)]
    explain_rows = X_test[rng.choice(len(X_test), min(24, len(X_test)), replace=False)]
    explanation = make_explainer(calibrated, background, symptoms)(explain_rows, max_evals=2 * len(symptoms) + 1)
    importance = np.abs(explanation.values).mean(axis=(0, 2))
    top = np.argsort(importance)[::-1][:15]
    shap_global = [{'symptom': symptoms[i], 'importance': float(importance[i])} for i in top]
    report = {
        'schema_version': 1, 'packages': {name: __import__('importlib.metadata', fromlist=['version']).version(name) for name in ['scikit-learn', 'numpy', 'pandas', 'xgboost', 'shap', 'joblib']}, 'generated_at': datetime.now(timezone.utc).isoformat(), 'random_state': SEED,
        'dataset': eda, 'symptoms': symptoms, 'classes': encoder.classes_.tolist(),
        'split': {'train_rows': len(train_ids), 'test_rows': len(test_ids), 'train_indices': train_ids.tolist(), 'test_indices': test_ids.tolist(), 'duplicate_overlap': 0, 'minimum_training_class_rows': int(np.bincount(y_train).min()), 'cv_folds': 5, 'calibration_folds': calibration_folds, 'validation_class_coverage': [int(len(np.unique(y_train[valid]))) for _, valid in cv.split(X_train, y_train)]},
        'training': {'comparison': comparison, 'hyperparameters': tuning, 'winner': winner, 'best_parameters': searches[winner].best_params_, 'selection_metric': 'training-only 5-fold macro F1', 'learning_curve': learning},
        'evaluation': {'metrics': scores(y_test, probability, classes), 'uncalibrated_metrics': scores(y_test, uncalibrated_probability, classes), 'confusion_matrix': confusion_matrix(y_test, prediction, labels=classes).tolist(), 'per_class': [{'disease': name, 'precision': float(p), 'recall': float(r), 'f1': float(f), 'support': int(n)} for name, p, r, f, n in zip(encoder.classes_, precision, recall, f1, support)], 'roc': roc, 'macro_auc': float(np.mean([r['auc'] for r in roc])), 'robustness': robustness},
        'calibration': {'method': 'sigmoid; cross-fitted training-only pipelines', 'brier_definition': 'Multiclass sum of squared errors, averaged across test rows (range 0..2)', 'brier_before': brier(uncalibrated_probability), 'brier_after': brier(probability), 'curve_before': reliability(uncalibrated_probability), 'curve_after': reliability(probability), 'uncertainty_threshold': float(os.getenv('DISEASE_CONFIDENCE_THRESHOLD', '0.5'))},
        'explainability': {'method': 'Permutation SHAP of deployed calibrated predict_proba; one seeded permutation', 'units': 'probability contribution', 'background_rows': len(background), 'global_rows': len(explain_rows), 'global_importance': shap_global},
        'urgency': {'labels': ['Low', 'Medium', 'High'], 'severity_file': str(severity_path.name), 'severity_sha256': hashlib.sha256(severity_path.read_bytes()).hexdigest(), 'severity_aliases': {'foul_smell_of_urine': 'foul_smell_ofurine'}, 'duplicate_severity_entries': severity_duplicates, 'duplicate_weight_policy': 'Mean of supplied weights for repeated normalized symptom names (fluid_overload has 6 and 4, mean 5)', 'label_source': 'Disease mean symptom severity from TRAINING rows; relative disease-weight terciles, not clinician urgency labels', 'thresholds': [float(low_cut), float(high_cut)], 'disease_weights': [{'disease': d, 'weight': w, 'urgency': urgency_by_disease[d]} for d, w in disease_weights.items()], 'accuracy_against_derived_labels': float(accuracy_score(urgency_test, urgency_prediction)), 'confusion_matrix': confusion_matrix(urgency_test, urgency_prediction, labels=['Low', 'Medium', 'High']).tolist(), 'rule_agreement': float(accuracy_score(rule['predictions'], urgency_prediction)), 'rule_agreement_after_red_flags': float(accuracy_score(rule['predictions'], final_urgency)), 'rule_version': rule['rule_version'], 'rule_context': 'All listed symptoms are primary; mild severity, <1 day, no medical history. Agreement is not clinical validation.', 'disease_safety_floors': {'Heart attack': 'High', 'Paralysis (brain hemorrhage)': 'High', 'Tuberculosis': 'Medium'}, 'runtime_policy': 'Red-flag symptoms override to High; disease-level safety floors raise final urgency independently of the experimental severity-derived urgency model.'},
        'limitations': ['Public symptom-disease associations are not independently verified patient records; dataset does not establish clinical diagnostic accuracy.', f'Only {len(X)} unique patterns remain after deduplication; held-out support is small and results do not establish external generalization.', 'The least-populated training classes have fewer than five rows: 5-fold stratification is approximate and some validation folds omit rare classes. Calibration uses the supported fold count.', 'Hyperparameter search and model selection share training CV folds; CV scores are selection estimates, while the held-out test is used only after selection.', 'Urgency labels are derived relative severity proxies; clinical urgency is not supervised by clinician labels. Red-flag rules always override to High.', 'Age, duration and reported intensity are absent from the disease dataset and are not disease-model features; rule triage uses the available context.', 'SHAP is a seeded sampling estimate, includes absent symptoms, and describes model behaviour rather than medical causation.', 'Calibration can worsen Brier score on this small dataset; report both measured scores. Confidence is a probability within the known dataset classes, not diagnosis certainty.'],
        'disclaimer': 'Not a medical diagnosis. Consult a qualified healthcare professional. Emergency red flags require immediate medical attention.'
    }
    bundle = {'calibrated_model.joblib': calibrated, 'best_model.joblib': best, 'label_encoder.joblib': encoder, 'urgency_model.joblib': urgency_model, 'shap_background.joblib': background}
    hashes = {}
    for filename, value in bundle.items():
        joblib.dump(value, ARTIFACTS / filename)
        hashes[filename] = hashlib.sha256((ARTIFACTS / filename).read_bytes()).hexdigest()
    (ARTIFACTS / 'symptom_list.json').write_text(json.dumps(symptoms, indent=2), encoding='utf-8')
    (ARTIFACTS / 'red_flags.json').write_text(json.dumps(rule['red_flags']), encoding='utf-8')
    for filename in ['symptom_list.json', 'red_flags.json']:
        hashes[filename] = hashlib.sha256((ARTIFACTS / filename).read_bytes()).hexdigest()
    report['artifacts'] = hashes
    report['model_version'] = hashes['calibrated_model.joblib'][:16]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, allow_nan=False), encoding='utf-8')
    # The frontend vocabulary is generated from the same training schema, never invented.
    vocabulary = SERVICE.parent / 'lib' / 'ml' / 'symptom-list.json'
    vocabulary.write_text(json.dumps(symptoms, indent=2), encoding='utf-8')
    plt.figure(figsize=(12, 5)); plt.bar(range(len(eda['class_distribution'])), [v['unique_count'] for v in eda['class_distribution']]); plt.xlabel('Disease class'); plt.ylabel('Unique patterns'); save_figure('class_distribution')
    plt.figure(figsize=(10, 6)); plt.barh([v['symptom'] for v in eda['top_symptoms']][::-1], [v['count'] for v in eda['top_symptoms']][::-1]); save_figure('top_symptoms')
    plt.figure(figsize=(9, 8)); plt.imshow(eda['correlation']['matrix'], vmin=-1, vmax=1, cmap='coolwarm'); plt.colorbar(); plt.xticks(range(15), eda['correlation']['labels'], rotation=90, fontsize=7); plt.yticks(range(15), eda['correlation']['labels'], fontsize=7); save_figure('correlation')
    plt.figure(figsize=(9, 5)); plt.bar([r['model'] for r in comparison], [r['metrics']['f1_macro']['mean'] for r in comparison], yerr=[r['metrics']['f1_macro']['std'] for r in comparison]); plt.ylabel('5-fold macro F1'); save_figure('model_comparison')
    plt.figure(figsize=(12, 10)); plt.imshow(report['evaluation']['confusion_matrix'], cmap='Blues'); plt.colorbar(); plt.xticks(classes, encoder.classes_, rotation=90, fontsize=6); plt.yticks(classes, encoder.classes_, fontsize=6); plt.xlabel('Predicted'); plt.ylabel('Actual'); save_figure('confusion_matrix')
    plt.figure(figsize=(8, 6))
    for curve in roc:
        plt.plot([v['fpr'] for v in curve['points']], [v['tpr'] for v in curve['points']], alpha=.35)
    plt.plot([0, 1], [0, 1], '--', color='gray'); plt.title('One-vs-rest ROC; macro AUC=' + str(round(report['evaluation']['macro_auc'], 4))); save_figure('roc')
    line_figure('learning_curve', learning, 'train_size', ['train_f1', 'validation_f1'])
    plt.figure(figsize=(8, 5))
    for key in ['curve_before', 'curve_after']:
        points = report['calibration'][key]; plt.plot([v['predicted'] for v in points], [v['observed'] for v in points], 'o-', label=key)
    plt.plot([0, 1], [0, 1], '--', label='ideal'); plt.xlabel('Top prediction probability'); plt.ylabel('Observed accuracy'); plt.legend(); save_figure('calibration')
    line_figure('robustness', robustness, 'percent_dropped', ['accuracy'], 'Expected percentage of symptoms dropped')
    plt.figure(figsize=(9, 6)); plt.barh([v['symptom'] for v in shap_global][::-1], [v['importance'] for v in shap_global][::-1]); plt.xlabel('Mean absolute calibrated-probability SHAP'); save_figure('shap_global')
    print(json.dumps({'winner': winner, 'test_metrics': report['evaluation']['metrics'], 'brier_before': report['calibration']['brier_before'], 'brier_after': report['calibration']['brier_after'], 'report': str(REPORT)}, indent=2), flush=True)
    return report
