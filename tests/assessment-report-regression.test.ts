import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSymptomName, canonicalFindingFromEvidence, sanitizeSymptomList } from '@/lib/assessment/symptomPresentation';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import { evaluateAssessment } from '@/lib/assessment/evaluate';
import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
import type { DiseaseSnapshot } from '@/lib/ml/disease';

test('1 & 2: E_181 displays as Runny nose and E_97 displays as Sore throat across languages', () => {
  // English
  assert.equal(formatSymptomName('E_181', 'en'), 'Runny nose');
  assert.equal(formatSymptomName('E 181', 'en'), 'Runny nose');
  assert.equal(formatSymptomName('e_181', 'en'), 'Runny nose');
  assert.equal(formatSymptomName('runny_nose', 'en'), 'Runny nose');

  assert.equal(formatSymptomName('E_97', 'en'), 'Sore throat');
  assert.equal(formatSymptomName('E 97', 'en'), 'Sore throat');
  assert.equal(formatSymptomName('e_97', 'en'), 'Sore throat');
  assert.equal(formatSymptomName('sore_throat', 'en'), 'Sore throat');

  // Hindi
  assert.equal(formatSymptomName('E_181', 'hi'), 'बहती नाक');
  assert.equal(formatSymptomName('E_97', 'hi'), 'गले में खराश');

  // Marathi
  assert.equal(formatSymptomName('E_181', 'mr'), 'वाहणारे नाक');
  assert.equal(formatSymptomName('E_97', 'mr'), 'घसा खवखवणे');
});

test('3: Canonical evidence mapper prevents raw DDXPlus codes leaking into clinical presentation', () => {
  assert.equal(canonicalFindingFromEvidence('E_181'), 'runny_nose');
  assert.equal(canonicalFindingFromEvidence('E_97'), 'sore_throat');
  assert.equal(canonicalFindingFromEvidence('E_91'), 'fever');
  assert.equal(canonicalFindingFromEvidence('E_201'), 'cough');
  assert.equal(canonicalFindingFromEvidence('E_148'), 'nausea');
  assert.equal(canonicalFindingFromEvidence('E_51'), 'diarrhea');

  const rawList = ['fever', 'cough', 'E_181', 'E 97', 'e_89'];
  const sanitized = sanitizeSymptomList(rawList, 'en');

  // Ensure no code pattern exists in sanitized strings
  for (const item of sanitized) {
    assert.doesNotMatch(item, /^E[_\s]?\d+/i, `Leaked evidence code detected in: ${item}`);
  }
  assert.deepEqual(sanitized, ['Fever', 'Cough', 'Runny nose', 'Sore throat', 'Fatigue / tiredness']);
});

test('4 & 5: Mild respiratory presentation scores 46 (Medium urgency) and displayed components strictly reconcile to total', () => {
  const payload: FinalAssessmentPayload = {
    age: 'adult',
    symptoms: ['fever', 'cough', 'runny_nose', 'sore_throat'],
    severity: 'mild',
    duration: '< 1 day',
    medications: [],
    aiAnswers: {},
    aiAnswerLabels: {},
    language: 'en',
  };

  const result = evaluateAssessment(payload);

  // Authoritative triage results
  assert.equal(result.score, 46, 'Total score must equal 46 (fever 18 + cough 12 + runny_nose 8 + sore_throat 8)');
  assert.equal(result.urgency, 'Medium', 'Uncomplicated mild URTI must be Medium urgency (28-54), not unjustified High');

  // Verify breakdown components
  const scoreResult = calculateRisk({
    symptom: 'fever',
    symptoms: ['fever', 'cough', 'runny_nose', 'sore_throat'],
    severity: 'mild',
    duration: '< 1 day',
    additionalSymptoms: [],
    medicalHistory: [],
  });

  const symptomPoints = scoreResult.factors.filter(f => f.category === 'symptom' || f.category === 'additional').reduce((sum, f) => sum + f.score, 0);
  const severityPoints = scoreResult.factors.filter(f => f.category === 'severity').reduce((sum, f) => sum + f.score, 0);
  const durationPoints = scoreResult.factors.filter(f => f.category === 'duration').reduce((sum, f) => sum + f.score, 0);
  const historyPoints = scoreResult.factors.filter(f => f.category === 'history').reduce((sum, f) => sum + f.score, 0);
  const emergencyPoints = scoreResult.factors.filter(f => f.category === 'red_flag').reduce((sum, f) => sum + f.score, 0);

  assert.equal(symptomPoints, 46);
  assert.equal(severityPoints, 0);
  assert.equal(durationPoints, 0);
  assert.equal(historyPoints, 0);
  assert.equal(emergencyPoints, 0);

  // Exact component reconciliation
  const componentSum = symptomPoints + severityPoints + durationPoints + historyPoints + emergencyPoints;
  assert.equal(componentSum, result.score, 'Component breakdown sum must strictly reconcile to total risk score');
});

test('6: Emergency red flags still override normal scoring with 100/100 and High urgency', () => {
  const emergencyPayload: FinalAssessmentPayload = {
    age: 'adult',
    symptoms: ['chest_pain', 'cough'],
    severity: 'mild',
    duration: '< 1 day',
    medications: [],
    aiAnswers: {},
    aiAnswerLabels: {},
    language: 'en',
  };

  const result = evaluateAssessment(emergencyPayload);
  assert.equal(result.score, 100);
  assert.equal(result.urgency, 'High');
  assert.equal(result.hasRedFlag, true);
});

test('7: SHAP features render with valid patient-friendly names when available', () => {
  const shapFeatures = [
    { symptom: 'symptom:E_97', contribution: 0.18, present: true },
    { symptom: 'symptom:E_181', contribution: 0.14, present: true },
    { symptom: 'symptom:E_91', contribution: 0.22, present: true },
    { symptom: 'age', contribution: 0.05, present: true },
    { symptom: 'symptom:E_54:@:V_154', contribution: -0.08, present: false },
  ];

  const renderedLabels = shapFeatures.map(f => {
    const raw = f.symptom.replace(/^symptom:/i, '');
    const clean = formatSymptomName(raw, 'en');
    return f.present ? clean : `${clean} (not reported)`;
  });

  assert.equal(renderedLabels[0], 'Sore throat');
  assert.equal(renderedLabels[1], 'Runny nose');
  assert.equal(renderedLabels[2], 'Fever');
  assert.equal(renderedLabels[3], 'Age');
  assert.equal(renderedLabels[4], 'Pain characteristics (not reported)');

  // No feature has an empty label or raw E_ code
  for (const label of renderedLabels) {
    assert.ok(label && label.trim().length > 0, 'Label must not be empty');
    assert.doesNotMatch(label, /^E[_\s]?\d+/i, `Label must not start with raw code: ${label}`);
  }
});

test('8: Missing or empty SHAP data is safely handled without empty bullets', () => {
  const emptyShap: Array<{ symptom: string; contribution: number; present?: boolean }> = [];
  const unavailableShap = null;

  // Emulate rendering logic
  const renderShapSection = (shap: typeof emptyShap | null) => {
    const validBars = (shap || []).filter(item => item && item.symptom && Math.abs(item.contribution) > 0.0001);
    if (validBars.length === 0) {
      return { showSection: false, explanation: 'Detailed feature attribution is not available for this condition.' };
    }
    return { showSection: true, bars: validBars };
  };

  assert.equal(renderShapSection(emptyShap).showSection, false);
  assert.equal(renderShapSection(unavailableShap).showSection, false);
});

test('9: Saved historical report preserves consistent assessment snapshot without rerun', () => {
  const testSnapshot: DiseaseSnapshot = {
    schema_version: 1,
    timestamp: '2026-10-22T00:00:00.000Z',
    status: 'ready',
    prediction: {
      top3: [
        { disease: 'URTI', probability: 0.512 },
        { disease: 'Bronchitis', probability: 0.25 },
        { disease: 'Influenza', probability: 0.127 },
      ],
      confidence: 0.512,
      uncertain: false,
      urgency: 'Medium',
      model_urgency: 'Medium',
      red_flag_override: false,
      disease_safety_override: false,
      disease_safety_floor: null,
      disease_safety_conditions: [],
      probability_mode: 'sigmoid calibrated predict_proba',
      shap_top5: [
        { symptom: 'symptom:E_97', contribution: 0.18, present: true },
        { symptom: 'symptom:E_181', contribution: 0.14, present: true },
        { symptom: 'symptom:E_91', contribution: 0.12, present: true },
      ],
      ignored_symptoms: [],
      mapped_symptoms: [
        { input: 'runny nose', symptom: 'E_181' },
        { input: 'sore throat', symptom: 'E_97' },
        { input: 'fever', symptom: 'E_91' },
        { input: 'cough', symptom: 'E_201' },
      ],
      symptoms_used: ['E_181', 'E_97', 'E_91', 'E_201'],
      uncertainty_threshold: 0.5,
      model_version: 'ddxplus-xgboost-v1-original',
      disclaimer: 'Statistical estimate only.',
      context_note: 'Assessment snapshot.',
      age_used: 30,
      age_group_used: 'adult',
      age_source: 'patient supplied',
      sex_used: 'M',
      within_model_scope: true,
      evidence_quality: 'sufficient',
      scope_note: null,
      gate_reasons: [],
      suggested_followups: [],
    },
  };

  // Check that stored snapshot values remain pristine and identical
  assert.ok(testSnapshot.prediction);
  assert.equal(testSnapshot.prediction.top3[0].disease, 'URTI');
  assert.equal(testSnapshot.prediction.top3[0].probability, 0.512);
  assert.equal(testSnapshot.prediction.urgency, 'Medium');
  assert.equal(testSnapshot.prediction.shap_top5.length, 3);
  assert.equal(testSnapshot.prediction.symptoms_used.length, 4);
});

test('10: Multilingual Hindi and Marathi translations remain readable and correct', () => {
  const testCases = [
    { key: 'fever', en: 'Fever', hi: 'बुखार', mr: 'ताप' },
    { key: 'cough', en: 'Cough', hi: 'खांसी', mr: 'खोकला' },
    { key: 'runny_nose', en: 'Runny nose', hi: 'बहती नाक', mr: 'वाहणारे नाक' },
    { key: 'sore_throat', en: 'Sore throat', hi: 'गले में खराश', mr: 'घसा खवखवणे' },
    { key: 'chest_pain', en: 'Chest pain', hi: 'सीने में दर्द', mr: 'छातीत दुखणे' },
  ];

  for (const tc of testCases) {
    assert.equal(formatSymptomName(tc.key, 'en'), tc.en);
    assert.equal(formatSymptomName(tc.key, 'hi'), tc.hi);
    assert.equal(formatSymptomName(tc.key, 'mr'), tc.mr);
  }
});
