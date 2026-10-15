"""Unit tests for realistic input perturbation and group safety."""
import numpy as np
import pandas as pd
import pytest
from sklearn.model_selection import StratifiedGroupKFold
from ml_pipeline.perturb import perturb_evidences, perturb_frame
from ml_pipeline.ddxplus_data import parse_evidence
from ml_pipeline.ddx_training import patient_fingerprint

def test_perturb_evidences_guarantee():
    rng = np.random.default_rng(42)
    sample_ev = "['E_53', 'E_54_@_V_161', 'E_54_@_V_162', 'E_91', 'E_14', 'E_77', 'E_201', 'E_66']"
    for _ in range(50):
        perturbed = perturb_evidences(sample_ev, rng, k_min=3, k_max=8, forget_rate=0.20, wrong_rate=0.10, antecedent_drop_rate=0.20)
        tokens = parse_evidence(perturbed)
        assert len(tokens) >= 1, "Guarantee violated: at least one symptom unit must remain"
        assert all(isinstance(t, str) for t in tokens)

def test_perturb_frame_structure_and_group():
    df = pd.DataFrame({
        'AGE': [25, 45, 60],
        'SEX': ['M', 'F', 'M'],
        'PATHOLOGY': ['PathA', 'PathB', 'PathC'],
        'EVIDENCES': [
            "['E_53', 'E_54_@_V_161', 'E_91']",
            "['E_14', 'E_91']",
            "['E_201']"
        ]
    })
    perturbed_df = perturb_frame(df, seed=999)
    assert len(perturbed_df) == 3
    assert 'ORIG_INDEX' in perturbed_df.columns
    assert list(perturbed_df['ORIG_INDEX']) == [0, 1, 2]
    assert list(perturbed_df['PATHOLOGY']) == ['PathA', 'PathB', 'PathC'], "PATHOLOGY must never be modified"
    assert all(isinstance(ev, str) for ev in perturbed_df['EVIDENCES'])

def test_group_safe_cv_disjoint_groups():
    """Verify StratifiedGroupKFold guarantees zero group overlap between train and val."""
    # Synthetic dataframe with 30 patients, each augmented with 1 copy -> 60 total rows
    n_patients = 30
    df = pd.DataFrame({
        'AGE': np.random.randint(18, 80, size=n_patients),
        'SEX': ['M', 'F'] * (n_patients // 2),
        'PATHOLOGY': (['DiseaseA', 'DiseaseB', 'DiseaseC'] * 10),
        'EVIDENCES': ["['E_53', 'E_91']"] * n_patients,
        'ORIG_INDEX': np.arange(n_patients, dtype=np.int64)
    })
    augmented_df = perturb_frame(df, seed=123)
    combined = pd.concat([df, augmented_df], ignore_index=True)
    groups = combined['ORIG_INDEX'].values
    y = combined['PATHOLOGY'].values
    X = np.zeros((len(combined), 10))

    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    for fold, (train_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
        train_groups = set(groups[train_idx])
        val_groups = set(groups[val_idx])
        intersection = train_groups.intersection(val_groups)
        assert len(intersection) == 0, f"Fold {fold} leaked patient groups between train and validation: {intersection}"

def test_leakage_free_deduplication():
    """Verify exact (AGE, SEX, sorted(evidences), PATHOLOGY) fingerprint deduplication."""
    row1 = {'AGE': 45, 'SEX': 'M', 'PATHOLOGY': 'Asthma', 'EVIDENCES': "['E_53', 'E_91']"}
    row2_same = {'AGE': 45, 'SEX': 'm', 'PATHOLOGY': 'Asthma', 'EVIDENCES': "['E_91', 'E_53']"} # permuted evidence
    row3_diff = {'AGE': 46, 'SEX': 'M', 'PATHOLOGY': 'Asthma', 'EVIDENCES': "['E_53', 'E_91']"}
    
    fp1 = patient_fingerprint(row1)
    fp2 = patient_fingerprint(row2_same)
    fp3 = patient_fingerprint(row3_diff)
    
    assert fp1 == fp2, "Permuted evidence order or case variation in SEX should yield identical fingerprint"
    assert fp1 != fp3, "Different AGE must yield different fingerprint"
