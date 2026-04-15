import pandas as pd
import numpy as np
import random

# Configuration
OUTPUT_FILE = "synthetic_data.csv"
PERTURBATIONS_PER_SAMPLE = 40
TOTAL_TARGET = 30000

# Target distribution bands
TARGET_DIST = {
    'low':    (0.00, 0.40, 0.32),  # (min, max, target_fraction)
    'mid_lo': (0.40, 0.60, 0.22),
    'mid_hi': (0.60, 0.80, 0.30),  # ← the previously empty band
    'high':   (0.80, 1.00, 0.16),
}

# ── Scoring engine ────────────────────────────────────────────

def score_engine(features, noisy=False):
    score = 0
    if features.get('chest_pain', 0) == 1:
        if noisy: return random.uniform(90, 100), "HIGH"
        return 100, "HIGH"

    symptom_scores = {'fever': 15, 'cough': 12, 'dizziness': 15, 'fatigue': 8}
    for s, val in symptom_scores.items():
        if features.get(s, 0) == 1:
            score += val

    score += {1: 0, 2: 15, 3: 35}[features['severity']]
    score += {1: 0, 2: 10, 3: 20}[features['duration']]

    if features.get('diabetes', 0) == 1:    score += 15
    if features.get('heart_disease', 0) == 1: score += 25

    score += {0: 10, 1: 0, 2: 25}[features['age_group']]
    score = min(100, score)
    level = "HIGH" if score >= 61 else ("MEDIUM" if score >= 31 else "LOW")
    return score, level


def perturb_sample(sample):
    perturbed = sample.copy()
    keys = ['fever', 'cough', 'chest_pain', 'dizziness', 'fatigue',
            'diabetes', 'heart_disease', 'age_group', 'severity', 'duration']
    key = random.choice(keys)
    if key in ['fever', 'cough', 'chest_pain', 'dizziness', 'fatigue', 'diabetes', 'heart_disease']:
        perturbed[key] = 1 - perturbed[key]
    elif key == 'age_group':
        perturbed[key] = random.randint(0, 2)
    else:
        perturbed[key] = random.randint(1, 3)
    return perturbed


def get_instability(sample):
    orig_score, _ = score_engine(sample, noisy=False)
    deltas = [abs(orig_score - score_engine(perturb_sample(sample))[0])
              for _ in range(PERTURBATIONS_PER_SAMPLE)]
    return np.mean(deltas), orig_score


RISK_ENCODING = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
static_columns = ['age_group', 'severity', 'duration', 'fever', 'cough',
                  'chest_pain', 'dizziness', 'fatigue', 'diabetes', 'heart_disease']
symptom_pool = ['fever', 'cough', 'dizziness', 'fatigue', 'diabetes', 'heart_disease']

# ── Phase 1: Generate base samples ───────────────────────────

print(f"Phase 1: Generating {TOTAL_TARGET} base samples...")
raw_data = []
risk_counts = {0: 0, 1: 0, 2: 0}
risk_target = {0: 0.35, 1: 0.35, 2: 0.30}

while len(raw_data) < TOTAL_TARGET:
    complexity = random.choices([0, 1, 2, 3, 4], weights=[0.2, 0.4, 0.2, 0.1, 0.1])[0]
    sample = {c: 0 for c in static_columns}
    for k in random.sample(symptom_pool, complexity):
        sample[k] = 1
    if random.random() < 0.15:
        sample['chest_pain'] = 1
    sample['age_group'] = random.choices([0, 1, 2], weights=[0.2, 0.7, 0.1])[0]
    sample['severity']   = random.choices([1, 2, 3], weights=[0.5, 0.4, 0.1])[0]
    sample['duration']   = random.choices([1, 2, 3], weights=[0.5, 0.4, 0.1])[0]

    instability, rule_score = get_instability(sample)
    level_str = "HIGH" if rule_score >= 61 else ("MEDIUM" if rule_score >= 31 else "LOW")
    level = RISK_ENCODING[level_str]

    if risk_counts[level] >= TOTAL_TARGET * (risk_target[level] + 0.05):
        continue

    # ── Dynamic feature generation ────────────────────────────
    intensity = float(np.clip(sample['severity'] + np.random.normal(0, 0.5), 1, 3))

    prog_weights = [0.3, 0.4, 0.3]
    if level == 2: prog_weights = [0.1, 0.3, 0.6]
    elif level == 0: prog_weights = [0.6, 0.3, 0.1]
    progression = random.choices([0, 1, 2], weights=prog_weights)[0]

    # Ambiguity: continuous, correlated with instability
    if instability > 15:
        ambiguity = random.uniform(0.45, 0.85)
    elif instability > 8:
        ambiguity = random.uniform(0.25, 0.55)   # ← mid-zone ambiguity
    else:
        ambiguity = random.uniform(0.0, 0.25)

    # Noise scale: moderate for mid-zone, low for stable, high for unstable
    if instability <= 8 and ambiguity < 0.2:
        noise_scale = 0.05   # stable
    elif instability <= 15:
        noise_scale = 0.08   # mid — STEP 4: controlled noise for mid cases
    else:
        noise_scale = 0.12   # unstable

    consistency = float(np.clip(
        1.0 - (ambiguity * 0.65) + np.random.normal(0, noise_scale), 0.0, 1.0
    ))
    proxy = float(np.clip(
        0.9 - (ambiguity * 0.35) + np.random.normal(0, noise_scale), 0.0, 1.0
    ))

    active_count = sum(sample[k] for k in symptom_pool) + (1 if sample['chest_pain'] else 0)
    density = active_count / len(symptom_pool)

    # ── STEP 1: Add noise to rule_score to reduce model dependency ──
    rule_score_noisy = float(np.clip(rule_score + random.uniform(-5, 5), 0, 100))

    # ── STEP 2: Normalize rule_score to 0–1 range ──
    rule_score_norm = rule_score_noisy / 100.0

    # ── STEP 3: Feature dropout — mask rule_score for ~10% of samples ──
    # Use sentinel value -1 (out of normal range) so model learns to ignore it
    if random.random() < 0.10:
        rule_score_norm = -1.0

    row = sample.copy()
    row.update({
        'rule_score':               rule_score_norm,   # normalized + noisy + occasionally masked
        'risk_level':               level,
        'instability_score':        instability,
        'symptom_intensity_score':  intensity,
        'symptom_consistency_score': consistency,
        'symptom_progression':      progression,
        'answer_confidence_proxy':  proxy,
        'ambiguity_score':          ambiguity,
        'multi_symptom_density':    density,
    })
    raw_data.append(row)
    risk_counts[level] += 1

# ── Phase 2: Confidence labeling ─────────────────────────────

print("Phase 2: Labeling confidence scores...")
max_instability = max(r['instability_score'] for r in raw_data) or 1.0
all_instabilities = np.array([r['instability_score'] for r in raw_data])
instability_p10 = np.percentile(all_instabilities, 10)
instability_p40 = np.percentile(all_instabilities, 40)
instability_p70 = np.percentile(all_instabilities, 70)

print(f"  Instability percentiles — p10: {instability_p10:.2f}, p40: {instability_p40:.2f}, "
      f"p70: {instability_p70:.2f}, max: {max_instability:.2f}")

final_data = []

for row in raw_data:
    instability  = row['instability_score']
    rule_score   = row['rule_score']   # normalized 0–1 (or -1 if masked)
    ambiguity    = row['ambiguity_score']
    consistency  = row['symptom_consistency_score']
    proxy        = row['answer_confidence_proxy']
    progression  = row['symptom_progression']

    # Recover approximate raw score for clinical override checks
    # (masked rows use risk_level as proxy instead)
    raw_score_approx = rule_score * 100 if rule_score >= 0 else (row['risk_level'] * 40 + 10)

    # ── STEP 1: Smooth instability → confidence curve (power 0.75) ──
    normalized = instability / max_instability
    conf = 1.0 - (normalized ** 0.75)   # gentler curve vs linear, avoids sharp drops

    # ── STEP 3: Softened penalties (reduced ~15–20%) ──
    # Ambiguity: was 1-0.15x → now 1-0.12x
    conf *= (1.0 - 0.12 * ambiguity)
    # Consistency: was 0.8+0.2x → now 0.82+0.18x
    conf *= (0.82 + 0.18 * consistency)
    # Proxy: was 0.85+0.15x → now 0.87+0.13x
    conf *= (0.87 + 0.13 * proxy)

    # Boundary penalty (softened): near risk-level thresholds
    if 28 <= raw_score_approx <= 34 or 58 <= raw_score_approx <= 64:
        conf *= random.uniform(0.78, 0.92)

    # Low-info penalty (softened)
    active = sum(row[k] for k in ['fever', 'cough', 'dizziness', 'fatigue', 'chest_pain'])
    if active == 0 and row['severity'] == 1:
        conf *= random.uniform(0.55, 0.80)

    # ── STEP 2: Explicit mid-zone injection ──────────────────────
    # Cases with moderate ambiguity + stable progression → land in 0.6–0.8
    is_mid_zone = (
        0.3 <= ambiguity <= 0.6 and
        0.5 <= consistency <= 0.75 and
        progression == 1  # stable
    )
    if is_mid_zone:
        # Override with a direct mid-zone value + Gaussian noise (STEP 4)
        base = random.uniform(0.60, 0.78)
        conf = float(np.clip(base + np.random.normal(0, 0.06), 0.55, 0.82))

    # ── Extreme score overrides (clear-cut clinical cases) ───────
    elif raw_score_approx >= 90:
        conf = random.uniform(0.82, 0.97)
    elif raw_score_approx < 10 and ambiguity < 0.15:
        conf = random.uniform(0.78, 0.93)

    # ── Stable-case boost (only for genuinely stable, non-mid-zone) ──
    elif (
        instability <= instability_p10 and
        ambiguity < 0.15 and
        consistency > 0.82
    ):
        boost = random.uniform(0.08, 0.13)
        conf = min(1.0, conf + boost)

    # ── STEP 4: Gaussian noise for mid-range cases ───────────────
    if instability_p10 < instability <= instability_p70:
        conf += np.random.normal(0, 0.05)

    conf = float(np.clip(conf, 0.0, 1.0))
    row['confidence'] = conf
    final_data.append(row)

df = pd.DataFrame(final_data)

# ── Phase 3: Distribution check & rebalancing ────────────────

print("\nPhase 3: Checking distribution and rebalancing...")
bins   = [0.0, 0.40, 0.60, 0.80, 1.01]
labels = ['<0.4 (low)', '0.4–0.6 (mid-lo)', '0.6–0.8 (mid-hi)', '0.8–1.0 (high)']

def report_dist(dataframe, tag=""):
    dataframe['_bucket'] = pd.cut(dataframe['confidence'], bins=bins, labels=labels, right=False)
    counts = dataframe['_bucket'].value_counts().sort_index()
    pcts   = (counts / len(dataframe) * 100).round(1)
    print(f"\n  {tag}Distribution ({len(dataframe)} rows):")
    for lbl in labels:
        bar = '█' * int(pcts.get(lbl, 0) / 2)
        print(f"    {lbl:20s}: {counts.get(lbl, 0):6d} ({pcts.get(lbl, 0):5.1f}%)  {bar}")
    dataframe.drop(columns=['_bucket'], inplace=True)

report_dist(df, "Before rebalancing — ")

# Oversample under-represented bands to hit targets
for band, (lo, hi, target_frac) in TARGET_DIST.items():
    current = df[(df['confidence'] >= lo) & (df['confidence'] < hi)]
    current_frac = len(current) / len(df)
    needed = int(len(df) * target_frac) - len(current)

    if needed > 0 and len(current) > 0:
        oversampled = current.sample(n=needed, replace=True, random_state=42).copy()
        # Jitter continuous features so they're not exact duplicates
        for col in ['symptom_consistency_score', 'answer_confidence_proxy',
                    'ambiguity_score', 'confidence']:
            oversampled[col] = np.clip(
                oversampled[col] + np.random.normal(0, 0.015, len(oversampled)),
                0.0, 1.0
            )
        # Keep confidence within the band after jitter
        oversampled['confidence'] = np.clip(oversampled['confidence'], lo, hi - 0.001)
        df = pd.concat([df, oversampled], ignore_index=True)
        print(f"  Oversampled '{band}' band: +{len(oversampled)} rows "
              f"(was {current_frac:.1%}, target {target_frac:.0%})")

report_dist(df, "After rebalancing  — ")

# ── Save ─────────────────────────────────────────────────────
df.to_csv(OUTPUT_FILE, index=False)
print(f"\nDataset saved to '{OUTPUT_FILE}'. Total rows: {len(df)}")
