import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import { classifyUrgency } from '@/lib/ai-engine/scoring/thresholds';
import { extractAffirmedSymptoms } from '@/lib/assessment/findings';
import { evaluateAssessment } from '@/lib/assessment/evaluate';
import { mapAnswersToMLFeatures, validateFeatures } from '@/lib/ml/featureMapper';
import { parseAssessment, serializeAnswers } from '@/lib/assessment/contracts';
import { parseStoredAssessment } from '@/lib/report/parseAnswers';
import { matchVoiceToOption } from '@/utils/matchVoiceInput';
import { Q1_AGE, Q9_DURATION, Q10_SEVERITY } from '@/components/ai-question-engine/questionFlow';
import { isAdmin } from '@/lib/admin';
import { rateLimit } from '@/lib/rateLimit';
import { validateQuestion } from '@/lib/questionSchema';
import { readJson, readMultipart } from '@/lib/http';
import { mlBaseUrl } from '@/lib/ml/service';
const base = { age: 'adult', symptoms: ['cough'], aiAnswers: {}, aiAnswerLabels: {}, duration: '< 1 day', severity: 'mild', medications: ['none'], language: 'en' };
for (const symptom of ['chest_pain', 'chest pain', 'breathlessness', 'shortness_of_breath', 'difficulty_breathing', 'confusion', 'severe_bleeding', 'सीने में दर्द', 'छातीत दुखणे']) {
  test('emergency normalization: ' + symptom, () => {
    const result = evaluateAssessment(parseAssessment({ ...base, symptoms: [symptom] }));
    assert.equal(result.score, 100); assert.equal(result.urgency, 'High'); assert.equal(result.hasRedFlag, true);
  });
}
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
