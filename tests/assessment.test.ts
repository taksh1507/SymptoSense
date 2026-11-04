import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import { classifyUrgency } from '@/lib/ai-engine/scoring/thresholds';
import { extractAffirmedSymptoms } from '@/lib/assessment/findings';
import { evaluateAssessment } from '@/lib/assessment/evaluate';
import { mapAnswersToMLFeatures, validateFeatures } from '@/lib/ml/featureMapper';
import { parseAssessment, serializeAnswers, InputError } from '@/lib/assessment/contracts';
import { parseStoredAssessment } from '@/lib/report/parseAnswers';
import { matchVoiceToOption } from '@/utils/matchVoiceInput';
import { Q1_AGE, Q9_DURATION, Q10_SEVERITY } from '@/components/ai-question-engine/questionFlow';
import { isAdmin } from '@/lib/admin';
import { rateLimit } from '@/lib/rateLimit';
import { validateQuestion } from '@/lib/questionSchema';
import { readJson, readMultipart } from '@/lib/http';
import { mlBaseUrl } from '@/lib/ml/service';
import { validateDiseasePrediction, parseDiseaseRequest } from '@/lib/ml/disease';
import { isDuplicateQuestion } from '@/lib/questionDeduplication';
const base = { age: 'adult', symptoms: ['cough'], aiAnswers: {}, aiAnswerLabels: {}, duration: '< 1 day', severity: 'mild', medications: ['none'], language: 'en' };
for (const symptom of ['chest_pain', 'chest pain', 'breathlessness', 'shortness_of_breath', 'difficulty_breathing', 'confusion', 'severe_bleeding', 'सीने में दर्द', 'छातीत दुखणे']) {
  test('emergency normalization: ' + symptom, () => {
    const result = evaluateAssessment(parseAssessment({ ...base, symptoms: [symptom] }));
    assert.equal(result.score, 100); assert.equal(result.urgency, 'High'); assert.equal(result.hasRedFlag, true);
  });
}
test('dataset neurologic and respiratory danger symptoms trigger High triage', () => {
  for (const symptom of ['weakness_of_one_body_side', 'altered_sensorium', 'loss_of_balance', 'breathlessness', 'coughing_of_blood']) {
    const result = evaluateAssessment(parseAssessment({ ...base, symptoms: [symptom] }));
    assert.equal(result.urgency, 'High', symptom);
    assert.equal(result.hasRedFlag, true, symptom);
  }
});
test('emergency warning-sign variations trigger High urgency without downgrade', () => {
  const cardiacScenarios = [
    'pain in chest',
    'tightness in chest',
    'heaviness in chest',
    'pressure in chest',
    'severe chest pain',
    'angina',
    'trouble breathing',
    'hard to breathe',
    'struggling to breathe',
    'passed out',
    'syncope',
  ];
  for (const symptom of cardiacScenarios) {
    const result = evaluateAssessment(parseAssessment({ ...base, symptoms: [symptom] }));
    assert.equal(result.score, 100, `Expected score 100 for ${symptom}`);
    assert.equal(result.urgency, 'High', `Expected High urgency for ${symptom}`);
    assert.equal(result.hasRedFlag, true, `Expected red flag for ${symptom}`);
  }
});
test('negated findings never activate an emergency', () => {
  assert.deepEqual(extractAffirmedSymptoms('No chest pain or dizziness'), []);
  assert.equal(calculateRisk({ symptom: 'no chest pain', severity: 'mild', duration: '< 1 day' }).isRedFlag, false);
  assert.deepEqual(extractAffirmedSymptoms('No chest pain but dizziness'), ['dizziness']);
});
test('new adaptive danger signs preserve the emergency override', () => {
  const result = evaluateAssessment(parseAssessment({ ...base, symptoms: ['cough', 'headache'], aiAnswerLabels: { ai_q1: 'Sudden confusion' } }));
  assert.equal(result.score, 100); assert.equal(result.hasRedFlag, true);
});
test('all symptoms and conditions contribute independently of selection order', () => {
  const payload = parseAssessment({ ...base, symptoms: ['cough', 'headache', 'fatigue'], medications: ['diabetes', 'heart_disease', 'blood_thinners'] });
  const first = evaluateAssessment(payload); const reversed = evaluateAssessment({ ...payload, symptoms: [...payload.symptoms].reverse(), medications: [...payload.medications].reverse() });
  assert.equal(first.score, 94); assert.equal(first.score, reversed.score); assert.equal(first.factors.length, 6);
});
test('custom symptoms and medications survive scoring and persistence', () => {
  const payload = parseAssessment({ ...base, customSymptom: 'itchy skin', customMedication: 'thyroid medication' });
  assert.ok(evaluateAssessment(payload).factors.some(f => f.category === 'history'));
  const parsed = parseStoredAssessment(JSON.stringify(serializeAnswers(payload)), JSON.stringify(payload));
  assert.ok(parsed.medicalHistory.includes('thyroid medication')); assert.ok(parsed.additionalSymptoms.includes('itchy_skin'));
});
test('no generic question-answer text is counted as an additional symptom', () => {
  const data = parseAssessment({ ...base, aiAnswerLabels: { ai_q1: 'No, first time', ai_q2: 'Normal', ai_q3: 'Not sure' } });
  assert.equal(evaluateAssessment(data).score, 12);
});
test('feature mapper ignores question keys and negated answer text', () => {
  const features = mapAnswersToMLFeatures({ ...base, aiAnswers: { chest_pain: 'option_a' }, aiAnswerLabels: { chest_pain: 'No chest pain or dizziness' } });
  assert.equal(features.chest_pain, 0); assert.equal(features.dizziness, 0); assert.equal(features.cough, 1);
});
test('feature contract rejects unknown text, NaN, and invalid binary values', () => {
  const features = { ...mapAnswersToMLFeatures(base), rule_score: 12, risk_level: 0 };
  assert.deepEqual(validateFeatures(features), features);
  for (const value of [{ ...features, notes: 'sensitive text' }, { ...features, cough: 2 }, { ...features, rule_score: NaN }]) assert.throws(() => validateFeatures(value));
});
test('complete assessment round-trips adaptive answers and all history', () => {
  const payload = parseAssessment({ ...base, aiAnswers: { ai_q1: 'option_a' }, aiAnswerLabels: { ai_q1: 'No dizziness' }, medications: ['blood_thinners', 'diabetes'] });
  const answers = serializeAnswers(payload); assert.ok(answers.some(a => a.questionId === 'ai_q1'));
  const parsed = parseStoredAssessment(JSON.stringify(answers), JSON.stringify(payload)); assert.deepEqual(parsed.medicalHistory, ['blood_thinners', 'diabetes']);
});
test('legacy report answers remain readable', () => {
  const parsed = parseStoredAssessment(JSON.stringify([{ questionId: 'q1', answer: 'cough' }, { questionId: 'q11', answer: 'blood_thinners' }]));
  assert.equal(parsed.primarySymptom, 'cough'); assert.deepEqual(parsed.medicalHistory, ['blood_thinners']);
});
test('age voice values take precedence over number synonyms', () => assert.equal(matchVoiceToOption('teen', Q1_AGE), 'teen'));
test('ambiguous or negated voice input requires a manual choice', () => assert.equal(matchVoiceToOption('not severe', Q10_SEVERITY), null));
test('duration voice matching supports one week without overstatement', () => assert.equal(matchVoiceToOption('one week', Q9_DURATION), '4-7 days'));
test('admin allowlist is closed when absent', () => {
  const previous = process.env.ADMIN_EMAILS; delete process.env.ADMIN_EMAILS;
  assert.equal(isAdmin({ user: { email: 'any@example.test' }, expires: '' }), false);
  process.env.ADMIN_EMAILS = 'admin@example.test'; assert.equal(isAdmin({ user: { email: 'ADMIN@example.test' }, expires: '' }), true);
  if (previous === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = previous;
});
test('rate limiter rejects exceeding the configured quota', () => {
  assert.equal(rateLimit('regression-test', 2, 60000), true); assert.equal(rateLimit('regression-test', 2, 60000), true); assert.equal(rateLimit('regression-test', 2, 60000), false);
});
test('risk thresholds use the implemented 28/55 contract', () => {
  assert.equal(classifyUrgency(27), 'Low'); assert.equal(classifyUrgency(28), 'Medium'); assert.equal(classifyUrgency(54), 'Medium'); assert.equal(classifyUrgency(55), 'High');
});
test('model-health base URL strips the prediction endpoint', () => {
  const previous = process.env.ML_SERVER_URL; const service = process.env.ML_SERVICE_URL; delete process.env.ML_SERVICE_URL; process.env.ML_SERVER_URL = 'http://localhost:8000/predict-confidence';
  assert.equal(mlBaseUrl(), 'http://localhost:8000');
  if (previous === undefined) delete process.env.ML_SERVER_URL; else process.env.ML_SERVER_URL = previous;
  if (service !== undefined) process.env.ML_SERVICE_URL = service;
});
test('malformed AI option contracts are rejected', () => assert.throws(() => validateQuestion({ question: { en: 'Question' }, options: [] }, 0)));
test('JSON input reader enforces byte limits even without content-length', async () => {
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(300) }) }), 100));
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '{bad' })));
});
test('multipart reader rejects over-limit audio before upstream work', async () => {
  const body = '--boundary\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n' + 'x'.repeat(200) + '\r\n--boundary--';
  await assert.rejects(readMultipart(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, body }), 100));
});
test('localized fallback preserves emergency action and avoids English-only factors', () => {
  const result = evaluateAssessment(parseAssessment({ ...base, language: 'mr', symptoms: ['chest_pain'] }));
  assert.equal(result.hasRedFlag, true); assert.match(result.primaryAction ?? '', /आपत्कालीन/);
});


test('symptom extraction uses word boundaries instead of internal substrings', () => {
  for (const value of ['scoughing', 'painfully', 'chest painx']) assert.deepEqual(extractAffirmedSymptoms(value), []);
  assert.deepEqual(extractAffirmedSymptoms('No cough, but chest pain'), ['chest_pain']);
});
test('Hindi and Marathi denial does not become an unknown positive symptom', () => {
  for (const symptom of ['खांसी नहीं', 'छातीत दुखणे नाही']) assert.equal(calculateRisk({ symptom, severity: 'mild', duration: '< 1 day' }).score, 0);
});
test('model retains critical severity, week-long duration, and custom condition features', () => {
  const features = mapAnswersToMLFeatures({ ...base, severity: 'critical', duration: '> 1 week', customMedication: 'diabetes' });
  assert.equal(features.severity, 4); assert.equal(features.duration, 4); assert.equal(features.diabetes, 1);
});

test('duration expansion: 4-12 weeks and >12 weeks parse cleanly and preserve backward compatibility', () => {
  for (const d of ['< 1 day', '1-3 days', '4-7 days', '> 1 week', '4-12 weeks', '> 12 weeks']) {
    const parsed = parseAssessment({ ...base, duration: d });
    assert.equal(parsed.duration, d);
  }
  assert.throws(() => parseAssessment({ ...base, duration: '6 months' }));
});

test('duration expansion: feature mapper caps multi-week duration within valid [1, 4] feature range', () => {
  const f1 = mapAnswersToMLFeatures({ ...base, duration: '4-12 weeks' });
  const f2 = mapAnswersToMLFeatures({ ...base, duration: '> 12 weeks' });
  assert.equal(f1.duration, 4);
  assert.equal(f2.duration, 4);
  assert.deepEqual(validateFeatures({ ...f1, rule_score: 0, risk_level: 0 }), { ...f1, rule_score: 0, risk_level: 0 });
  assert.deepEqual(validateFeatures({ ...f2, rule_score: 0, risk_level: 0 }), { ...f2, rule_score: 0, risk_level: 0 });
});

test('duration expansion: scoring engine awards full longevity points for chronic durations', () => {
  const res1 = evaluateAssessment(parseAssessment({ ...base, symptoms: ['cough'], duration: '4-12 weeks' }));
  const res2 = evaluateAssessment(parseAssessment({ ...base, symptoms: ['cough'], duration: '> 12 weeks' }));
  assert.equal(res1.score, 37); // cough(12) + duration(25) = 37
  assert.equal(res2.score, 37);
  assert.ok(res1.factors.some(f => f.label.includes('Duration')));
});

test('duration voice input matches 4-12 weeks and > 12 weeks options accurately', () => {
  assert.equal(matchVoiceToOption('4 to 12 weeks', Q9_DURATION), '4-12 weeks');
  assert.equal(matchVoiceToOption('12 weeks or longer', Q9_DURATION), '> 12 weeks');
  assert.equal(matchVoiceToOption('chronic', Q9_DURATION), '> 12 weeks');
  assert.equal(matchVoiceToOption('5', Q9_DURATION), '4-12 weeks');
  assert.equal(matchVoiceToOption('6', Q9_DURATION), '> 12 weeks');
});

test('adaptive chest pain: rest pain and chest discomfort map to red-flag chest_pain', () => {
  const restVariants = [
    'chest pain at rest',
    'pain in chest at rest',
    'rest pain',
    'chest discomfort at rest',
    'discomfort in chest',
  ];
  for (const phrase of restVariants) {
    const affirmed = extractAffirmedSymptoms(phrase);
    assert.ok(affirmed.includes('chest_pain'), `Expected chest_pain in ${phrase}`);
    const triage = evaluateAssessment(parseAssessment({ ...base, symptoms: [phrase] }));
    assert.equal(triage.score, 100, `Expected score 100 for rest phrase: ${phrase}`);
    assert.equal(triage.urgency, 'High', `Expected High urgency for rest phrase: ${phrase}`);
    assert.equal(triage.hasRedFlag, true, `Expected red flag for rest phrase: ${phrase}`);
  }
});

test('adaptive chest pain: exertional and crescendo patterns extract canonical findings', () => {
  assert.deepEqual(extractAffirmedSymptoms('pain with physical exertion and relieved by rest'), ['exertional_chest_pain']);
  assert.deepEqual(extractAffirmedSymptoms('symptoms worsened over the last 2 weeks with less effort'), ['crescendo_angina']);
});

test('prediction uncertainty: 0.50 confidence and 0.10 margin thresholds identify overlapping conditions', () => {
  // Scenario A: Low top-1 confidence (<0.50)
  const lowConf = { top3: [{ disease: 'Unstable angina', probability: 0.44 }, { disease: 'Stable angina', probability: 0.41 }, { disease: 'Pericarditis', probability: 0.15 }] };
  const marginA = lowConf.top3[0].probability - lowConf.top3[1].probability;
  const isOverlappingA = lowConf.top3[0].probability < 0.50 || marginA < 0.10;
  assert.equal(isOverlappingA, true);

  // Scenario B: Confident top-1 (>0.50) but narrow margin (<0.10) between Unstable vs Stable Angina
  const narrowMargin = { top3: [{ disease: 'Unstable angina', probability: 0.52 }, { disease: 'Stable angina', probability: 0.46 }, { disease: 'GERD', probability: 0.02 }] };
  const marginB = narrowMargin.top3[0].probability - narrowMargin.top3[1].probability; // 0.06 < 0.10
  const isOverlappingB = narrowMargin.top3[0].probability < 0.50 || marginB < 0.10;
  assert.equal(isOverlappingB, true);

  // Scenario C: Clear separation (confidence >= 0.50 and margin >= 0.10)
  const decisive = { top3: [{ disease: 'Bronchitis', probability: 0.88 }, { disease: 'Pneumonia', probability: 0.08 }, { disease: 'Asthma', probability: 0.04 }] };
  const marginC = decisive.top3[0].probability - decisive.top3[1].probability; // 0.80 >= 0.10
  const isOverlappingC = decisive.top3[0].probability < 0.50 || marginC < 0.10;
  assert.equal(isOverlappingC, false);
});

test('prediction uncertainty never downgrades independent clinical triage urgency', () => {
  // Even if ML is completely uncertain (e.g. 33%/33%/33%), emergency red flag guarantees High urgency
  const triage = evaluateAssessment(parseAssessment({ ...base, symptoms: ['chest_pain'] }));
  assert.equal(triage.urgency, 'High');
  assert.equal(triage.score, 100);
});

test('e2e flow: unstable angina misclassified as stable angina cannot suppress emergency guidance', () => {
  // Step 1: User enters chest discomfort and rest pain
  const rawInput = {
    age: 'elderly',
    symptoms: ['chest discomfort at rest'],
    customSymptom: 'tightness in chest',
    aiAnswers: { ai_q1: 'rest_pain', ai_q2: 'worsening_2_weeks' },
    aiAnswerLabels: { ai_q1: 'Pain occurs even at rest', ai_q2: 'Symptoms worsened over the last 2 weeks' },
    duration: '4-12 weeks',
    severity: 'severe',
    medications: ['hypertension'],
    language: 'en',
  };

  // Step 2: Emergency red flags are checked immediately
  const affirmed = extractAffirmedSymptoms(rawInput.symptoms[0]);
  assert.ok(affirmed.includes('chest_pain'));

  // Step 3: Contracts parse and validate cleanly
  const parsed = parseAssessment(rawInput);
  assert.equal(parsed.duration, '4-12 weeks');
  assert.equal(parsed.severity, 'severe');

  // Step 4: Rule engine computes independent urgency (MUST be High / 100)
  const triageResult = evaluateAssessment(parsed);
  assert.equal(triageResult.urgency, 'High');
  assert.equal(triageResult.score, 100);
  assert.equal(triageResult.hasRedFlag, true);
  assert.match(triageResult.primaryAction ?? '', /emergency|immediate/i);

  // Step 5: Feature mapping respects valid numeric bounds without NaN
  const features = mapAnswersToMLFeatures(parsed);
  assert.equal(features.duration, 4);
  assert.equal(features.severity, 3);
  assert.equal(features.chest_pain, 1);
  assert.deepEqual(validateFeatures({ ...features, rule_score: 100, risk_level: 2 }), { ...features, rule_score: 100, risk_level: 2 });

  // Step 6: ML prediction returns a misclassification (Stable angina instead of Unstable angina)
  const mockMisclassification = {
    top3: [
      { disease: 'Stable angina', probability: 0.52 },
      { disease: 'Unstable angina', probability: 0.44 },
      { disease: 'Pericarditis', probability: 0.04 },
    ],
    confidence: 0.52,
    uncertain: false,
    urgency: 'High', // Safety-adjusted
    model_urgency: 'Medium',
    red_flag_override: true,
    disease_safety_override: false,
    disease_safety_floor: 'Medium',
    disease_safety_conditions: ['Stable angina'],
    probability_mode: 'isotonic calibrated predict_proba',
    shap_top5: [
      { symptom: 'E_14', contribution: 0.35, present: true },
      { symptom: 'E_53', contribution: 0.20, present: true },
      { symptom: 'E_218', contribution: 0.15, present: true },
      { symptom: 'general', contribution: 0.0, present: false },
      { symptom: 'general', contribution: 0.0, present: false },
    ],
    ignored_symptoms: [],
    mapped_symptoms: [],
    symptoms_used: ['E_14', 'E_53', 'E_218'],
    age_used: 65,
    age_group_used: 'elderly',
    age_source: 'age-group representative',
    sex_used: 'unknown',
    uncertainty_threshold: 0.50,
    model_version: 'ddxplus-test',
    disclaimer: 'Statistical estimate',
    context_note: 'Research model',
  };

  const validatedPrediction = validateDiseasePrediction(mockMisclassification);
  assert.equal(validatedPrediction.top3[0].disease, 'Stable angina');

  // Step 7: Uncertainty logic detects narrow margin (0.52 - 0.44 = 0.08 < 0.10)
  const margin = validatedPrediction.top3[0].probability - validatedPrediction.top3[1].probability;
  const isOverlapping = validatedPrediction.confidence < 0.50 || margin < 0.10;
  assert.equal(isOverlapping, true, 'Narrow margin between Stable and Unstable angina must trigger overlapping uncertainty');

  // Step 8: Triage urgency remains strictly High and is not suppressed
  assert.equal(triageResult.urgency, 'High');

  // Step 9: History serialization preserves answers
  const serialized = serializeAnswers(parsed);
  assert.ok(serialized.some(a => a.questionId === 'duration' && a.answer === '4-12 weeks'));
  const restored = parseStoredAssessment(JSON.stringify(serialized), JSON.stringify(parsed));
  assert.equal(restored.duration, '4-12 weeks');
});

test('e2e resilience: missing answers, empty input, and malformed disease responses', () => {
  // Empty symptoms rejected
  assert.throws(() => parseAssessment({ ...base, symptoms: [], customSymptom: '' }), InputError);

  // Invalid duration rejected
  assert.throws(() => parseAssessment({ ...base, duration: 'invalid_duration' }), InputError);

  // Invalid age rejected
  assert.throws(() => parseAssessment({ ...base, age: 'alien' }), InputError);

  // Disease request validation
  assert.throws(() => parseDiseaseRequest({ symptoms: [] }));
  assert.throws(() => parseDiseaseRequest({ symptoms: ['cough'], age: -5 }));

  // Malformed disease prediction validations
  assert.throws(() => validateDiseasePrediction({ top3: [] })); // Missing items
  assert.throws(() => validateDiseasePrediction({
    top3: [{ disease: 'A', probability: -0.1 }, { disease: 'B', probability: 0.5 }, { disease: 'C', probability: 0.6 }],
    confidence: -0.1,
  })); // Negative probability
  assert.throws(() => validateDiseasePrediction({
    top3: [{ disease: 'A', probability: 0.9 }, { disease: 'B', probability: 0.05 }, { disease: 'C', probability: 0.05 }],
    confidence: 0.9,
    red_flag_override: true,
    urgency: 'Low', // Inconsistent: red flag cannot have Low urgency
  }));

  // Unsupported evidence safely ignored without NaN
  const gibberishFeatures = mapAnswersToMLFeatures({ ...base, symptoms: ['totally_unknown_symptom_xyz123'] });
  assert.equal(gibberishFeatures.cough, 0);
  assert.equal(gibberishFeatures.chest_pain, 0);
  assert.ok(!Number.isNaN(gibberishFeatures.answer_confidence_proxy));
});

test('e2e multilingual & voice input: Hindi and Marathi emergency terms and chronic durations', () => {
  // Hindi emergency red flags
  const hindiTriage = evaluateAssessment(parseAssessment({ ...base, symptoms: ['सीने में दर्द'], language: 'hi' }));
  assert.equal(hindiTriage.urgency, 'High');
  assert.equal(hindiTriage.hasRedFlag, true);

  // Marathi emergency red flags
  const marathiTriage = evaluateAssessment(parseAssessment({ ...base, symptoms: ['छातीत दुखणे'], language: 'mr' }));
  assert.equal(marathiTriage.urgency, 'High');
  assert.equal(marathiTriage.hasRedFlag, true);

  // Voice input in Hindi and Marathi for chronic duration
  assert.equal(matchVoiceToOption('12 हफ्ते या अधिक', Q9_DURATION), '> 12 weeks');
  assert.equal(matchVoiceToOption('12 आठवडे किंवा अधिक', Q9_DURATION), '> 12 weeks');
  assert.equal(matchVoiceToOption('4 – 12 हफ्ते', Q9_DURATION), '4-12 weeks');
  assert.equal(matchVoiceToOption('4 – 12 आठवडे', Q9_DURATION), '4-12 weeks');
});

test('exact assessment case: adult with stomach pain, cough, fever scores 72 without red flags', () => {
  const assessmentInput = {
    age: 'adult',
    symptoms: ['stomach pain', 'cough', 'fever'],
    duration: '1-3 days',
    severity: 'moderate',
    medications: ['none'],
    language: 'en',
    aiAnswers: {
      aggravating: 'movement/activity',
      progression: 'staying the same',
      sick_contact: 'no',
      appetite_sleep: 'poor sleep',
      similar_episodes: 'no',
    },
    aiAnswerLabels: {
      aggravating: 'movement/activity',
      progression: 'staying the same',
      sick_contact: 'no',
      appetite_sleep: 'poor sleep',
      similar_episodes: 'no',
    },
  };

  const parsed = parseAssessment(assessmentInput);
  const triage = evaluateAssessment(parsed);

  // Exact deterministic breakdown:
  // stomach_pain (14) + cough (12) + fever (18) = 44
  // moderate severity = 18
  // 1-3 days duration = 10
  // Total: 44 + 18 + 10 = 72
  assert.equal(triage.score, 72, 'Score must deterministically equal 72');
  assert.equal(triage.urgency, 'High', 'Score >= 55 classifies as High urgency');
  assert.equal(triage.hasRedFlag, false, 'No emergency red flags were present in this input');
  assert.ok(triage.primaryAction);
  assert.equal(triage.primaryAction.includes('108'), false, 'Non-emergency High urgency must not recommend 108 emergency services');
  assert.ok(triage.primaryAction.includes('consultation') || triage.primaryAction.includes('evaluation'), 'Must recommend prompt clinical evaluation');
});

test('semantic duplicate question detection prevents redundant better/worse questions', () => {
  const existingQuestions = [
    { question: 'What makes your stomach pain, cough, or fever better or worse?' },
  ];

  const redundantQuestion = 'Does anything make your symptoms better or worse?';
  const isDup = isDuplicateQuestion(redundantQuestion, 'symptom_triggers', existingQuestions);
  assert.equal(isDup, true, 'Redundant trigger question must be recognized as duplicate');

  const differentIntentQuestion = 'Have you had similar episodes in the past?';
  const isNotDup = isDuplicateQuestion(differentIntentQuestion, 'prior_episodes', existingQuestions);
  assert.equal(isNotDup, false, 'Distinct clinical intent question must not be marked as duplicate');
});

test('dual model prediction validation: Random Forest metadata contracts', () => {
  const mockRF = {
    top3: [
      { disease: 'GERD', probability: 0.162 },
      { disease: 'Drug Reaction', probability: 0.089 },
      { disease: 'Bronchial Asthma', probability: 0.051 },
    ],
    confidence: 0.162,
    uncertain: true,
    urgency: 'Medium' as const,
    model_urgency: 'Medium' as const,
    red_flag_override: false,
    disease_safety_override: false,
    disease_safety_floor: null,
    disease_safety_conditions: [],
    probability_mode: 'uncalibrated predict_proba',
    shap_top5: [
      { symptom: 'stomach_pain', contribution: 0.054, present: true },
      { symptom: 'cough', contribution: 0.054, present: true },
      { symptom: 'high_fever', contribution: 0.054, present: true },
      { symptom: 'general_evidence', contribution: 0, present: false },
      { symptom: 'general_evidence', contribution: 0, present: false },
    ],
    ignored_symptoms: [],
    mapped_symptoms: [],
    symptoms_used: ['stomach_pain', 'cough', 'high_fever'],
    uncertainty_threshold: 0.20,
    model_version: 'clinical-41-rf',
    disclaimer: 'Statistical symptom associations and clinical research dataset.',
    context_note: 'Classified using the 41-disease clinical association model.',
    age_used: 35,
    age_group_used: 'adult',
    age_source: 'age-group representative',
    sex_used: 'unknown',
    model_id: 'clinical-41-rf',
    model_name: 'Random Forest (Clinical Symptoms)',
    dataset_source: 'Kaggle 41-Disease Symptom Dataset',
    conditions_count: 41,
    score_type: 'Model vote estimate',
    calibration_status: 'uncalibrated tree-vote estimate',
    is_fallback: false,
    fallback_reason: null,
  };

  const validated = validateDiseasePrediction(mockRF);
  assert.equal(validated.model_id, 'clinical-41-rf');
  assert.equal(validated.conditions_count, 41);
  assert.equal(validated.score_type, 'Model vote estimate');
  assert.equal(validated.is_fallback, false);
});

test('dual model prediction validation: XGBoost DDXPlus metadata contracts', () => {
  const mockXGB = {
    top3: [
      { disease: 'Acute rhinosinusitis', probability: 0.785 },
      { disease: 'Chronic rhinosinusitis', probability: 0.121 },
      { disease: 'Common cold', probability: 0.042 },
    ],
    confidence: 0.785,
    uncertain: false,
    urgency: 'Low' as const,
    model_urgency: 'Low' as const,
    red_flag_override: false,
    disease_safety_override: false,
    disease_safety_floor: null,
    disease_safety_conditions: [],
    probability_mode: 'isotonic calibrated predict_proba',
    shap_top5: [
      { symptom: 'E_201', contribution: 0.32, present: true },
      { symptom: 'E_91', contribution: 0.21, present: true },
      { symptom: 'E_94', contribution: 0.12, present: true },
      { symptom: 'E_89', contribution: 0.08, present: true },
      { symptom: 'E_66', contribution: -0.05, present: false },
    ],
    ignored_symptoms: [],
    mapped_symptoms: [],
    symptoms_used: ['E_201', 'E_91', 'E_94'],
    uncertainty_threshold: 0.50,
    model_version: 'ddxplus-xgboost-v1',
    disclaimer: 'Predictions use DDXPlus synthetic patient data.',
    context_note: 'Predictions use DDXPlus synthetic patient data and are not a medical diagnosis.',
    age_used: 35,
    age_group_used: 'adult',
    age_source: 'age-group representative',
    sex_used: 'unknown',
    model_id: 'ddxplus-xgboost',
    model_name: 'XGBoost (DDXPlus)',
    dataset_source: 'DDXPlus Synthetic Benchmark',
    conditions_count: 49,
    score_type: 'Calibrated probability',
    calibration_status: 'calibrated (isotonic)',
    is_fallback: false,
    fallback_reason: null,
  };

  const validated = validateDiseasePrediction(mockXGB);
  assert.equal(validated.model_id, 'ddxplus-xgboost');
  assert.equal(validated.conditions_count, 49);
  assert.equal(validated.score_type, 'Calibrated probability');
  assert.equal(validated.is_fallback, false);
});

test('Scenario 2: GI presentation (abdominal pain, vomiting, diarrhea) out-of-scope gate and safe triage', () => {
  const rawInput = {
    age: 'adult',
    symptom: 'abdominal pain',
    symptoms: ['abdominal pain', 'vomiting', 'diarrhea'],
    duration: '1-3 days',
    severity: 'mild',
    medications: ['none'],
    language: 'en',
  };
  const parsed = parseAssessment(rawInput);
  const triageResult = evaluateAssessment(parsed);
  // Mild GI symptoms without red flags must NOT be escalated to emergency
  assert.notEqual(triageResult.urgency, 'High');
  assert.equal(triageResult.hasRedFlag, false);

  // Evidence gate payload contract
  const outOfScopeMock = {
    top3: [
      { disease: 'Chagas', probability: 0.66 },
      { disease: 'Anaphylaxis', probability: 0.14 },
      { disease: 'Pancreatic neoplasm', probability: 0.07 },
    ],
    confidence: 0.66,
    uncertain: true,
    uncertainty_threshold: 1.0,
    urgency: 'Low' as const,
    model_urgency: 'High' as const,
    red_flag_override: false,
    disease_safety_override: false,
    disease_safety_floor: null,
    disease_safety_conditions: [],
    shap_top5: [
      { symptom: 'E_51', contribution: 0.1, present: true },
      { symptom: 'E_53', contribution: 0.05, present: true },
      { symptom: 'E_55_@_V_187', contribution: 0.04, present: true },
      { symptom: 'E_181', contribution: 0.01, present: false },
      { symptom: 'E_91', contribution: 0.01, present: false },
    ],
    ignored_symptoms: ['vomiting'],
    mapped_symptoms: [{ input: 'abdominal pain', symptom: 'E_55_@_V_187' }, { input: 'diarrhea', symptom: 'E_51' }],
    symptoms_used: ['E_53', 'E_55_@_V_187', 'E_51'],
    model_version: 'ddxplus-v1',
    disclaimer: 'Not a diagnosis.',
    context_note: 'Research dataset.',
    age_used: 35,
    age_group_used: 'adult',
    age_source: 'median',
    sex_used: 'unknown',
    probability_mode: 'isotonic calibrated predict_proba',
    within_model_scope: false,
    evidence_quality: 'out_of_scope_syndrome',
    scope_note: 'Common gastrointestinal infections are not represented in the 49 acute conditions.',
    gate_reasons: ['Clinical presentation resembles acute gastroenteritis / enteritis (outside model scope)'],
    suggested_followups: ['Stay hydrated with oral rehydration solutions and water.'],
  };

  const validated = validateDiseasePrediction(outOfScopeMock);
  assert.equal(validated.within_model_scope, false);
  assert.equal(validated.evidence_quality, 'out_of_scope_syndrome');
  assert.ok(validated.uncertain);
  assert.equal(validated.disease_safety_floor, null);
});

test('Scenario 9: Severe abdominal pain triggers independent emergency triage', () => {
  const rawInput = {
    age: 'adult',
    symptom: 'severe abdominal pain',
    symptoms: ['severe abdominal pain', 'vomiting', 'fever'],
    duration: '< 1 day',
    severity: 'severe',
    medications: ['none'],
    language: 'en',
  };
  const parsed = parseAssessment(rawInput);
  const triageResult = evaluateAssessment(parsed);
  assert.equal(triageResult.urgency, 'High');
  assert.equal(triageResult.score, 100);
  assert.equal(triageResult.hasRedFlag, true);
  assert.ok(triageResult.factors.some(f => f.id === 'severe_abdominal_pain'));
});

test('Scenario 10: Sudden severe headache with neurological symptoms triggers emergency triage', () => {
  const rawInput = {
    age: 'adult',
    symptom: 'sudden severe headache',
    symptoms: ['sudden severe headache', 'weakness on one side'],
    duration: '< 1 day',
    severity: 'severe',
    medications: ['none'],
    language: 'en',
  };
  const parsed = parseAssessment(rawInput);
  const triageResult = evaluateAssessment(parsed);
  assert.equal(triageResult.urgency, 'High');
  assert.equal(triageResult.score, 100);
  assert.equal(triageResult.hasRedFlag, true);
  assert.ok(triageResult.factors.some(f => f.id === 'sudden_severe_headache'));
  assert.ok(triageResult.factors.some(f => f.id === 'weakness_of_one_body_side'));
});


