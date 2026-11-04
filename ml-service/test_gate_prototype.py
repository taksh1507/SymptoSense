import sys
sys.path.insert(0, 'ml-service')
import json
from pathlib import Path
import numpy as np

from ml_pipeline.ddxplus_data import encode_patient
from ml_pipeline.model_input import predict_proba
from disease_inference import map_symptoms, load_bundle, disease_safety_floor, URGENCY_RANK

bundle = load_bundle()

def evaluate_evidence_quality(raw_symptoms, used_tokens, ignored_symptoms, top3, confidence, margin):
    reasons = []
    followups = []
    within_scope = True
    evidence_quality = 'sufficient'
    scope_note = None

    normalized_raw = {s.lower().strip() for s in raw_symptoms}
    used_set = set(used_tokens)

    # 1. Ignored symptoms check
    if ignored_symptoms:
        reasons.append(f"Ignored unsupported symptoms: {', '.join(ignored_symptoms)}")

    # 2. Acute Gastroenteritis / Enteric syndrome detection
    # Diarrhea (E_51) + (Nausea/Vomiting E_148/E_211 or Belly Pain E_55_@_V_187)
    # and no chest pain / ischemic heart features
    has_diarrhea = 'E_51' in used_set or 'diarrhea' in normalized_raw
    has_vomit_nausea = 'E_148' in used_set or 'E_211' in used_set or any(s in normalized_raw for s in ['nausea', 'vomiting'])
    has_belly_pain = 'E_55_@_V_187' in used_set or any(s in normalized_raw for s in ['stomach_pain', 'abdominal_pain', 'stomach_ache'])
    has_chest_urgency = any(t in used_set for t in ['E_14', 'E_55_@_V_101', 'E_66'])

    if (has_diarrhea and (has_vomit_nausea or has_belly_pain)) or (has_vomit_nausea and has_belly_pain and not has_chest_urgency):
        within_scope = False
        evidence_quality = 'out_of_scope_syndrome'
        scope_note = "Common gastrointestinal infections (such as viral gastroenteritis or food poisoning) are not represented in the 49 acute conditions of this benchmark model. Predictions reflect synthetic emergency hospitalizations rather than typical primary-care presentations."
        followups.extend([
            "Stay hydrated with oral rehydration solutions and water.",
            "Monitor for red flags such as persistent inability to keep liquids down, severe dehydrating weakness, or high fever.",
            "Consult a primary care physician if diarrhea or vomiting lasts more than 48 hours."
        ])
        reasons.append("Clinical presentation resembles acute gastroenteritis / enteritis (outside model scope)")

    # 3. Uncomplicated Headache detection
    # Headache (E_55_@_V_89) without cluster headache specific autonomic signs (larmes, rhinorrhea)
    has_headache = 'E_55_@_V_89' in used_set or 'headache' in normalized_raw
    has_cluster_signs = any(t in used_set for t in ['E_140', 'E_181']) and ('E_55_@_V_166' in used_set or 'E_55_@_V_167' in used_set)
    if has_headache and not has_cluster_signs and len(used_set) <= 3:
        within_scope = False
        evidence_quality = 'out_of_scope_syndrome'
        scope_note = "Primary headache disorders (tension headache, migraine) are outside the 49 acute conditions in this benchmark model. DDXPlus only supports cluster headache with autonomic facial symptoms."
        followups.extend([
            "Rest in a quiet, dimly lit room and maintain hydration.",
            "Track headache triggers, frequency, and severity.",
            "Seek medical attention if the headache is sudden and extraordinarily severe ('thunderclap'), or accompanied by stiff neck, fever, or confusion."
        ])
        reasons.append("Clinical presentation resembles primary headache (migraine / tension headache outside model scope)")

    # 4. Specificity & Limited information check
    limited_info = len(used_tokens) < 3
    if limited_info:
        if evidence_quality == 'sufficient':
            evidence_quality = 'limited_information'
        reasons.append(f"Insufficient symptom count: only {len(used_tokens)} evidence tokens available (minimum 3 required for differential)")
        followups.append("Provide additional details about duration, severity, and associated symptoms to narrow down possibilities.")

    # 5. Model Uncertainty & Margin check
    uncertain_prob = confidence < 0.50
    narrow_margin = margin < 0.10
    if uncertain_prob:
        if evidence_quality == 'sufficient':
            evidence_quality = 'low_differentiation'
        reasons.append(f"Top calibrated probability ({confidence*100:.1f}%) is below the 50% majority threshold")
    if narrow_margin:
        reasons.append(f"Margin between top two conditions ({margin*100:.1f}%) is narrow (< 10%)")

    # Gate decision
    is_confident = bool(
        within_scope
        and not limited_info
        and not uncertain_prob
        and not narrow_margin
        and evidence_quality == 'sufficient'
    )
    is_uncertain = not is_confident

    return {
        'within_model_scope': within_scope,
        'evidence_quality': evidence_quality,
        'scope_note': scope_note,
        'is_confident': is_confident,
        'is_uncertain': is_uncertain,
        'gate_reasons': reasons,
        'suggested_followups': followups
    }

cases = [
    ('Case 1: Common respiratory', ['fever', 'cough', 'runny_nose', 'sore_throat']),
    ('Case 2: Gastrointestinal', ['stomach_pain', 'nausea', 'vomiting', 'diarrhea']),
    ('Case 3: Headache', ['headache', 'light_sensitivity', 'nausea']),
    ('Case 4: Respiratory concern', ['fever', 'persistent_cough', 'shortness_of_breath']),
    ('Case 5: Urinary symptoms', ['burning_urination', 'frequent_urination', 'lower_abdominal_discomfort']),
    ('Case 6: Ambiguous symptoms', ['fever', 'cough', 'stomach_pain']),
    ('Case 7: Minimal evidence', ['headache']),
    ('Case 8: Unrecognized symptoms', ['quantum_fluctuations', 'cosmic_resonance']),
]

for name, symptoms in cases:
    print(f'==============================\n{name}\nSymptoms: {symptoms}')
    used, ignored, mapped = map_symptoms(symptoms, bundle['known_tokens'], bundle['vocabulary'])
    if not used:
        print('-> ABSTAINED (HTTP 422: No known symptoms)\n')
        continue

    row = {'AGE': 35.0, 'SEX': 'unknown', 'EVIDENCES': repr(used)}
    values = encode_patient(row, bundle['feature_columns'])
    vector = np.zeros(len(bundle['feature_columns']), dtype=np.float32)
    col_index = {n: i for i, n in enumerate(bundle['feature_columns'])}
    for k, v in values.items(): vector[col_index[k]] = v
    probs = predict_proba(bundle['model'], vector)[0]
    order = np.argsort(probs)[::-1]
    top3 = [{'disease': str(bundle['encoder'].classes_[i]), 'probability': float(probs[i])} for i in order[:3]]
    conf = float(top3[0]['probability'])
    second = float(top3[1]['probability'])
    margin = conf - second

    gate = evaluate_evidence_quality(symptoms, used, ignored, top3, conf, margin)
    print(f"Top-1: {top3[0]['disease']} ({conf*100:.1f}%), Top-2: {top3[1]['disease']} ({second*100:.1f}%)")
    print(f"Within Scope: {gate['within_model_scope']}")
    print(f"Evidence Quality: {gate['evidence_quality']}")
    print(f"Confident: {gate['is_confident']}, Uncertain: {gate['is_uncertain']}")
    print(f"Gate Reasons: {gate['gate_reasons']}")
    if gate['scope_note']:
        print(f"Scope Note: {gate['scope_note']}")

    # Emergency safety floor test:
    safety_floor, safety_conds = disease_safety_floor(top3)
    model_urgency = 'Low'
    # GATED safety floor:
    if gate['within_model_scope'] and gate['is_confident']:
        effective_floor = safety_floor
    else:
        effective_floor = None
    override = any(s in ['chest_pain'] for s in symptoms)
    final_urgency = max([model_urgency, effective_floor or 'Low', 'High' if override else 'Low'], key=URGENCY_RANK.get)
    print(f"Raw Safety Floor: {safety_floor} (conditions: {safety_conds})")
    print(f"Effective Gated Floor: {effective_floor}")
    print(f"Final Urgency: {final_urgency}\n")
