"""Model-input helpers that keep training and inference numerically identical.

The DDXPlus models are trained on scipy CSR matrices.  XGBoost treats entries
that are absent from a sparse matrix as *missing*, but treats zeros in a dense
array as real values.  Feeding a dense zero-filled vector to a model that was
trained on sparse data therefore changes which tree branches are taken and
collapses predictions to a single class.  Every prediction or explanation path
must go through the helpers below.
"""
import numpy as np
from scipy.sparse import csr_matrix, issparse


def to_sparse(values):
    """Return a float32 CSR matrix (the representation used for training)."""
    if issparse(values):
        return values.tocsr().astype(np.float32)
    array = np.asarray(values, dtype=np.float32)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    return csr_matrix(array, dtype=np.float32)


def is_xgboost(model):
    return hasattr(model, 'get_booster')


def explain_matrix(model, values):
    """Dense array for SHAP.  For XGBoost, zeros become NaN (= missing), which
    reproduces the semantics of the sparse training matrix exactly."""
    array = values.toarray() if issparse(values) else np.asarray(values)
    array = np.array(array, dtype=np.float32, copy=True)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    if is_xgboost(model):
        array[array == 0] = np.nan
    return array


def predict_proba(model, values):
    return model.predict_proba(to_sparse(values))


def predict(model, values):
    return model.predict(to_sparse(values))
