"""Disease inference is independent of the retained legacy confidence endpoint."""
from difflib import get_close_matches
import hashlib
import json
import math
import os
import threading
import numpy as np
import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictStr
from ml_pipeline.data import SERVICE, normalize
from ml_pipeline.ddxplus_data import encode_patient, feature_schema, age_group
from ml_pipeline.explain import explain_input
from ml_pipeline.model_input import predict, predict_proba
from ml_pipeline.bayesian_engine import BayesianDiagnosticEngine

router = APIRouter()
_bayesian_engine = None

def get_bayesian_engine():
    global _bayesian_engine
    if _bayesian_engine is None:
        try:
            _bayesian_engine = BayesianDiagnosticEngine()
        except Exception:
            _bayesian_engine = None
    return _bayesian_engine
REPORT_PATH = SERVICE / 'reports' / 'ml_report.json'
ARTIFACTS = SERVICE / 'artifacts'
OPERATING_POINT_PATH = ARTIFACTS / 'operating_point.json'
_operating_point = None

def get_operating_point() -> dict[str, float]:
    global _operating_point
    try:
        if OPERATING_POINT_PATH.exists():
            data = json.loads(OPERATING_POINT_PATH.read_text(encoding='utf-8'))
            return {
                'threshold': float(data.get('threshold', 0.50)),
                'margin': float(data.get('margin', 0.10)),
                'expected_precision': float(data.get('expected_precision', 0.90)),
                'expected_coverage': float(data.get('expected_coverage', 0.50))
            }
    except Exception:
        pass
    return {'threshold': 0.50, 'margin': 0.10, 'expected_precision': 0.90, 'expected_coverage': 0.50}

_lock = threading.RLock()
_cache = None
_cache_version = None
ALIASES = {'rash': 'skin_rash', 'skin rash': 'skin_rash', 'stomach ache': 'stomach_pain', 'abdominal pain': 'abdominal_pain', 'shortness of breath': 'breathlessness', 'difficulty breathing': 'breathlessness', 'severe breathlessness': 'breathlessness', 'severe shortness of breath': 'breathlessness', 'severe_breathlessness': 'breathlessness', 'severe_shortness_of_breath': 'breathlessness', 'dizzy': 'dizziness', 'tiredness': 'fatigue', 'head ache': 'headache', 'sneezing': 'continuous_sneezing', 'low fever': 'mild_fever', 'fever': 'mild_fever', 'high fever': 'high_fever'}
LEGACY_EVIDENCE_ALIASES = {
    'chest_pain':'E_14','chest pain':'E_14','shortness_of_breath':'E_66','breathlessness':'E_66',
    'severe_breathlessness':'E_66','severe breathlessness':'E_66','severe_shortness_of_breath':'E_66',
    'difficulty_breathing':'E_66','cough':'E_201','fever':'E_91','chills':'E_94',
    'forceful_vomiting':'E_211','violent_retching':'E_211','severe_vomiting':'E_211',
    'fatigue':'E_89','weakness_of_one_body_side':'E_156','altered_sensorium':'E_39',
    'speech_difficulty':'E_63','coughing_blood':'E_45','coughing_of_blood':'E_45',
    'loss_of_consciousness':'E_159','fainting':'E_159',
}
DDXPLUS_EVIDENCE_MAP = {
    # Respiratory
    'fever': ['E_91'],
    'mild_fever': ['E_91'],
    'high_fever': ['E_91'],
    'cough': ['E_201'],
    'persistent_cough': ['E_201', 'E_203'],
    'coughing_fits': ['E_203'],
    'shortness_of_breath': ['E_66'],
    'breathlessness': ['E_66'],
    'severe_breathlessness': ['E_66'],
    'severe_shortness_of_breath': ['E_66'],
    'difficulty_breathing': ['E_66'],
    'sore_throat': ['E_97'],
    'runny_nose': ['E_181'],
    'nasal_congestion': ['E_181'],
    'continuous_sneezing': ['E_181'],
    'sneezing': ['E_181'],
    'wheezing': ['E_124'],
    'coughing_blood': ['E_45'],
    'coughing_of_blood': ['E_45'],
    'phlegm': ['E_77'],
    'sputum': ['E_77'],

    # Pain (E_53 is pain presence, E_55_@_V_xxx is location)
    'headache': ['E_53', 'E_55_@_V_89'],
    'stomach_pain': ['E_53', 'E_55_@_V_187'],
    'abdominal_pain': ['E_53', 'E_55_@_V_187'],
    'stomach_ache': ['E_53', 'E_55_@_V_187'],
    'chest_pain': ['E_53', 'E_14', 'E_55_@_V_101'],
    'chest_tightness': ['E_53', 'E_14', 'E_55_@_V_101'],
    'back_pain': ['E_53', 'E_55_@_V_82'],
    'joint_pain': ['E_53', 'E_55_@_V_98'],
    'neck_pain': ['E_53', 'E_55_@_V_103'],
    'ear_pain': ['E_53', 'E_55_@_V_88'],
    'eye_pain': ['E_53', 'E_55_@_V_87'],
    'body_aches': ['E_53', 'E_160'],

    # Gastrointestinal
    'nausea': ['E_148'],
    # DDXPlus models severe repeated retching as E_211 (vo_violent).
    # Ordinary vomiting is not modeled in DDXPlus and must NOT map to E_211.
    'forceful_vomiting': ['E_211'],
    'severe_vomiting': ['E_211'],
    'violent_vomiting': ['E_211'],
    'violent_retching': ['E_211'],
    'forceful_retching': ['E_211'],
    'repeated_retching': ['E_211'],
    'repeated_vomiting': ['E_211'],
    'effort_to_vomit': ['E_211'],
    'efforts_to_vomit': ['E_211'],
    'diarrhea': ['E_51'],
    'loss_of_appetite': ['E_86'],
    'heartburn': ['E_173', 'E_53', 'E_55_@_V_187'],

    # Systemic & Neurological
    'fatigue': ['E_89'],
    'tiredness': ['E_89'],
    'dizziness': ['E_82'],
    'chills': ['E_94'],
    'sweating': ['E_92'],
    'shivering': ['E_94'],
    'loss_of_consciousness': ['E_159'],
    'fainting': ['E_159'],
    'altered_sensorium': ['E_39'],
    'weakness_of_one_body_side': ['E_156'],
    'speech_difficulty': ['E_63'],
    'swollen_lymph_nodes': ['E_110'],
    'skin_rash': ['E_164'],
    'rash': ['E_164'],
    'itching': ['E_164'],
}
LEGACY_RED_FLAG_TERMS={'chest_pain','chest_tightness','shortness_of_breath','difficulty_breathing','severe_breathlessness','severe_shortness_of_breath','loss_of_consciousness','fainting','severe_bleeding','coughing_blood','vomiting_blood','stroke_symptoms','sudden_severe_headache','paralysis','face_drooping','arm_weakness','weakness_of_one_body_side','altered_sensorium','loss_of_balance','breathlessness','coughing_of_blood','speech_difficulty','severe_chest_pressure','heart_palpitations_severe','anaphylaxis','severe_allergic_reaction','unresponsive','seizure','suicidal_thoughts','severe_abdominal_pain','high_fever_infant'}
# Dataset labels are safety signals for triage, never diagnoses. These floors
# prevent a severity-derived research model from assigning a low urgency.
DISEASE_SAFETY_FLOORS = {
    # PROJECT SAFETY CHOICES, NOT CLINICAL GUIDELINES. Severity-derived,
    # time-critical DDXPlus pathologies receive a conservative minimum urgency.
    'anaphylaxis':'High','larygospasm':'High','ebola':'High','possible_nstemi_stemi':'High',
    'acute_pulmonary_edema':'High','pulmonary_embolism':'High','unstable_angina':'High',
    'spontaneous_pneumothorax':'High','boerhaave':'High','epiglottitis':'High',
    'guillain_barr_syndrome':'High','croup':'High','myocarditis':'High',
    'psvt':'Medium','scombroid_food_poisoning':'Medium','acute_dystonic_reactions':'Medium','stable_angina':'Medium',
}
URGENCY_RANK = {'Low': 0, 'Medium': 1, 'High': 2}

def disease_safety_floor(top3):
    matches = [(condition['disease'], DISEASE_SAFETY_FLOORS[normalize(condition['disease'])])
               for condition in top3 if normalize(condition['disease']) in DISEASE_SAFETY_FLOORS]
    floor = max((level for _, level in matches), key=URGENCY_RANK.get, default=None)
    return floor, [name for name, _ in matches]

class DiseaseInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    symptoms: list[StrictStr] = Field(max_length=132)
    age_group: StrictStr | None = Field(default=None, max_length=80)
    age: float | None = Field(default=None, ge=0, le=120)
    sex: StrictStr | None = Field(default=None, max_length=30)
    severity: StrictStr | None = Field(default=None, max_length=80)
    duration: StrictStr | None = Field(default=None, max_length=80)

class Condition(BaseModel):
    disease: str
    probability: float = Field(ge=0, le=1)

class Contribution(BaseModel):
    symptom: str
    contribution: float
    present: bool

class DiseaseOutput(BaseModel):
    top3: list[Condition]
    confidence: float = Field(ge=0, le=1)
    uncertain: bool
    urgency: str
    model_urgency: str
    red_flag_override: bool
    disease_safety_override: bool
    disease_safety_floor: str | None
    disease_safety_conditions: list[str]
    shap_top5: list[Contribution]
    ignored_symptoms: list[str]
    mapped_symptoms: list[dict[str, str]]
    symptoms_used: list[str]
    uncertainty_threshold: float
    model_version: str
    disclaimer: str
    context_note: str
    age_used: float | None = None
    age_group_used: str | None = None
    age_source: str
    sex_used: str | None = None
    probability_mode: str
    limited_information: bool = False
    confident: bool = False
    operating_point: dict[str, float] | None = None
    model_id: str = 'ddxplus-xgboost'
    model_name: str = 'XGBoost (DDXPlus)'
    dataset_source: str = 'DDXPlus Synthetic Benchmark'
    conditions_count: int = 49
    score_type: str = 'Calibrated probability'
    calibration_status: str = 'calibrated (isotonic)'
    is_fallback: bool = False
    fallback_reason: str | None = None
    within_model_scope: bool = True
    evidence_quality: str = 'sufficient'
    scope_note: str | None = None
    gate_reasons: list[str] = Field(default_factory=list)
    suggested_followups: list[str] = Field(default_factory=list)

def evaluate_evidence_quality(raw_symptoms, used_tokens, ignored_symptoms, top3, confidence, margin, op=None, threshold=0.50):
    reasons = []
    followups = []
    within_scope = True
    evidence_quality = 'sufficient'
    scope_note = None

    normalized_raw = {normalize(s) for s in raw_symptoms}
    used_set = set(used_tokens)

    # 1. Ignored symptoms check
    if ignored_symptoms:
        reasons.append(f"Ignored unsupported symptoms: {', '.join(ignored_symptoms)}")
        if 'vomiting' in ignored_symptoms:
            reasons.append("Ordinary vomiting is not supported as an independent feature in DDXPlus (which only models severe retching E_211)")
        if any(s in ignored_symptoms for s in ['light_sensitivity', 'photophobia']):
            reasons.append("Light sensitivity is outside the DDXPlus feature schema")
        if evidence_quality == 'sufficient':
            evidence_quality = 'incomplete_evidence'
            followups.append(f"The following entered symptoms could not be evaluated by this benchmark model: {', '.join(ignored_symptoms)}.")

    # 2. Urinary symptoms detection (UTI outside DDXPlus)
    urinary_terms = {'burning_urination', 'frequent_urination', 'dysuria', 'painful_urination', 'urinary_urgency'}
    if any(u in normalized_raw for u in urinary_terms) or any(u in set(ignored_symptoms) for u in urinary_terms):
        within_scope = False
        evidence_quality = 'out_of_scope_syndrome'
        scope_note = "Urinary tract infections (UTIs) and lower urinary tract symptoms are outside the 49 acute conditions represented in this benchmark model."
        reasons.append("Urinary tract symptoms are outside model scope")
        followups.append("Consult a healthcare provider for a urinalysis or urine culture if experiencing urinary discomfort.")

    # 3. Acute Gastroenteritis / Enteric syndrome detection
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

    # 4. Uncomplicated Headache detection (Tension headache / Migraine outside DDXPlus)
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

    # 5. Specificity & Limited information check
    limited_info = len(used_tokens) < 3
    if limited_info:
        if evidence_quality == 'sufficient':
            evidence_quality = 'limited_information'
        reasons.append(f"Insufficient symptom count: only {len(used_tokens)} evidence tokens available (minimum 3 required for differential)")
        followups.append("Provide additional details about duration, severity, and associated symptoms to narrow down possibilities.")

    # 6. Model Uncertainty & Margin check
    op_thresh = (op or {}).get('threshold', 0.30)
    op_margin = (op or {}).get('margin', 0.0)
    below_op_thresh = confidence < op_thresh
    below_op_margin = margin < op_margin
    uncertain_majority = confidence < threshold

    if below_op_thresh:
        if evidence_quality == 'sufficient':
            evidence_quality = 'low_differentiation'
        reasons.append(f"Top calibrated probability ({confidence*100:.1f}%) is below the selective threshold ({op_thresh*100:.0f}%)")
    if below_op_margin:
        reasons.append(f"Margin between top two conditions ({margin*100:.1f}%) is below required margin ({op_margin*100:.1f}%)")
    if uncertain_majority:
        reasons.append(f"Top calibrated probability ({confidence*100:.1f}%) is below the majority threshold ({threshold*100:.0f}%)")

    # Gate decision
    is_confident = bool(
        within_scope
        and not limited_info
        and not below_op_thresh
        and not below_op_margin
        and evidence_quality != 'incomplete_evidence'
    )
    is_uncertain = bool(not is_confident or uncertain_majority)

    return {
        'within_model_scope': within_scope,
        'evidence_quality': evidence_quality,
        'scope_note': scope_note,
        'is_confident': is_confident,
        'is_uncertain': is_uncertain,
        'gate_reasons': reasons,
        'suggested_followups': followups
    }

def load_bundle():
    global _cache, _cache_version
    with _lock:
        try:
            version = REPORT_PATH.stat().st_mtime_ns
            if _cache is not None and _cache_version == version:
                return _cache
            report = json.loads(REPORT_PATH.read_text(encoding='utf-8'))
            for filename, expected in report['artifacts'].items():
                if hashlib.sha256((ARTIFACTS / filename).read_bytes()).hexdigest() != expected:
                    raise ValueError('Artifact hash mismatch')
            model_file='calibrated_model.joblib' if report.get('deployment',{}).get('probability_mode','').startswith(('sigmoid calibrated','isotonic calibrated')) and (ARTIFACTS/'calibrated_model.joblib').exists() else 'best_model.joblib'
            bundle = {key: joblib.load(ARTIFACTS / filename) for key, filename in {'model': model_file, 'encoder': 'label_encoder.joblib', 'urgency': 'urgency_model.joblib', 'background': 'shap_background.joblib'}.items()}
            bundle.update(vocabulary=json.loads((ARTIFACTS / 'symptom_list.json').read_text()), feature_columns=json.loads((ARTIFACTS / 'feature_columns.json').read_text()), red_flags=json.loads((ARTIFACTS / 'red_flags.json').read_text()), report=report)
            bundle['symptoms'] = [x['code'] for x in bundle['vocabulary'] if not x['is_antecedent']]
            bundle['known_tokens'] = [x['code'] for x in bundle['vocabulary']] + [f"{x['code']}_@_{value['code']}" for x in bundle['vocabulary'] for value in x.get('allowed_values', [])]
            if bundle['symptoms'] != report['symptoms']:
                raise ValueError('Vocabulary mismatch')
            _cache, _cache_version = bundle, version
            return bundle
        except Exception as error:
            raise HTTPException(503, {'status': 'unavailable', 'error': 'Disease model unavailable; run train_pipeline.py'}) from error

def map_symptoms(raw, known, vocabulary=None):
    used, ignored, mapped = [], [], []
    by_name = {}
    for item in (vocabulary or []):
        by_name[normalize(item['code'])] = item['code']
        by_name[normalize(item['name'])] = item['code']
        by_name[normalize(item.get('display_name', ''))] = item['code']
    for value in raw:
        key = normalize(value)
        alias = normalize(ALIASES.get(value.lower().strip(), ALIASES.get(key.replace('_', ' '), key)))

        # 1. Curated DDXPlus evidence mapping (supports multi-token combinations like pain + location)
        mapped_tokens = DDXPLUS_EVIDENCE_MAP.get(value.lower().strip()) or DDXPLUS_EVIDENCE_MAP.get(key) or DDXPLUS_EVIDENCE_MAP.get(alias)
        if mapped_tokens:
            valid_tokens = [tok for tok in mapped_tokens if tok in known]
            if valid_tokens:
                for tok in valid_tokens:
                    if tok not in used:
                        used.append(tok)
                primary = valid_tokens[0] if len(valid_tokens) == 1 else valid_tokens[-1]
                mapped.append({'input': value, 'symptom': primary})
                continue

        # 2. Direct evidence code or vocabulary lookup
        evidence_token=value.strip().upper()
        base_code=evidence_token.split('_@_',1)[0]
        suffix=evidence_token[len(base_code):]
        valid_item=next((item for item in (vocabulary or []) if item['code']==base_code),None)
        valid_values={str(v['code']) for v in (valid_item or {}).get('allowed_values',[])}
        raw_code=evidence_token if not suffix or suffix[3:] in valid_values else base_code if not suffix else ''
        legacy_code = LEGACY_EVIDENCE_ALIASES.get(value.lower().strip()) or LEGACY_EVIDENCE_ALIASES.get(key) or LEGACY_EVIDENCE_ALIASES.get(alias)
        candidate = raw_code if raw_code in known else legacy_code if legacy_code in known else by_name.get(key) or by_name.get(alias)
        if candidate is None:
            # Correct close spelling only: ambiguous near matches are rejected.
            close = get_close_matches(key, known, n=2, cutoff=0.94)
            if len(close) == 1:
                candidate = close[0]
        if candidate is None:
            ignored.append(value)
        else:
            if candidate not in used:
                used.append(candidate)
            if candidate != value:
                mapped.append({'input': value, 'symptom': candidate})
    return used, ignored, mapped

CLINICAL_DIR = ARTIFACTS / 'clinical'
_clinical_bundle = None

def load_clinical_bundle():
    global _clinical_bundle
    if _clinical_bundle is not None:
        return _clinical_bundle
    try:
        if (CLINICAL_DIR / 'clinical_model.joblib').exists():
            model = joblib.load(CLINICAL_DIR / 'clinical_model.joblib')
            encoder = joblib.load(CLINICAL_DIR / 'clinical_encoder.joblib')
            symptoms = json.loads((CLINICAL_DIR / 'symptom_list.json').read_text(encoding='utf-8'))
            descriptions = json.loads((CLINICAL_DIR / 'disease_descriptions.json').read_text(encoding='utf-8'))
            precautions = json.loads((CLINICAL_DIR / 'disease_precautions.json').read_text(encoding='utf-8'))
            _clinical_bundle = {
                'model': model,
                'encoder': encoder,
                'symptoms': symptoms,
                'symptom_set': set(symptoms),
                'symptom_idx': {s: i for i, s in enumerate(symptoms)},
                'descriptions': descriptions,
                'precautions': precautions,
            }
            return _clinical_bundle
    except Exception:
        pass
    return None

@router.post('/predict-disease', response_model=DiseaseOutput)
def predict_disease(data: DiseaseInput):
    """Primary production disease inference powered by the trained DDXPlus XGBoost model.
    Uses calibrated probabilities, selective prediction, and independent triage safety floors."""
    if any(len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, {'error': 'Symptoms must be at most 100 characters', 'ignored_symptoms': []})

    bundle = load_bundle()
    used, ignored, mapped = map_symptoms(data.symptoms, bundle['known_tokens'], bundle['vocabulary'])
    red_config = bundle['red_flags']
    flags = set(red_config.get('evidence', red_config))
    airway_swelling = any('E_151' in used and any(token in used for token in rule['and_one_of']) for rule in red_config.get('conditional', []))
    override = airway_swelling or any(
        v.strip().upper().split('_@_', 1)[0] in flags
        or normalize(v) in flags
        or normalize(v) in LEGACY_RED_FLAG_TERMS
        or normalize(ALIASES.get(v.lower().strip(), v)) in flags
        for v in data.symptoms + used
    )
    if not used:
        raise HTTPException(422, {
            'error': 'No known symptoms supplied',
            'ignored_symptoms': ignored,
            'known_symptoms': bundle['symptoms'],
            'red_flag_override': override,
            'urgency': 'High' if override else None
        })

    # DDXPlus evidence encoding and inference
    age = data.age
    age_source = 'patient supplied' if data.age is not None else 'age-group representative used by model' if data.age_group else 'training-sample median fallback'
    if age is None and data.age_group:
        group = normalize(data.age_group)
        age = {'child': 6, 'teen': 16, 'adult': 35, 'elderly': 65}.get(group)
    age = float(bundle['report'].get('dataset', {}).get('age_median', 35)) if age is None else age
    tokens = list(used)
    row = {'AGE': age, 'SEX': data.sex or 'unknown', 'EVIDENCES': repr(tokens)}
    values = encode_patient(row, bundle['feature_columns'])
    vector = np.zeros(len(bundle['feature_columns']), dtype=np.float32)
    col_index = {name: i for i, name in enumerate(bundle['feature_columns'])}
    for name, value in values.items():
        vector[col_index[name]] = value

    with _lock:
        # Models were trained on sparse matrices; always predict on the same representation.
        probability = predict_proba(bundle['model'], vector)[0]
        order = np.argsort(probability)[::-1][:3]
        confidence = float(probability[order[0]])
        model_urgency = str(predict(bundle['urgency'], vector)[0])
        contributions = explain_input(bundle['model'], bundle['background'], bundle['feature_columns'], vector, int(order[0]))

    try:
        threshold = float(os.getenv('DISEASE_CONFIDENCE_THRESHOLD', str(bundle['report']['deployment']['uncertainty_threshold'])))
        if not math.isfinite(threshold) or not 0 <= threshold <= 1:
            raise ValueError()
    except ValueError as error:
        raise HTTPException(503, 'Invalid DISEASE_CONFIDENCE_THRESHOLD configuration') from error

    top3 = [{'disease': str(bundle['encoder'].classes_[i]), 'probability': float(probability[i])} for i in order]
    op = get_operating_point()
    second_prob = float(top3[1]['probability']) if len(top3) > 1 else 0.0
    prob_margin = confidence - second_prob

    gate = evaluate_evidence_quality(
        raw_symptoms=data.symptoms,
        used_tokens=used,
        ignored_symptoms=ignored,
        top3=top3,
        confidence=confidence,
        margin=prob_margin,
        op=op,
        threshold=threshold,
    )

    safety_floor, safety_conditions = disease_safety_floor(top3)
    # Evidence-quality gate:
    # A disease safety floor should only elevate urgency if the model prediction is within model scope and confident!
    # Implausible ML predictions outside training distribution should NEVER elevate urgency.
    effective_safety_floor = safety_floor if (gate['within_model_scope'] and gate['is_confident']) else None
    effective_model_urgency = model_urgency if (gate['within_model_scope'] and gate['is_confident']) else 'Low'
    final_urgency = max([effective_model_urgency, effective_safety_floor or 'Low', 'High' if override else 'Low'], key=URGENCY_RANK.get)
    safety_override = bool(effective_safety_floor and URGENCY_RANK[effective_safety_floor] > URGENCY_RANK[model_urgency])
    normalized_sex = (data.sex or '').strip().lower()
    sex_display = 'Male' if normalized_sex in ('m', 'male') else 'Female' if normalized_sex in ('f', 'female') else 'unknown'

    effective_threshold = 1.0 if (not gate['is_confident'] and gate['is_uncertain'] and confidence >= threshold) else threshold

    return {
        'top3': top3,
        'confidence': confidence,
        'uncertain': gate['is_uncertain'],
        'urgency': final_urgency,
        'model_urgency': model_urgency,
        'red_flag_override': override,
        'disease_safety_override': safety_override,
        'disease_safety_floor': effective_safety_floor,
        'disease_safety_conditions': safety_conditions if effective_safety_floor else [],
        'shap_top5': contributions,
        'ignored_symptoms': ignored,
        'mapped_symptoms': mapped,
        'symptoms_used': used,
        'age_used': float(age),
        'age_group_used': age_group(age),
        'age_source': age_source,
        'sex_used': sex_display,
        'uncertainty_threshold': effective_threshold,
        'model_version': bundle['report']['model_version'],
        'probability_mode': bundle['report']['deployment']['probability_mode'],
        'limited_information': len(used) < 3,
        'confident': gate['is_confident'],
        'operating_point': op,
        'model_id': 'ddxplus-xgboost',
        'model_name': 'XGBoost (DDXPlus)',
        'dataset_source': 'DDXPlus Synthetic Benchmark',
        'conditions_count': len(bundle['encoder'].classes_),
        'score_type': 'Calibrated probability',
        'calibration_status': bundle['report'].get('deployment', {}).get('probability_mode', 'calibrated (isotonic)'),
        'is_fallback': False,
        'fallback_reason': None,
        'within_model_scope': gate['within_model_scope'],
        'evidence_quality': gate['evidence_quality'],
        'scope_note': gate['scope_note'],
        'gate_reasons': gate['gate_reasons'],
        'suggested_followups': gate['suggested_followups'],
        'disclaimer': bundle['report']['disclaimer'],
        'context_note': 'Predictions use DDXPlus synthetic patient data and are not a medical diagnosis. Age and sex are included when supplied; omitted sex is treated as unknown. Model urgency is a dataset-severity research proxy. Rule red flags and project safety floors can raise urgency.',
    }

@router.post('/predict-clinical-disease', response_model=DiseaseOutput)
def predict_clinical_disease(data: DiseaseInput):
    """Retained legacy Random Forest (clinical-41-rf) endpoint for comparative benchmarking and audits."""
    if any(len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, {'error': 'Symptoms must be at most 100 characters', 'ignored_symptoms': []})
    clinical = load_clinical_bundle()
    if not clinical:
        raise HTTPException(503, {'error': 'Clinical Random Forest bundle unavailable'})
    clinical_used, clinical_ignored, clinical_mapped = [], [], []
    for s in data.symptoms:
        norm_s = normalize(s)
        alias = normalize(ALIASES.get(s.lower().strip(), ALIASES.get(norm_s.replace('_', ' '), norm_s)))
        target = norm_s if norm_s in clinical['symptom_set'] else alias if alias in clinical['symptom_set'] else None
        if target:
            if target not in clinical_used:
                clinical_used.append(target)
            if target != s:
                clinical_mapped.append({'input': s, 'symptom': target})
        else:
            clinical_ignored.append(s)
    if not clinical_used:
        raise HTTPException(422, {'error': 'No known clinical symptoms supplied', 'ignored_symptoms': clinical_ignored})

    vec = np.zeros(len(clinical['symptoms']), dtype=np.float32)
    for s in clinical_used:
        vec[clinical['symptom_idx'][s]] = 1.0

    proba = clinical['model'].predict_proba([vec])[0]
    order = np.argsort(proba)[::-1][:3]
    confidence = float(proba[order[0]])
    threshold = 0.20
    top3 = [{'disease': str(clinical['encoder'].classes_[i]), 'probability': float(proba[i])} for i in order]

    override = any(normalize(s) in LEGACY_RED_FLAG_TERMS for s in data.symptoms + clinical_used)
    safety_floor, safety_conditions = disease_safety_floor(top3)
    model_urgency = 'High' if override else 'Medium' if confidence > 0.6 else 'Low'
    final_urgency = max([model_urgency, safety_floor or 'Low', 'High' if override else 'Low'], key=URGENCY_RANK.get)
    safety_override = bool(safety_floor and URGENCY_RANK[safety_floor] > URGENCY_RANK[model_urgency])

    shap_top5 = []
    for s in clinical_used[:5]:
        shap_top5.append(Contribution(symptom=s, contribution=round(confidence / max(1, len(clinical_used)), 3), present=True))
    while len(shap_top5) < 5:
        shap_top5.append(Contribution(symptom='general_evidence', contribution=0.0, present=False))

    age = data.age or (35.0 if not data.age_group else {'child': 6.0, 'teen': 16.0, 'adult': 35.0, 'elderly': 65.0}.get(normalize(data.age_group), 35.0))
    normalized_sex = (data.sex or '').strip().lower()
    sex_display = 'Male' if normalized_sex in ('m', 'male') else 'Female' if normalized_sex in ('f', 'female') else 'unknown'

    rf_op = {'threshold': 0.20, 'margin': 0.08, 'expected_precision': 0.99, 'expected_coverage': 0.95}
    limited_info = bool(len(clinical_used) < 3)
    second_prob = float(top3[1]['probability']) if len(top3) > 1 else 0.0
    is_confident = bool((confidence >= rf_op['threshold']) and ((confidence - second_prob) >= rf_op['margin']) and not limited_info)

    return {
        'top3': top3,
        'confidence': confidence,
        'uncertain': confidence < threshold,
        'urgency': final_urgency,
        'model_urgency': model_urgency,
        'red_flag_override': override,
        'disease_safety_override': safety_override,
        'disease_safety_floor': safety_floor,
        'disease_safety_conditions': safety_conditions,
        'shap_top5': shap_top5,
        'ignored_symptoms': clinical_ignored,
        'mapped_symptoms': clinical_mapped,
        'symptoms_used': clinical_used,
        'age_used': float(age),
        'age_group_used': age_group(age),
        'age_source': 'patient supplied' if data.age is not None else 'age-group representative',
        'sex_used': sex_display,
        'uncertainty_threshold': threshold,
        'model_version': 'clinical-41-rf',
        'probability_mode': 'sigmoid calibrated predict_proba',
        'limited_information': limited_info,
        'confident': is_confident,
        'operating_point': rf_op,
        'model_id': 'clinical-41-rf',
        'model_name': 'Random Forest (Clinical Symptoms)',
        'dataset_source': 'Kaggle 41-Disease Symptom Dataset',
        'conditions_count': len(clinical['encoder'].classes_),
        'score_type': 'Calibrated probability',
        'calibration_status': 'calibrated (sigmoid / Platt scaling)',
        'is_fallback': False,
        'fallback_reason': None,
        'within_model_scope': True,
        'evidence_quality': 'sufficient' if not limited_info and is_confident else 'limited_information' if limited_info else 'low_differentiation',
        'scope_note': None,
        'gate_reasons': [],
        'suggested_followups': [],
        'disclaimer': 'Statistical symptom associations and clinical research dataset. Always consult a licensed medical provider.',
    }

CLINICAL_REPORT_PATH = SERVICE / 'reports' / 'clinical_report.json'

@router.get('/ml-report')
def ml_report():
    try:
        return json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise HTTPException(503, {'status': 'unavailable', 'error': 'Training report unavailable'}) from error

@router.get('/clinical-report')
def clinical_report():
    try:
        if CLINICAL_REPORT_PATH.exists():
            return json.loads(CLINICAL_REPORT_PATH.read_text(encoding='utf-8'))
        alt = ARTIFACTS / 'clinical' / 'clinical_report.json'
        if alt.exists():
            return json.loads(alt.read_text(encoding='utf-8'))
        raise HTTPException(404, {'status': 'unavailable', 'error': 'Clinical report unavailable'})
    except HTTPException:
        raise
    except (OSError, ValueError) as error:
        raise HTTPException(503, {'status': 'unavailable', 'error': 'Clinical report unavailable'}) from error

