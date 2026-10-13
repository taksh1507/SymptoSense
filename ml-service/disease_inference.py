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

router = APIRouter()
REPORT_PATH = SERVICE / 'reports' / 'ml_report.json'
ARTIFACTS = SERVICE / 'artifacts'
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
    symptoms: list[StrictStr] = Field(min_length=1, max_length=132)
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

@router.post('/predict-disease', response_model=DiseaseOutput)
def predict_disease(data: DiseaseInput):
    bundle = load_bundle()
    if any(not symptom.strip() or len(symptom) > 100 for symptom in data.symptoms):
        raise HTTPException(422, 'Symptoms must be non-empty strings of at most 100 characters')
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
        probability = bundle['model'].predict_proba(vector.reshape(1, -1))[0]
        order = np.argsort(probability)[::-1][:3]
        confidence = float(probability[order[0]])
        model_urgency = str(bundle['urgency'].predict(vector.reshape(1, -1))[0])
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
    return {'top3': top3, 'confidence': confidence, 'uncertain': confidence < threshold, 'urgency': final_urgency, 'model_urgency': model_urgency, 'red_flag_override': override, 'disease_safety_override': safety_override, 'disease_safety_floor': safety_floor, 'disease_safety_conditions': safety_conditions, 'shap_top5': contributions, 'ignored_symptoms': ignored, 'mapped_symptoms': mapped, 'symptoms_used': used, 'age_used': float(age), 'age_group_used': age_group(age), 'age_source':age_source, 'sex_used': sex_display, 'uncertainty_threshold': threshold, 'model_version': bundle['report']['model_version'], 'probability_mode': bundle['report']['deployment']['probability_mode'], 'disclaimer': bundle['report']['disclaimer'], 'context_note': 'Predictions use DDXPlus synthetic patient data and are not a medical diagnosis. Age and sex are included when supplied; omitted sex is treated as unknown. Model urgency is a dataset-severity research proxy. Rule red flags and project safety floors can raise urgency.'}

@router.get('/ml-report')
def ml_report():
    try:
        return json.loads(REPORT_PATH.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise HTTPException(503, {'status': 'unavailable', 'error': 'Training report unavailable'}) from error
