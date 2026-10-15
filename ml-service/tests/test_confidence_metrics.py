"""Unit tests for confidence metrics, ECE, reliability curves, and selective prediction."""
import numpy as np
import pytest
from ml_pipeline.confidence_metrics import (
    expected_calibration_error,
    reliability_curve_data,
    wrong_and_confident_rate,
    find_optimal_operating_point
)

def test_ece_perfect_calibration():
    """Synthetic dataset with well-calibrated probabilities should have low ECE."""
    np.random.seed(42)
    n = 5000
    # Model assigns confidence p in [0.6, 0.9] for class 1
    p_class1 = np.random.uniform(0.60, 0.90, size=n)
    # True label drawn from Bernoulli(p_class1) -> accurately calibrated
    y_true = np.random.binomial(1, p_class1)
    probs = np.column_stack([1.0 - p_class1, p_class1])
    
    ece = expected_calibration_error(y_true, probs, n_bins=10)
    assert ece < 0.05, f"Expected low ECE for calibrated probabilities, got {ece}"

def test_ece_poor_calibration():
    """Synthetic dataset with overconfident wrong predictions should have high ECE."""
    n = 500
    # True labels are all class 0
    y_true = np.zeros(n, dtype=int)
    # Model predicts class 1 with 0.99 confidence
    probs = np.zeros((n, 2))
    probs[:, 0] = 0.01
    probs[:, 1] = 0.99
    
    ece = expected_calibration_error(y_true, probs, n_bins=10)
    assert ece > 0.90, f"Expected high ECE for severely miscalibrated probabilities, got {ece}"

def test_reliability_curve_data_structure():
    """Verify reliability curve returns correct bins, counts, and ranges."""
    y_true = np.array([0, 1, 1, 0, 1])
    probs = np.array([
        [0.9, 0.1],
        [0.2, 0.8],
        [0.3, 0.7],
        [0.85, 0.15],
        [0.1, 0.9]
    ])
    curve = reliability_curve_data(y_true, probs, n_bins=5)
    assert len(curve) == 5
    total_samples = sum(bin_data['sample_count'] for bin_data in curve)
    assert total_samples == len(y_true)
    for pt in curve:
        assert 'mean_confidence' in pt
        assert 'observed_accuracy' in pt
        assert 'confidence_range' in pt

def test_wrong_and_confident_rate():
    """Verify computation of wrong-and-confident rates at threshold."""
    # 10 samples:
    # 4 correct with high conf (0.9)
    # 2 wrong with high conf (0.85)
    # 4 wrong with low conf (0.55)
    y_true = np.array([1, 1, 1, 1, 0, 0, 0, 0, 0, 0])
    probs = np.array([
        [0.1, 0.9], # correct, high
        [0.1, 0.9], # correct, high
        [0.1, 0.9], # correct, high
        [0.1, 0.9], # correct, high
        [0.15, 0.85], # wrong, high (pred 1, true 0)
        [0.15, 0.85], # wrong, high (pred 1, true 0)
        [0.45, 0.55], # wrong, low (pred 1, true 0)
        [0.45, 0.55], # wrong, low (pred 1, true 0)
        [0.45, 0.55], # wrong, low (pred 1, true 0)
        [0.45, 0.55], # wrong, low (pred 1, true 0)
    ])
    result = wrong_and_confident_rate(y_true, probs, threshold=0.80)
    # Total samples = 10. Wrong and high-conf = 2 samples -> prop_all = 2/10 = 0.20
    assert np.isclose(result.proportion_of_all, 0.20)
    # High conf samples (>= 0.80) = 4 + 2 = 6 samples. Wrong among high-conf = 2/6 = 0.333...
    assert np.isclose(result.error_in_high_confidence, 2.0 / 6.0)
    
    # Test dictionary conversion and tuple unpacking
    p_all, err_high = result
    assert np.isclose(p_all, 0.20)
    assert np.isclose(err_high, 2.0 / 6.0)
    d = result.to_dict()
    assert 'proportion_of_all' in d and 'error_in_high_confidence' in d

def test_find_optimal_operating_point():
    """Verify grid search finds operating point satisfying precision constraint while maximizing coverage."""
    # Construct 100 samples with clear confidence separation:
    # 60 samples: top1=0.85, top2=0.10, margin=0.75, correct=True
    # 20 samples: top1=0.60, top2=0.30, margin=0.30, correct=True
    # 20 samples: top1=0.55, top2=0.40, margin=0.15, correct=False
    y_true = np.array([0] * 80 + [1] * 20)
    probs = np.zeros((100, 2))
    probs[:60] = [0.85, 0.15] # 60 correct (pred 0)
    probs[60:80] = [0.60, 0.40] # 20 correct (pred 0)
    probs[80:] = [0.55, 0.45] # 20 wrong (pred 0, true 1)
    
    op = find_optimal_operating_point(y_true, probs, min_precision=0.90)
    assert op['expected_precision'] >= 0.90
    assert op['expected_coverage'] > 0.0
    assert op['threshold'] >= 0.30
    assert op['margin'] >= 0.00
