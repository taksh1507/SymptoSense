"""Regression tests: training (sparse) and inference (dense vector) must agree.

An XGBoost model trained on a CSR matrix treats absent entries as missing, but
treats zeros in a dense array as real values.  Predicting on a dense zero-filled
vector once collapsed every prediction to a single class.  These tests use only
the committed artifacts (no raw DDXPlus files).
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pytest
import xgboost
from scipy.sparse import csr_matrix

from ml_pipeline.explain import explain_input, make_explainer
from ml_pipeline.model_input import explain_matrix, predict_proba, to_sparse

ART = Path(__file__).resolve().parents[1] / 'artifacts'


@pytest.fixture(scope='module')
def model():
    return joblib.load(ART / 'best_model.joblib')


@pytest.fixture(scope='module')
def columns():
    return json.loads((ART / 'feature_columns.json').read_text(encoding='utf-8'))


def random_patients(columns, count=80, evidence=7, seed=3):
    rng = np.random.default_rng(seed)
    X = np.zeros((count, len(columns)), dtype=np.float32)
    for row in X:
        row[0] = rng.integers(1, 90)
        row[3] = 1  # age_group_adult
        row[7] = 1  # sex_unknown
        row[rng.choice(np.arange(8, len(columns)), size=evidence, replace=False)] = 1
    return X


def test_helper_matches_sparse_training_representation(model, columns):
    X = random_patients(columns)
    expected = model.predict_proba(csr_matrix(X, dtype=np.float32))
    np.testing.assert_allclose(predict_proba(model, X), expected, atol=1e-7)


def test_dense_input_is_not_collapsed_to_one_class(model, columns):
    X = random_patients(columns)
    predicted = predict_proba(model, X).argmax(axis=1)
    assert len(set(predicted)) > 5, 'predictions collapsed: dense zeros are being treated as values'


def test_masked_dense_matches_sparse_for_xgboost(model, columns):
    if not hasattr(model, 'get_booster'):
        pytest.skip('not an XGBoost model')
    X = random_patients(columns, count=30)
    masked = model.predict_proba(explain_matrix(model, X))
    np.testing.assert_allclose(masked, model.predict_proba(to_sparse(X)), atol=1e-6)


def test_shap_contributions_add_up_to_model_margin(model, columns):
    if not hasattr(model, 'get_booster'):
        pytest.skip('not an XGBoost model')
    X = random_patients(columns, count=6)
    background = joblib.load(ART / 'shap_background.joblib')
    explainer = make_explainer(model, background, columns)
    explanation = explainer(explain_matrix(model, X))
    reconstructed = explanation.values.sum(axis=1) + np.asarray(explanation.base_values)
    margin = model.get_booster().predict(xgboost.DMatrix(to_sparse(X)), output_margin=True)
    np.testing.assert_allclose(reconstructed, margin, atol=1e-3)


def test_explain_input_reports_present_evidence(model, columns):
    X = random_patients(columns, count=1)
    background = joblib.load(ART / 'shap_background.joblib')
    top_class = int(predict_proba(model, X)[0].argmax())
    top5 = explain_input(model, background, columns, X[0], top_class)
    assert len(top5) == 5
    assert all({'symptom', 'contribution', 'present'} <= set(item) for item in top5)
    assert all(np.isfinite(item['contribution']) for item in top5)
