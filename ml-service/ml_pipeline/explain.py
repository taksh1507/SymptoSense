"""SHAP directly explains the deployed calibrated probability function."""
import numpy as np
import shap
from .data import SEED

def make_explainer(model, background, symptoms):
    return shap.PermutationExplainer(model.predict_proba, np.asarray(background), feature_names=symptoms, seed=SEED)

def explain_input(model, background, symptoms, vector, class_index):
    explanation = make_explainer(model, background, symptoms)(np.asarray(vector).reshape(1, -1), max_evals=2 * len(symptoms) + 1)
    contributions = explanation.values[0, :, class_index]
    order = np.argsort(np.abs(contributions))[::-1][:5]
    return [{'symptom': symptoms[i], 'contribution': float(contributions[i]), 'present': bool(vector[i])} for i in order]
