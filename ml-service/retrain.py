"""Retraining job for the SymptoSense confidence model.

Merges the synthetic baseline dataset with real labeled samples collected
from the app (PredictionLog + FollowUp outcome check-ins), trains a candidate
RandomForest, evaluates it against the current champion model on a shared
holdout, applies safety gates, and promotes the candidate only if it wins.

Usage:
    python retrain.py [--min-real 20] [--skip-gate] [--data synthetic_data.csv]
"""
import argparse
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_FILE = SCRIPT_DIR.parent / "synthetic_data.csv"
DEFAULT_MODEL_FILE = SCRIPT_DIR / "confidence_model.joblib"
DEFAULT_REPORT_FILE = SCRIPT_DIR / "retrain_report.json"
DB_PATH = Path(
    os.environ.get(
        "SYMPTOSENSE_DB", SCRIPT_DIR.parent / "prisma" / "dev.db"
    )
)

MIN_REAL_ROWS = 20
RANDOM_STATE = 42
FILTER_COLUMNS = {"instability_score"}


def locate_db() -> Path:
    candidates = [
        Path(os.environ.get("SYMPTOSENSE_DB", "")) if os.environ.get("SYMPTOSENSE_DB") else None,
        SCRIPT_DIR.parent / "prisma" / "dev.db",
        SCRIPT_DIR.parent / "dev.db",
    ]
    for p in candidates:
        if p and p.is_file():
            return p
    return candidates[-1]


def load_synthetic(data_file: Path) -> pd.DataFrame:
    df = pd.read_csv(data_file)
    df = df.drop(columns=[c for c in FILTER_COLUMNS if c in df.columns])
    return df


def normalize_rule_score(value: float) -> float:
    if value is None:
        return None
    if value > 1.0:
        return round(value / 100.0, 4)
    return round(float(value), 4)


def derive_label(follow_up: dict) -> float:
    """Map an outcome check-in to a confidence target (0-1).

    Recovered / resolved -> high trust in the assessment (low severity proved).
    Worse / unresolved   -> the assessment underestimated the situation.
    """
    conf = 0.55
    imp = follow_up.get("improved")
    if imp == "worse":
        conf = 0.25
    elif imp == "same":
        conf = 0.45
    elif imp == "better":
        conf = 0.70
    elif imp == "recovered":
        conf = 0.85

    res = follow_up.get("resolved")
    if res == "yes":
        conf = 0.85
    elif res == "no":
        conf = min(conf, 0.35)
    elif res == "partial":
        conf = min(conf, 0.55)

    if follow_up.get("contactedDoctor") and conf < 0.5:
        conf = 0.55
    return round(float(np.clip(conf, 0.15, 0.97)), 3)


def load_real_rows(db_path: Path) -> list:
    con = sqlite3.connect(str(db_path))
    try:
        rows = con.execute(
            """
            SELECT pl.features, pl.ruleScore, fu.contactedDoctor,
                   fu.resolved, fu.improved
            FROM "PredictionLog" pl
            JOIN "FollowUp" fu ON fu."testSessionId" = pl."testSessionId"
            WHERE fu.status = 'responded'
              AND pl."mlAvailable" = 1
              AND pl."predictedConfidence" IS NOT NULL
            """
        ).fetchall()
    finally:
        con.close()
    return rows


def live_feature_stats(db_path: Path, feature_cols) -> dict:
    """Mean of each feature across all real logged predictions."""
    con = sqlite3.connect(str(db_path))
    try:
        rows = con.execute(
            'SELECT features FROM "PredictionLog" WHERE "mlAvailable" = 1'
        ).fetchall()
    finally:
        con.close()

    sums = {c: 0.0 for c in feature_cols}
    counts = {c: 0 for c in feature_cols}
    for (features_json,) in rows:
        try:
            feats = json.loads(features_json)
        except (TypeError, json.JSONDecodeError):
            continue
        if not isinstance(feats, dict):
            continue
        for c in feature_cols:
            v = feats.get(c)
            if isinstance(v, (int, float)):
                if c == "rule_score" and v > 1.0:
                    v = v / 100.0
                sums[c] += float(v)
                counts[c] += 1

    stats = {}
    for c in feature_cols:
        stats[c] = {"count": counts[c], "mean": round(sums[c] / counts[c], 4) if counts[c] else None}
    return stats


def compute_drift(train_df: pd.DataFrame, feature_cols, live_stats: dict) -> list:
    """Signed z-score of live mean vs training distribution per feature."""
    drift = []
    for c in feature_cols:
        train_mean = float(train_df[c].mean())
        train_std = float(train_df[c].std())
        live = live_stats.get(c, {}).get("mean")
        if live is None or train_std == 0:
            continue
        z = (live - train_mean) / train_std
        drift.append({
            "feature": c,
            "train_mean": round(train_mean, 4),
            "train_std": round(train_std, 4),
            "live_mean": live,
            "z": round(z, 3),
            "flagged": abs(z) > 2.0,
        })
    return drift


def build_real_dataframe(db_path: Path, synthetic_columns) -> pd.DataFrame:
    rows = load_real_rows(db_path)
    records = []
    skipped = 0
    for features_json, rule_score, contacted, resolved, improved in rows:
        try:
            feats = json.loads(features_json)
        except (TypeError, json.JSONDecodeError):
            skipped += 1
            continue
        if not isinstance(feats, dict):
            skipped += 1
            continue
        feats = {k: float(v) for k, v in feats.items() if isinstance(v, (int, float))}
        norm = normalize_rule_score(feats.get("rule_score", rule_score) if feats.get("rule_score") is not None else rule_score)
        if norm is None:
            skipped += 1
            continue
        label = derive_label({"contactedDoctor": contacted, "resolved": resolved, "improved": improved})
        record = dict(feats)
        record["rule_score"] = norm
        record["confidence"] = label
        records.append(record)

    if not records:
        return pd.DataFrame(), 0

    df = pd.DataFrame(records)
    df = df[[c for c in df.columns if c in synthetic_columns or c == "confidence"]]
    return df, skipped


def train_candidate(X_train, y_train):
    return RandomForestRegressor(
        n_estimators=250,
        max_depth=12,
        min_samples_leaf=6,
max_features="sqrt",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ).fit(X_train, y_train)


def safety_gate(y_true, y_pred, X_test, champion_metrics, candidate_metrics) -> list:
    """Return list of failed gate messages (empty == pass)."""
    failures = []

    red_flag_mask = (X_test["chest_pain"] == 1) & (X_test["rule_score"] >= 0.55)
    if red_flag_mask.any():
        rf_preds = y_pred[red_flag_mask.values]
        if float(np.median(rf_preds)) < 0.55:
            failures.append(
                f"red-flag safety gate failed: median confidence "
                f"{np.median(rf_preds):.3f} < 0.55 for high-risk chest pain cases"
            )

    if champion_metrics is not None:
        if candidate_metrics["mae"] > champion_metrics["mae"] * 1.03 + 0.005:
            failures.append(
                f"MAE regression: candidate {candidate_metrics['mae']:.4f} vs "
                f"champion {champion_metrics['mae']:.4f}"
            )
        if candidate_metrics["r2"] < champion_metrics["r2"] - 0.01:
            failures.append(
                f"R2 regression: candidate {candidate_metrics['r2']:.4f} vs "
                f"champion {champion_metrics['r2']:.4f}"
            )

    mid_zone = ((y_pred >= 0.55) & (y_pred < 0.80)).mean()
    if mid_zone < 0.08:
        failures.append(f"mid-zone under-populated: {mid_zone:.1%} of predictions in 0.55-0.80")

    return failures


def run_retrain(data_file: Path = DEFAULT_DATA_FILE, min_real: int = MIN_REAL_ROWS,
                skip_gate: bool = False) -> dict:
    t0 = datetime.now(timezone.utc)

    synth = load_synthetic(data_file)
    feature_cols = [c for c in synth.columns if c != "confidence"]

    real_df, skipped = build_real_dataframe(DB_PATH, set(feature_cols))
    n_real = len(real_df)
    n_synth = len(synth)

    report = {
        "createdAt": t0.isoformat(),
        "rows_synthetic": n_synth,
        "rows_real": n_real,
        "rows_real_skipped": skipped,
        "db": str(DB_PATH),
    }

    train_df = synth
    if n_real >= min_real:
        cap = max(min_real * 10, 10000)
        synth_sample = synth.sample(n=min(n_synth, cap), random_state=RANDOM_STATE)
        merged = pd.concat([synth_sample, real_df], ignore_index=True)
        # Drop any columns the real rows lack.
        merged = merged[[c for c in feature_cols if c in merged.columns] + ["confidence"]]
        train_df = merged
        report["rows_real_used"] = n_real
        report["rows_synth_used"] = len(synth_sample)
    else:
        report["rows_real_used"] = 0
        report["rows_synth_used"] = n_synth
        report["note"] = (
            f"Fewer than {min_real} real labeled rows; trained on synthetic only."
        )

    X = train_df[feature_cols]
    y = train_df["confidence"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )

    candidate = train_candidate(X_train, y_train)
    cand_pred = candidate.predict(X_test)
    cand_metrics = {
        "r2": r2_score(y_test, cand_pred),
        "mae": mean_absolute_error(y_test, cand_pred),
    }

    champion_metrics = None
    champion_path = Path(DEFAULT_MODEL_FILE)
    if champion_path.is_file():
        try:
            champion = joblib.load(str(champion_path))
            champ_pred = champion.predict(X_test)
            champion_metrics = {
                "r2": r2_score(y_test, champ_pred),
                "mae": mean_absolute_error(y_test, champ_pred),
            }
        except Exception as exc:
            report["champion_error"] = str(exc)

    report["candidate"] = cand_metrics
    report["champion"] = champion_metrics

    live_stats = live_feature_stats(DB_PATH, feature_cols)
    report["drift"] = compute_drift(train_df, feature_cols, live_stats)

    failures = safety_gate(X_test, cand_pred, X_test, champion_metrics, cand_metrics) if not skip_gate else []
    report["gate"] = {"failed": failures, "passed": len(failures) == 0}

    if len(failures) == 0:
        joblib.dump(candidate, str(champion_path))
        report["promoted"] = True
        report["modelFile"] = str(champion_path)
    else:
        report["promoted"] = False

    report["latency_s"] = round((datetime.now(timezone.utc) - t0).total_seconds(), 2)
    return report


def main():
    parser = argparse.ArgumentParser(description="Retrain SymptoSense confidence model")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_FILE)
    parser.add_argument("--min-real", type=int, default=MIN_REAL_ROWS)
    parser.add_argument("--skip-gate", action="store_true", help="promote without safety gates")
    parser.add_argument("--json", action="store_true", help="print report as JSON")
    args = parser.parse_args()

    report = run_retrain(args.data, args.min_real, args.skip_gate)
    with open(DEFAULT_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    if args.json:
        print(json.dumps(report, indent=2))
        return

    print(f"Synthetic rows: {report['rows_synthetic']}")
    print(f"Real labeled rows: {report['rows_real']}")
    print(f"Candidate: {report.get('candidate')}")
    print(f"Champion:  {report.get('champion')}")
    print(f"Gates passed: {report['gate']['passed']}  failed: {report['gate']['failed']}")
    print(f"Promoted: {report['promoted']}")
    print(f"Report written to {DEFAULT_REPORT_FILE}")


if __name__ == "__main__":
    main()