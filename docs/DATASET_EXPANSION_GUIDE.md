# SymptoSense Clinical Dataset & Disease Classification Architecture

## 1. Overview & Strategy

This document outlines the clinical dataset expansion strategy for SymptoSense, transitioning from synthetic evidence codes to real-world clinical disease prediction, natural symptom mapping, and multi-tier medical classification.

---

## 2. Multi-Tier Hybrid Medical Architecture

Modern clinical decision-support systems (such as Ada Health and Infermedica) combine three complementary layers rather than relying on a single flat classifier:

```
                  User Symptoms & Context (Age, Sex, Duration, Severity)
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Tier 1: Clinical Safety & Emergency Rule Engine                                 │
│  - Zero-latency rule evaluation for red flags (Chest pain, Stroke signs, Sepsis)  │
│  - Overrides urgency to High regardless of model probability                     │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Tier 2: Real Clinical ML Disease Classifier                                     │
│  - 41 Core Outpatient Diseases (4,920 records, 131 natural symptoms)              │
│  - Supervised Random Forest with probability calibration                         │
│  - Direct natural symptom inputs: "fever", "cough", "skin_rash", "headache"      │
│  - Outputs Top-3 probable conditions, confidence scores, and SHAP feature import │
│  - Integrated with doctor-verified descriptions and 4-step medical precautions   │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Tier 3: Medical LLM Reasoning & Large Knowledge Base (Groq / Llama 3)            │
│  - Handles free-text nuances, complex comorbidities, and rare conditions (ICD-10)│
│  - Generates patient-friendly explanations in English, Hindi, and Marathi         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dataset Specifications

### Tier 2 Dataset: Primary Care Disease & Precaution Corpus
- **Source**: `ml-service/data/dataset.csv`, `symptom_Description.csv`, `symptom_precaution.csv`
- **Cases**: 4,920 patient symptom associations
- **Disease Classes**: 41 primary care conditions (Malaria, Dengue, Typhoid, Diabetes, Hypertension, Bronchial Asthma, Pneumonia, GERD, Migraine, Jaundice, Hepatitis, Arthritis, etc.)
- **Symptom Vocabulary**: 131 natural language tokens (`fever`, `cough`, `chest_pain`, `joint_pain`, `skin_rash`, etc.)
- **Doctor Guidance**:
  - Each disease has a verified clinical description.
  - Each disease has 4 specific actionable precautions (e.g., Dengue: *drink fluids, use mosquito nets, avoid NSAIDs, monitor platelet count*).

---

## 4. Pipeline Implementation Steps

1. **Feature Matrix Construction**:
   - Multi-hot binary symptom matrix covering all 131 standard clinical tokens.
   - Clean alias mapping for common synonyms (e.g. *rash* -> *skin_rash*, *shortness of breath* -> *breathlessness*).

2. **Model Training & Calibration**:
   - Random Forest Classifier with 100 estimators, balanced class weights, and stratified K-fold cross validation.
   - Outputs calibrated class probabilities for top differential diagnoses.

3. **Inference Service Integration** (`ml-service/disease_inference.py`):
   - Exposes `/predict-disease` endpoint on port 8000.
   - Returns top 3 candidate diseases with probability scores.
   - Attaches verified descriptions and 4-step precautions.
   - Enforces emergency safety floor whenever red-flag symptoms are present.

4. **Frontend Integration**:
   - Symptom selector matches natural clinical tokens.
   - Assessment Results page displays top conditions, likelihood progress bars, clinical descriptions, and precautions.
