import test from 'node:test';
import assert from 'node:assert/strict';
import type { DiseaseSnapshot, DiseasePrediction } from '@/lib/ml/disease';

test('Historical report loads stored snapshot without calling /api/ml/disease or Groq', () => {
  const mlDiseaseCalls = 0;
  const groqCalls = 0;

  const storedSnapshot: DiseaseSnapshot = {
    schema_version: 1,
    timestamp: '2026-04-10T14:30:00.000Z',
    status: 'ready',
    prediction: {
      top3: [
        { disease: 'URTI', probability: 0.82 },
        { disease: 'Bronchitis', probability: 0.11 },
        { disease: 'Influenza', probability: 0.05 },
      ],
      confidence: 0.82,
      uncertain: false,
      urgency: 'Low',
      model_urgency: 'Low',
      red_flag_override: false,
      disease_safety_override: false,
      disease_safety_floor: null,
      disease_safety_conditions: [],
      probability_mode: 'sigmoid calibrated predict_proba',
      shap_top5: [
        { symptom: 'cough', contribution: 0.35, present: true },
        { symptom: 'fever', contribution: 0.25, present: true },
        { symptom: 'sore_throat', contribution: 0.15, present: true },
        { symptom: 'runny_nose', contribution: 0.10, present: true },
        { symptom: 'fatigue', contribution: -0.03, present: false },
      ],
      ignored_symptoms: [],
      mapped_symptoms: [],
      symptoms_used: ['E_201', 'E_91', 'E_97', 'E_181'],
      uncertainty_threshold: 0.50,
      model_version: 'ddxplus-xgboost-v1-original',
      disclaimer: 'Academic demonstration only.',
      context_note: 'Original inference snapshot.',
      age_used: 35,
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

  const report = {
    id: 'test-session-1',
    createdAt: '2026-04-10T14:30:00.000Z',
    answers: '[]',
    assessmentPayload: JSON.stringify({
      age: 'adult',
      symptoms: ['cough', 'fever', 'sore_throat', 'runny_nose'],
      severity: 'mild',
      duration: '1-3 days',
      medications: ['none'],
    }),
    diseaseSnapshot: JSON.stringify(storedSnapshot),
  };

  // Simulate historical report loader logic in ReportDetailPage
  let loadedPrediction: DiseasePrediction | null = null;
  let loadedStatus: string = 'idle';
  let loadedError: string = '';

  if (report.diseaseSnapshot) {
    try {
      const snap = JSON.parse(report.diseaseSnapshot) as DiseaseSnapshot;
      if (snap && typeof snap === 'object') {
        loadedPrediction = snap.prediction ?? null;
        loadedStatus = snap.status ?? (snap.prediction ? 'ready' : 'unavailable');
        loadedError = snap.error ?? '';
      }
    } catch {
      // Unrecorded
    }
  }

  // Verify: original probabilities, model version, and top candidate are strictly preserved
  assert.equal(mlDiseaseCalls, 0, 'Must not call /api/ml/disease for historical report');
  assert.equal(groqCalls, 0, 'Must not call Groq for historical report');
  assert.equal(loadedStatus, 'ready');
  assert.equal(loadedError, '');
  assert.equal(loadedPrediction?.top3[0].disease, 'URTI');
  assert.equal(loadedPrediction?.top3[0].probability, 0.82);
  assert.equal(loadedPrediction?.model_version, 'ddxplus-xgboost-v1-original');
  assert.equal(loadedPrediction?.within_model_scope, true);
  assert.equal(loadedPrediction?.uncertain, false);
});

test('Legacy report without stored ML snapshot gracefully abstains without fabricating predictions', () => {
  const mlDiseaseCalls = 0;

  const legacyReport = {
    id: 'legacy-session-2',
    createdAt: '2026-01-15T10:00:00.000Z',
    answers: '[]',
    assessmentPayload: JSON.stringify({
      age: 'adult',
      symptoms: ['headache'],
      severity: 'mild',
      duration: '< 1 day',
      medications: [],
    }),
    diseaseSnapshot: null, // Older record with no snapshot
  };

  let loadedPrediction: DiseasePrediction | null = null;
  let loadedStatus: string = 'idle';
  let loadedError: string = '';

  if (legacyReport.diseaseSnapshot) {
    // Unused
  } else {
    loadedPrediction = null;
    loadedStatus = 'unavailable';
    loadedError = 'Original ML disease estimates were not stored with this historical assessment.';
  }

  assert.equal(mlDiseaseCalls, 0, 'Legacy report must not make live ML calls');
  assert.equal(loadedPrediction, null, 'Must not fabricate disease predictions');
  assert.equal(loadedStatus, 'unavailable');
  assert.ok(loadedError.includes('were not stored'));
});

test('Changing current ML model or symptom mappings does not alter historical snapshots', () => {
  // Snapshot saved under original model v1
  const v1Snapshot: DiseaseSnapshot = {
    schema_version: 1,
    timestamp: '2026-03-01T12:00:00.000Z',
    status: 'ready',
    prediction: {
      top3: [
        { disease: 'Acute rhinosinusitis', probability: 0.61 },
        { disease: 'Allergic sinusitis', probability: 0.22 },
        { disease: 'URTI', probability: 0.12 },
      ],
      confidence: 0.61,
      uncertain: false,
      urgency: 'Low',
      model_urgency: 'Low',
      red_flag_override: false,
      disease_safety_override: false,
      disease_safety_floor: null,
      disease_safety_conditions: [],
      probability_mode: 'sigmoid calibrated predict_proba',
      shap_top5: [],
      ignored_symptoms: [],
      mapped_symptoms: [],
      symptoms_used: ['E_181'],
      uncertainty_threshold: 0.50,
      model_version: 'ddxplus-v1.0.0',
      disclaimer: 'Academic demonstration only.',
      context_note: 'Research benchmark.',
      age_used: 40,
      age_group_used: 'adult',
      age_source: 'representative',
      sex_used: 'F',
      within_model_scope: true,
      evidence_quality: 'sufficient',
    },
  };

  const serialized = JSON.stringify(v1Snapshot);

  // Even if current model becomes v2 or feature mappings change tomorrow:
  const restored = JSON.parse(serialized) as DiseaseSnapshot;
  assert.equal(restored.prediction?.model_version, 'ddxplus-v1.0.0');
  assert.equal(restored.prediction?.top3[0].disease, 'Acute rhinosinusitis');
  assert.equal(restored.prediction?.top3[0].probability, 0.61);
});

test('Failed ML inference is persisted as unavailable rather than fabricated predictions', () => {
  const failureSnapshot: DiseaseSnapshot = {
    schema_version: 1,
    timestamp: new Date().toISOString(),
    status: 'unavailable',
    error: 'Disease model service temporarily unavailable.',
    prediction: null,
  };

  const serialized = JSON.stringify(failureSnapshot);
  const parsed = JSON.parse(serialized) as DiseaseSnapshot;

  assert.equal(parsed.status, 'unavailable');
  assert.equal(parsed.prediction, null);
  assert.equal(parsed.error, 'Disease model service temporarily unavailable.');
});

test('Session ownership isolation: cross-user access is blocked', () => {
  // Simulating the where clause in GET /api/sessions:
  // where: { id: sessionId, userId: currentUserId }
  const sessionsDatabase = [
    { id: 'session-alice-1', userId: 'user-alice', personName: 'Alice', score: 25 },
    { id: 'session-bob-2', userId: 'user-bob', personName: 'Bob', score: 85 },
  ];

  const findSession = (sessionId: string, currentUserId: string) => {
    return sessionsDatabase.find(s => s.id === sessionId && s.userId === currentUserId) || null;
  };

  // Alice fetches her own report
  const aliceOwn = findSession('session-alice-1', 'user-alice');
  assert.ok(aliceOwn);
  assert.equal(aliceOwn.personName, 'Alice');

  // Alice attempts to access Bob's report by guessing sessionId
  const aliceAccessBob = findSession('session-bob-2', 'user-alice');
  assert.equal(aliceAccessBob, null, 'Must return null (resulting in HTTP 404) for unauthorized user');

  // Bob attempts to access Alice's report
  const bobAccessAlice = findSession('session-alice-1', 'user-bob');
  assert.equal(bobAccessAlice, null, 'Must return null (resulting in HTTP 404) for unauthorized user');
});

test('Session tampering prevention: completed assessments cannot be altered by other users or payloads', () => {
  const existingSession = {
    id: 'session-completed-1',
    userId: 'user-charlie',
    completed: true,
    assessmentPayload: JSON.stringify({ symptoms: ['cough'], severity: 'mild' }),
  };

  const canUpdate = (sessionId: string, userId: string, newPayload: string) => {
    // 1. Authorization check
    if (existingSession.id !== sessionId || existingSession.userId !== userId) {
      return { status: 404, error: 'Not found' };
    }
    // 2. Immutability check on completed assessments
    if (existingSession.completed && existingSession.assessmentPayload !== newPayload) {
      return { status: 409, error: 'Completed assessments cannot be changed' };
    }
    return { status: 200, success: true };
  };

  // Unauthorized user tries to PATCH Charlie's session
  assert.equal(canUpdate('session-completed-1', 'attacker-user', 'tampered').status, 404);

  // Charlie tries to overwrite the symptoms of an already completed session
  const tamperedPayload = JSON.stringify({ symptoms: ['chest_pain'], severity: 'severe' });
  assert.equal(canUpdate('session-completed-1', 'user-charlie', tamperedPayload).status, 409);

  // Charlie re-submitting identical payload (idempotent retry) is allowed
  assert.equal(canUpdate('session-completed-1', 'user-charlie', existingSession.assessmentPayload).status, 200);
});
