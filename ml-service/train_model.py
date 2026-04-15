import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import joblib
import matplotlib
matplotlib.use('Agg')  # non-interactive backend — safe for headless environments
import matplotlib.pyplot as plt

# Configuration
DATASET_FILE = "synthetic_data.csv"
MODEL_FILE = "confidence_model.joblib"

def train():
    print(f"Loading dataset from {DATASET_FILE}...")
    df = pd.read_csv(DATASET_FILE)

    print(f"Dataset size: {len(df)} rows")

    # --- STEP 7: Pre-training distribution check ---
    bins = [0, 0.4, 0.6, 0.8, 1.01]
    labels = ['<0.4 (low)', '0.4–0.6 (mid-lo)', '0.6–0.8 (mid-hi)', '0.8–1.0 (high)']
    df['conf_bucket'] = pd.cut(df['confidence'], bins=bins, labels=labels, right=False)
    print("\nConfidence distribution in dataset:")
    dist = df['conf_bucket'].value_counts().sort_index()
    print(dist)
    mid_pct  = ((df['confidence'] >= 0.6) & (df['confidence'] < 0.8)).mean()
    high_pct = (df['confidence'] >= 0.8).mean()
    print(f"\nMid-zone  (0.6–0.8): {mid_pct:.1%}")
    print(f"High-conf (≥0.8):    {high_pct:.1%}")
    if mid_pct < 0.15:
        print("WARNING: Mid-zone still under-represented. Consider re-running generate_dataset.py.")
    df.drop(columns=['conf_bucket'], inplace=True)

    # Feature selection
    X = df.drop(columns=['confidence', 'instability_score'])
    y = df['confidence']

    print(f"\nFeatures: {list(X.columns)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # --- STEP 6: Improved RandomForestRegressor hyperparameters ---
    print("\nTraining RandomForestRegressor (tuned for high-confidence expressiveness)...")
    model = RandomForestRegressor(
        n_estimators=250,        # was 150 — more trees = better high-conf region coverage
        max_depth=12,            # was 10 — slightly deeper to capture stable patterns
        min_samples_leaf=6,      # was 10 — finer granularity in leaf nodes
        max_features='sqrt',
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    print(f"\nTraining Complete.")
    print(f"R² Score:              {r2:.4f}")
    print(f"Mean Absolute Error:   {mae:.4f}")

    # --- STEP 7: Validation checks ---
    pred_series = pd.Series(y_pred)
    pred_bins = pd.cut(pred_series, bins=bins, labels=labels, right=False)
    print("\nPredicted confidence distribution (test set):")
    print(pred_bins.value_counts().sort_index())

    # Check for binary behavior (missing mid-zone)
    mid_zone_pct = ((pred_series >= 0.60) & (pred_series < 0.80)).mean()
    print(f"\nMid-zone predictions (0.6–0.8): {mid_zone_pct:.1%}")
    if mid_zone_pct < 0.15:
        print("WARNING: Mid-zone (0.6–0.8) under-represented — model may be behaving binary.")
    else:
        print("OK: Mid-zone is populated.")

    # Check for clustering around 0.6
    mid_cluster = ((pred_series >= 0.55) & (pred_series <= 0.65)).mean()
    print(f"Clustering around 0.6 (0.55–0.65): {mid_cluster:.1%}")
    if mid_cluster > 0.40:
        print("WARNING: Over 40% of predictions clustered around 0.6.")
    else:
        print("OK: No excessive clustering around 0.6.")

    high_pred_pct = (pred_series >= 0.8).mean()
    low_pred_pct  = (pred_series < 0.4).mean()
    print(f"High-confidence predictions (≥0.8): {high_pred_pct:.1%}")
    print(f"Low-confidence predictions  (<0.4): {low_pred_pct:.1%}")
    if high_pred_pct < 0.10 or low_pred_pct < 0.10:
        print("WARNING: Distribution may still be compressed — check dataset balance.")

    # Feature importance
    importances = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)

    print("\nFeature Importances (Top 10):")
    print(importances.head(10).to_string(index=False))

    max_imp = importances['importance'].max()
    max_feat = importances.iloc[0]['feature']
    if max_imp > 0.25:
        print(f"\nWARNING: '{max_feat}' has high importance ({max_imp:.2f}). Check for shortcut learning.")
    else:
        print(f"\nSTABILITY CHECK PASSED: Max importance {max_imp:.2f} (< 0.25).")

    # --- STEP 4: rule_score dependency check ---
    rule_imp = importances[importances['feature'] == 'rule_score']['importance'].values
    rule_imp_val = rule_imp[0] if len(rule_imp) > 0 else 0.0
    print(f"\nrule_score importance:       {rule_imp_val:.3f}")
    if rule_imp_val > 0.22:
        print("WARNING: rule_score importance > 22% — model still over-reliant on risk score.")
        print("         Consider increasing dropout rate in generate_dataset.py.")
    else:
        print("OK: rule_score importance within target (≤22%).")

    # Check behavioral features gained importance
    behavioral = ['ambiguity_score', 'symptom_consistency_score', 'symptom_progression',
                  'answer_confidence_proxy', 'symptom_intensity_score']
    beh_imp = importances[importances['feature'].isin(behavioral)]['importance'].sum()
    print(f"Behavioral features combined: {beh_imp:.3f}")
    if beh_imp < 0.40:
        print("WARNING: Behavioral features combined importance < 40% — stability signals are weak.")
    else:
        print("OK: Behavioral features are contributing meaningfully.")

    # --- STEP 7: Plot confidence distribution ---
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].hist(y_test, bins=30, color='steelblue', alpha=0.7, label='Actual')
    axes[0].hist(y_pred, bins=30, color='tomato', alpha=0.7, label='Predicted')
    axes[0].set_title('Confidence Distribution (Test Set)')
    axes[0].set_xlabel('Confidence Score')
    axes[0].set_ylabel('Count')
    axes[0].legend()
    axes[0].axvline(0.8, color='green', linestyle='--', label='0.8 threshold')

    axes[1].scatter(y_test[:500], y_pred[:500], alpha=0.3, s=10, color='purple')
    axes[1].plot([0, 1], [0, 1], 'r--', label='Perfect fit')
    axes[1].set_title('Actual vs Predicted (sample of 500)')
    axes[1].set_xlabel('Actual')
    axes[1].set_ylabel('Predicted')
    axes[1].legend()

    plt.tight_layout()
    plt.savefig('confidence_distribution.png', dpi=120)
    print("\nDistribution plot saved to confidence_distribution.png")

    # Save model
    joblib.dump(model, MODEL_FILE)
    print(f"Model saved to {MODEL_FILE}")

if __name__ == "__main__":
    train()
