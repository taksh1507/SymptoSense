"""Confidence calibration metrics and selective prediction operating point search.

Provides Expected Calibration Error (ECE), binned reliability curves,
wrong-and-confident rates, and threshold-margin grid search for selective prediction.
"""
from __future__ import annotations

from typing import Dict, Any, List, Tuple
import numpy as np

class WrongAndConfidentResult(tuple):
    """Named tuple-like result for wrong-and-confident rates."""
    def __new__(cls, prop_all: float, error_in_high_conf: float):
        return super().__new__(cls, (float(prop_all), float(error_in_high_conf)))
        
    @property
    def proportion_of_all(self) -> float:
        return self[0]
        
    @property
    def error_in_high_confidence(self) -> float:
        return self[1]
        
    def to_dict(self) -> Dict[str, float]:
        return {
            'proportion_of_all': self[0],
            'error_in_high_confidence': self[1]
        }

def expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 15
) -> float:
    """Compute Expected Calibration Error (ECE) with uniform confidence binning.
    
    Args:
        y_true: 1D array of ground truth class indices, shape (N,).
        y_prob: 2D array of class probabilities, shape (N, C), or 1D top confidences.
        n_bins: Number of equal-width bins in [0, 1].
    
    Returns:
        float: Expected calibration error in [0, 1].
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    
    if y_prob.ndim == 2:
        confidences = np.max(y_prob, axis=1)
        predictions = np.argmax(y_prob, axis=1)
        accuracies = (predictions == y_true).astype(float)
    else:
        confidences = y_prob
        accuracies = y_true.astype(float)
        
    n_samples = len(confidences)
    if n_samples == 0:
        return 0.0
        
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    
    for i in range(n_bins):
        low, high = bin_edges[i], bin_edges[i + 1]
        if i == n_bins - 1:
            in_bin = (confidences >= low) & (confidences <= high)
        else:
            in_bin = (confidences >= low) & (confidences < high)
            
        bin_count = int(np.sum(in_bin))
        if bin_count > 0:
            bin_acc = float(np.mean(accuracies[in_bin]))
            bin_conf = float(np.mean(confidences[in_bin]))
            ece += (bin_count / n_samples) * abs(bin_acc - bin_conf)
            
    return float(ece)

def reliability_curve_data(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 15
) -> List[Dict[str, Any]]:
    """Generate reliability curve bin statistics with observed accuracy and sample counts."""
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    
    if y_prob.ndim == 2:
        confidences = np.max(y_prob, axis=1)
        predictions = np.argmax(y_prob, axis=1)
        accuracies = (predictions == y_true).astype(float)
    else:
        confidences = y_prob
        accuracies = y_true.astype(float)
        
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    curve_points = []
    
    for i in range(n_bins):
        low, high = float(bin_edges[i]), float(bin_edges[i + 1])
        if i == n_bins - 1:
            in_bin = (confidences >= low) & (confidences <= high)
        else:
            in_bin = (confidences >= low) & (confidences < high)
            
        bin_count = int(np.sum(in_bin))
        if bin_count > 0:
            bin_acc = float(np.mean(accuracies[in_bin]))
            bin_conf = float(np.mean(confidences[in_bin]))
        else:
            bin_acc = 0.0
            bin_conf = float((low + high) / 2.0)
            
        curve_points.append({
            'bin_index': i,
            'confidence_range': [low, high],
            'mean_confidence': bin_conf,
            'observed_accuracy': bin_acc,
            'sample_count': bin_count,
        })
        
    return curve_points

def wrong_and_confident_rate(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.80
) -> WrongAndConfidentResult:
    """Compute wrong-and-confident rates at a confidence threshold.
    
    Returns:
        WrongAndConfidentResult with:
          (1) proportion of all predictions that are wrong AND have confidence >= threshold
          (2) proportion of high-confidence predictions (conf >= threshold) that are wrong
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    
    if y_prob.ndim == 2:
        confidences = np.max(y_prob, axis=1)
        predictions = np.argmax(y_prob, axis=1)
        wrong = (predictions != y_true)
    else:
        confidences = y_prob
        wrong = (y_true == 0)
        
    high_conf = (confidences >= threshold)
    wrong_and_high = wrong & high_conf
    
    n_total = len(confidences)
    prop_all = float(np.sum(wrong_and_high) / n_total) if n_total > 0 else 0.0
    
    n_high = int(np.sum(high_conf))
    error_in_high = float(np.sum(wrong_and_high) / n_high) if n_high > 0 else 0.0
    
    return WrongAndConfidentResult(prop_all, error_in_high)

def find_optimal_operating_point(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    min_precision: float = 0.90,
    threshold_range: Tuple[float, float, float] = (0.30, 0.95, 0.05),
    margin_range: Tuple[float, float, float] = (0.00, 0.50, 0.05)
) -> Dict[str, Any]:
    """Perform grid search over (threshold t, margin m) on validation probabilities.
    
    Objective:
        Maximize coverage subject to Precision(t, m) >= min_precision.
        Where a prediction is made if:
            top1_prob >= t  AND  (top1_prob - top2_prob) >= m
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    
    n_samples = len(y_true)
    if n_samples == 0:
        return {
            'threshold': 0.50,
            'margin': 0.10,
            'expected_precision': 1.0,
            'expected_coverage': 0.0,
            'all_grid_points': []
        }
        
    sorted_prob = np.sort(y_prob, axis=1)[:, ::-1]
    top1 = sorted_prob[:, 0]
    top2 = sorted_prob[:, 1] if sorted_prob.shape[1] > 1 else np.zeros_like(top1)
    margins = top1 - top2
    preds = np.argmax(y_prob, axis=1)
    correct = (preds == y_true)
    
    t_start, t_stop, t_step = threshold_range
    m_start, m_stop, m_step = margin_range
    
    thresholds = np.arange(t_start, t_stop + 1e-5, t_step)
    margin_vals = np.arange(m_start, m_stop + 1e-5, m_step)
    
    candidates = []
    all_points = []
    
    for t in thresholds:
        for m in margin_vals:
            t = round(float(t), 2)
            m = round(float(m), 2)
            accepted = (top1 >= t) & (margins >= m)
            acc_count = int(np.sum(accepted))
            
            if acc_count > 0:
                precision = float(np.sum(correct[accepted]) / acc_count)
                coverage = float(acc_count / n_samples)
            else:
                precision = 0.0
                coverage = 0.0
                
            point = {
                'threshold': t,
                'margin': m,
                'precision': precision,
                'coverage': coverage,
                'accepted_count': acc_count
            }
            all_points.append(point)
            
            if precision >= min_precision and coverage > 0.0:
                candidates.append(point)
                
    if candidates:
        # Maximize coverage; tie-breaker: higher precision, then lower threshold
        candidates.sort(key=lambda p: (p['coverage'], p['precision'], -p['threshold']), reverse=True)
        best = candidates[0]
    else:
        # Fallback: candidate with highest precision, then highest coverage
        non_zero = [p for p in all_points if p['accepted_count'] > 0]
        if non_zero:
            non_zero.sort(key=lambda p: (p['precision'], p['coverage']), reverse=True)
            best = non_zero[0]
        else:
            best = {'threshold': 0.50, 'margin': 0.10, 'precision': 0.0, 'coverage': 0.0}
            
    return {
        'threshold': best['threshold'],
        'margin': best['margin'],
        'expected_precision': best['precision'],
        'expected_coverage': best['coverage'],
        'min_precision_target': min_precision,
        'all_grid_points': all_points
    }
