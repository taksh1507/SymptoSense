"""SHAP directly explains the deployed raw model probability function."""
import numpy as np
import shap
from .data import SEED

def make_explainer(model, background, symptoms):
    values = np.asarray(background)
    if hasattr(model, 'feature_importances_'):
        try:
            return shap.TreeExplainer(model, data=values, feature_names=symptoms, model_output='probability')
        except Exception:
            pass
    # LinearExplainer is exact and efficient for the sparse linear classifier.
    if hasattr(model, 'coef_'):
        try:
            return shap.LinearExplainer(model, values, feature_names=symptoms)
        except Exception:
            pass
    return shap.PermutationExplainer(model.predict_proba, values, feature_names=symptoms, seed=SEED)

def explain_input(model, background, symptoms, vector, class_index):
    explainer = make_explainer(model, background, symptoms)
    data = np.asarray(vector).reshape(1, -1)
    if isinstance(explainer, shap.PermutationExplainer):
        explanation = explainer(data, max_evals=2 * len(symptoms) + 1)
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
    return [{'symptom': symptoms[i], 'contribution': float(contributions[i]), 'present': bool(vector[i])} for i in order]
