"""SHAP explanations that match the deployed model's input semantics."""
import numpy as np
import shap
from .data import SEED
from .model_input import explain_matrix, is_xgboost, to_sparse

_CACHE = {}


def make_explainer(model, background, symptoms):
    """Return an explainer for the deployed raw model.

    XGBoost: exact TreeExplainer (tree-path-dependent).  Contributions are in
    the model's raw log-odds (margin) space and add up to the booster output.
    Explaining a sparse-trained XGBoost model requires zeros to be passed as
    missing values; see model_input.explain_matrix.
    """
    key = id(model)
    if key in _CACHE:
        return _CACHE[key]
    values = explain_matrix(model, background)
    explainer = None
    if is_xgboost(model):
        explainer = shap.TreeExplainer(model)
    elif hasattr(model, 'feature_importances_'):
        try:
            explainer = shap.TreeExplainer(model, data=values, feature_names=symptoms, model_output='probability')
        except Exception:
            explainer = None
    if explainer is None and hasattr(model, 'coef_'):
        try:
            explainer = shap.LinearExplainer(model, values, feature_names=symptoms)
        except Exception:
            explainer = None
    if explainer is None:
        def predict_fn(batch):
            return model.predict_proba(to_sparse(np.nan_to_num(batch)))
        explainer = shap.PermutationExplainer(predict_fn, np.nan_to_num(values), feature_names=symptoms, seed=SEED)
    _CACHE[key] = explainer
    return explainer


def explain_input(model, background, symptoms, vector, class_index):
    explainer = make_explainer(model, background, symptoms)
    data = explain_matrix(model, np.asarray(vector).reshape(1, -1))
    if isinstance(explainer, shap.PermutationExplainer):
        explanation = explainer(np.nan_to_num(data), max_evals=2 * len(symptoms) + 1)
    else:
        explanation = explainer(data)
    values = explanation.values
    if isinstance(values, list):
        contributions = np.asarray(values[class_index])[0]
    elif np.ndim(values) == 3:
        contributions = values[0, :, class_index]
    else:
        contributions = values[0]
    order = np.argsort(np.abs(contributions))[::-1][:5]
    return [{'symptom': symptoms[i], 'contribution': float(contributions[i]), 'present': bool(np.asarray(vector).ravel()[i])} for i in order]
