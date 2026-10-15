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
ALIASES = {'rash': 'skin_rash', 'skin rash': 'skin_rash', 'stomach ache': 'stomach_pain', 'abdominal pain': 'abdominal_pain', 'shortness of breath': 'breathlessness', 'difficulty breathing': 'breathlessness', 'dizzy': 'dizziness', 'tiredness': 'fatigue', 'head ache': 'headache', 'sneezing': 'continuous_sneezing', 'low fever': 'mild_fever'}
LEGACY_EVIDENCE_ALIASES = {
    'chest_pain':'E_14','chest pain':'E_14','shortness_of_breath':'E_66','breathlessness':'E_66',
    'difficulty_breathing':'E_66','cough':'E_201','fever':'E_91','chills':'E_94',
    'vomiting':'E_211','fatigue':'E_89','weakness_of_one_body_side':'E_156','altered_sensorium':'E_39',
    'speech_difficulty':'E_63','coughing_blood':'E_45','coughing_of_blood':'E_45',
    'loss_of_consciousness':'E_159','fainting':'E_159',
}
LEGACY_RED_FLAG_TERMS={'chest_pain','chest_tightness','shortness_of_breath','difficulty_breathing','loss_of_consciousness','fainting','severe_bleeding','coughing_blood','vomiting_blood','stroke_symptoms','sudden_severe_headache','paralysis','face_drooping','arm_weakness','weakness_of_one_body_side','altered_sensorium','loss_of_balance','breathlessness','coughing_of_blood','speech_difficulty','severe_chest_pressure','heart_palpitations_severe','anaphylaxis','severe_allergic_reaction','unresponsive','seizure','suicidal_thoughts','severe_abdominal_pain','high_fever_infant'}
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
    if any(len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, {'error': 'Symptoms must be at most 100 characters', 'ignored_symptoms': []})

    # First check if symptoms match the 41-disease clinical dataset
    clinical = load_clinical_bundle()
    clinical_used = []
    clinical_ignored = []
    clinical_mapped = []
    if clinical:
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

    if clinical and clinical_used:
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

        op = get_operating_point()
        limited_info = bool(len(clinical_used) < 3)
        second_prob = float(top3[1]['probability']) if len(top3) > 1 else 0.0
        is_confident = bool((confidence >= op['threshold']) and ((confidence - second_prob) >= op['margin']) and not limited_info)

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
            'probability_mode': 'uncalibrated predict_proba',
            'limited_information': limited_info,
            'confident': is_confident,
            'operating_point': op,
            'disclaimer': 'Statistical symptom associations and clinical research dataset. Always consult a licensed medical provider.',
            'context_note': 'Classified using the 41-disease clinical association model with doctor-verified precautions.',
        }

    # Check SymCat 801-Disease CDC Bayesian Knowledge Base
    bayesian = get_bayesian_engine()
    if bayesian:
        symcat_res = bayesian.infer(data.symptoms, top_k=3)
        if symcat_res and len(symcat_res) == 3:
            top3 = [{'disease': r['disease'], 'probability': float(r['probability'])} for r in symcat_res]
            confidence = float(top3[0]['probability'])
            threshold = 0.20
            override = any(normalize(s) in LEGACY_RED_FLAG_TERMS for s in data.symptoms)
            safety_floor, safety_conditions = disease_safety_floor(top3)
            model_urgency = symcat_res[0].get('urgency', 'Medium')
            final_urgency = max([model_urgency, safety_floor or 'Low', 'High' if override else 'Low'], key=URGENCY_RANK.get)
            safety_override = bool(safety_floor and URGENCY_RANK[safety_floor] > URGENCY_RANK[model_urgency])

            known_symptoms = set(bayesian.kb.get('symptoms', []))
            symcat_used = [s for s in data.symptoms if normalize(s) in known_symptoms] or [normalize(s) for s in data.symptoms]

            shap_top5 = []
            for s in symcat_used[:5]:
                shap_top5.append(Contribution(symptom=s, contribution=round(confidence / max(1, len(symcat_used)), 3), present=True))
            while len(shap_top5) < 5:
                shap_top5.append(Contribution(symptom='general_evidence', contribution=0.0, present=False))

            age = data.age or (35.0 if not data.age_group else {'child': 6.0, 'teen': 16.0, 'adult': 35.0, 'elderly': 65.0}.get(normalize(data.age_group), 35.0))
            normalized_sex = (data.sex or '').strip().lower()
            sex_display = 'Male' if normalized_sex in ('m', 'male') else 'Female' if normalized_sex in ('f', 'female') else 'unknown'

            op = get_operating_point()
            limited_info = bool(len(symcat_used) < 3)
            second_prob = float(top3[1]['probability']) if len(top3) > 1 else 0.0
            is_confident = bool((confidence >= op['threshold']) and ((confidence - second_prob) >= op['margin']) and not limited_info)

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
                'ignored_symptoms': [s for s in data.symptoms if s not in symcat_used],
                'mapped_symptoms': [{'input': s, 'symptom': normalize(s)} for s in data.symptoms if s != normalize(s)],
                'symptoms_used': symcat_used,
                'age_used': float(age),
                'age_group_used': age_group(age),
                'age_source': 'patient supplied' if data.age is not None else 'age-group representative',
                'sex_used': sex_display,
                'uncertainty_threshold': threshold,
                'model_version': 'symcat-cdc-801-bayesian',
                'probability_mode': 'uncalibrated predict_proba',
                'limited_information': limited_info,
                'confident': is_confident,
                'operating_point': op,
                'disclaimer': 'Statistical symptom associations from CDC outpatient database (801 conditions, 377 symptoms). Always consult a licensed medical provider.',
                'context_note': f"Classified across 801 CDC conditions using SymCat Bayesian clinical engine. Top candidate: {symcat_res[0]['disease']}.",
            }

    # Fallback to DDXPlus benchmark model for synthetic evidence codes
    bundle = load_bundle()
    if any(len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, {'error': 'Symptoms must be at most 100 characters', 'ignored_symptoms': []})
    used, ignored, mapped = map_symptoms(data.symptoms, bundle['known_tokens'], bundle['vocabulary'])
    red_config=bundle['red_flags']
    flags=set(red_config.get('evidence',red_config))
    airway_swelling=any('E_151' in used and any(token in used for token in rule['and_one_of']) for rule in red_config.get('conditional',[]))
    override = airway_swelling or any(v.strip().upper().split('_@_',1)[0] in flags or normalize(v) in flags or normalize(v) in LEGACY_RED_FLAG_TERMS or normalize(ALIASES.get(v.lower().strip(), v)) in flags for v in data.symptoms + used)
    if not used:
        raise HTTPException(422, {'error': 'No known symptoms supplied', 'ignored_symptoms': ignored, 'known_symptoms': bundle['symptoms'], 'red_flag_override': override, 'urgency': 'High' if override else None})
    # CSV evidence records use one token per affirmed item; categorical/multi-select
    # evidence values must therefore be supplied as E_n_@_V_n tokens.
    age = data.age
    age_source='patient supplied' if data.age is not None else 'age-group representative used by model' if data.age_group else 'training-sample median fallback'
    if age is None and data.age_group:
        group = normalize(data.age_group)
        age = {'child': 6, 'teen': 16, 'adult': 35, 'elderly': 65}.get(group)
    age = float(bundle['report'].get('dataset',{}).get('age_median',35)) if age is None else age
    tokens = list(used)
    row = {'AGE': age, 'SEX': data.sex or 'unknown', 'EVIDENCES': repr(tokens)}
    values = encode_patient(row, bundle['feature_columns'])
    vector = np.zeros(len(bundle['feature_columns']), dtype=np.float32)
    col_index = {name:i for i,name in enumerate(bundle['feature_columns'])}
    for name, value in values.items(): vector[col_index[name]] = value
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
    safety_floor, safety_conditions = disease_safety_floor(top3)
    final_urgency = max([model_urgency, safety_floor or 'Low', 'High' if override else 'Low'], key=URGENCY_RANK.get)
    safety_override = bool(safety_floor and URGENCY_RANK[safety_floor] > URGENCY_RANK[model_urgency])
    normalized_sex=(data.sex or '').strip().lower()
    sex_display='Male' if normalized_sex in ('m','male') else 'Female' if normalized_sex in ('f','female') else 'unknown'

    op = get_operating_point()
    limited_info = bool(len(used) < 3)
    second_prob = float(top3[1]['probability']) if len(top3) > 1 else 0.0
    is_confident = bool((confidence >= op['threshold']) and ((confidence - second_prob) >= op['margin']) and not limited_info)

    return {'top3': top3, 'confidence': confidence, 'uncertain': confidence < threshold, 'urgency': final_urgency, 'model_urgency': model_urgency, 'red_flag_override': override, 'disease_safety_override': safety_override, 'disease_safety_floor': safety_floor, 'disease_safety_conditions': safety_conditions, 'shap_top5': contributions, 'ignored_symptoms': ignored, 'mapped_symptoms': mapped, 'symptoms_used': used, 'age_used': float(age), 'age_group_used': age_group(age), 'age_source':age_source, 'sex_used': sex_display, 'uncertainty_threshold': threshold, 'model_version': bundle['report']['model_version'], 'probability_mode': bundle['report']['deployment']['probability_mode'], 'limited_information': limited_info, 'confident': is_confident, 'operating_point': op, 'disclaimer': bundle['report']['disclaimer'], 'context_note': 'Predictions use DDXPlus synthetic patient data and are not a medical diagnosis. Age and sex are included when supplied; omitted sex is treated as unknown. Model urgency is a dataset-severity research proxy. Rule red flags and project safety floors can raise urgency.'}

@router.get('/ml-report')
def ml_report():
    try:
        return json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise HTTPException(503, {'status': 'unavailable', 'error': 'Training report unavailable'}) from error
