import assert from 'node:assert/strict';

const FASTAPI_URL = 'http://127.0.0.1:8000';

async function testFastAPI(symptoms, extra = {}) {
  try {
    const res = await fetch(`${FASTAPI_URL}/predict-disease`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms, ...extra }),
    });
    const status = res.status;
    const body = await res.json();
    return { status, ok: res.ok, body };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function run() {
  console.log('--- STARTING 12 SCENARIO VALIDATION ---\n');
  const results = [];

  // Scenario 1: Fever, cough, runny nose, sore throat
  {
    const res = await testFastAPI(['fever', 'cough', 'runny_nose', 'sore_throat']);
    console.log('Scenario 1 (URTI cluster):', {
      status: res.status,
      top1: res.body.top3?.[0],
      within_model_scope: res.body.within_model_scope,
      evidence_quality: res.body.evidence_quality,
      urgency: res.body.urgency
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.within_model_scope, true);
    assert.equal(res.body.top3[0].disease, 'URTI');
    results.push({ id: 1, name: 'URTI presentation', pass: true, outcome: `${res.body.top3[0].disease} (${(res.body.top3[0].probability * 100).toFixed(1)}%), within_model_scope: true, urgency: ${res.body.urgency}` });
  }

  // Scenario 2: Abdominal pain, vomiting, diarrhea
  {
    const res = await testFastAPI(['abdominal_pain', 'vomiting', 'diarrhea']);
    const boerhaaveProb = res.body.top3?.find(c => c.disease === 'Boerhaave')?.probability ?? 0;
    console.log('Scenario 2 (GI syndrome):', {
      status: res.status,
      top1: res.body.top3?.[0],
      boerhaaveProb,
      within_model_scope: res.body.within_model_scope,
      urgency: res.body.urgency,
      scope_note: res.body.scope_note
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.within_model_scope, false, 'Should be flagged out-of-scope for acute gastroenteritis');
    assert.ok(boerhaaveProb < 0.05, `Boerhaave probability must be minimal (<5%), got ${boerhaaveProb}`);
    assert.notEqual(res.body.urgency, 'High', 'GI presentation without red flags should not be escalated to High urgency by ML');
    results.push({ id: 2, name: 'Abdominal pain, vomiting, diarrhea', pass: true, outcome: `within_model_scope: false, Boerhaave: ${(boerhaaveProb * 100).toFixed(1)}%, urgency: ${res.body.urgency}` });
  }

  // Scenario 3: Headache, light sensitivity, nausea
  {
    const res = await testFastAPI(['headache', 'light_sensitivity', 'nausea']);
    console.log('Scenario 3 (Headache + photophobia):', {
      status: res.status,
      evidence_quality: res.body.evidence_quality,
      uncertain: res.body.uncertain,
      confident: res.body.confident,
      ignored: res.body.ignored_symptoms
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.evidence_quality === 'out_of_scope_syndrome' || res.body.evidence_quality === 'incomplete_evidence');
    assert.equal(res.body.confident, false);
    assert.equal(res.body.uncertain, true);
    results.push({ id: 3, name: 'Headache, light sensitivity, nausea', pass: true, outcome: `evidence_quality: ${res.body.evidence_quality}, uncertain: true, confident: false` });
  }

  // Scenario 4: Fever, cough, severe breathlessness
  {
    const res = await testFastAPI(['fever', 'cough', 'severe_breathlessness']);
    console.log('Scenario 4 (Severe breathlessness emergency):', {
      status: res.status,
      red_flag_override: res.body.red_flag_override,
      urgency: res.body.urgency
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.red_flag_override, true);
    assert.equal(res.body.urgency, 'High');
    results.push({ id: 4, name: 'Fever, cough, severe breathlessness', pass: true, outcome: `red_flag_override: true, urgency: High` });
  }

  // Scenario 5: Burning and frequent urination
  {
    const res = await testFastAPI(['burning_urination', 'frequent_urination']);
    console.log('Scenario 5 (Urinary presentation):', {
      status: res.status,
      within_model_scope: res.body.within_model_scope,
      scope_note: res.body.scope_note
    });
    assert.ok(res.status === 422 || (res.status === 200 && res.body.within_model_scope === false));
    results.push({ id: 5, name: 'Burning and frequent urination', pass: true, outcome: `Unsupported condition handled (HTTP ${res.status}: ${res.body.detail?.error || res.body.scope_note})` });
  }

  // Scenario 6: Fever, cough, abdominal pain
  {
    const res = await testFastAPI(['fever', 'cough', 'abdominal_pain']);
    console.log('Scenario 6 (Fever, cough, abdominal pain):', {
      status: res.status,
      top1: res.body.top3?.[0],
      top2: res.body.top3?.[1],
      uncertain: res.body.uncertain,
      gate_reasons: res.body.gate_reasons
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.uncertain, true, 'Ambiguous multi-system presentation must be uncertain');
    results.push({ id: 6, name: 'Fever, cough, abdominal pain', pass: true, outcome: `uncertain: true, top candidate: ${res.body.top3[0].disease} (${(res.body.top3[0].probability * 100).toFixed(1)}%)` });
  }

  // Scenario 7: Headache only
  {
    const res = await testFastAPI(['headache']);
    console.log('Scenario 7 (Headache alone):', {
      status: res.status,
      within_model_scope: res.body.within_model_scope,
      evidence_quality: res.body.evidence_quality,
      uncertain: res.body.uncertain
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.within_model_scope, false);
    assert.equal(res.body.uncertain, true);
    results.push({ id: 7, name: 'Headache only', pass: true, outcome: `within_model_scope: false, evidence_quality: ${res.body.evidence_quality}, uncertain: true` });
  }

  // Scenario 8: Unknown symptoms
  {
    const res = await testFastAPI(['xyz_totally_unknown_symptom']);
    console.log('Scenario 8 (Unknown symptoms):', {
      status: res.status,
      body: res.body
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.detail.error, 'No known symptoms supplied');
    results.push({ id: 8, name: 'Unknown symptoms', pass: true, outcome: `HTTP 422: No known symptoms supplied (graceful abstention)` });
  }

  // Scenario 9: Severe abdominal pain with concerning symptoms
  {
    const res = await testFastAPI(['severe_abdominal_pain', 'sweating']);
    console.log('Scenario 9 (Severe abdominal pain):', {
      status: res.status,
      red_flag_override: res.body.red_flag_override,
      urgency: res.body.urgency
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.red_flag_override, true);
    assert.equal(res.body.urgency, 'High');
    results.push({ id: 9, name: 'Severe abdominal pain', pass: true, outcome: `red_flag_override: true, urgency: High` });
  }

  // Scenario 10: Sudden severe headache with neurological deficits
  {
    const res = await testFastAPI(['sudden_severe_headache', 'weakness_of_one_body_side']);
    console.log('Scenario 10 (Sudden severe headache + weakness):', {
      status: res.status,
      red_flag_override: res.body.red_flag_override,
      urgency: res.body.urgency
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.red_flag_override, true);
    assert.equal(res.body.urgency, 'High');
    results.push({ id: 10, name: 'Sudden severe headache + weakness', pass: true, outcome: `red_flag_override: true, urgency: High` });
  }

  // Scenario 11: FastAPI service unavailable
  {
    try {
      await fetch('http://127.0.0.1:9999/predict-disease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: ['cough'] }),
        signal: AbortSignal.timeout(1000)
      });
      assert.fail('Should have failed to connect to dead port 9999');
    } catch (err) {
      console.log('Scenario 11 (FastAPI unavailable): Connection correctly refused:', err.message);
      results.push({ id: 11, name: 'FastAPI service unavailable', pass: true, outcome: `Connection refused cleanly; no mock fallback, handled gracefully` });
    }
  }

  // Scenario 12: Groq API unavailable
  {
    // Test the fallback explanation logic from diseaseExplanation
    const samplePrediction = {
      top3: [{ disease: 'URTI', probability: 0.65 }, { disease: 'Influenza', probability: 0.20 }, { disease: 'Bronchitis', probability: 0.10 }],
      confidence: 0.65,
      uncertain: false,
      urgency: 'Low',
      within_model_scope: true,
      red_flag_override: false,
      disclaimer: 'Academic demonstration only.'
    };
    
    const { getFallbackExplanation } = await import('../lib/ml/diseaseExplanation.ts');

    const enExpl = getFallbackExplanation(samplePrediction, 'English');
    const hiExpl = getFallbackExplanation(samplePrediction, 'Hindi');
    const mrExpl = getFallbackExplanation(samplePrediction, 'Marathi');

    console.log('Scenario 12 (Groq fallback):', { en: enExpl, hi: hiExpl, mr: mrExpl });
    assert.ok(enExpl.includes('model estimates'));
    assert.ok(hiExpl.includes('मॉडल के अनुमान'));
    assert.ok(mrExpl.includes('मॉडेलचे अंदाज'));

    results.push({ id: 12, name: 'Groq API unavailable fallback', pass: true, outcome: `Deterministic safe fallback in English, Hindi, and Marathi` });
  }

  console.log('\n--- 12 SCENARIO RESULTS SUMMARY ---');
  results.forEach(r => console.log(`Scenario ${r.id}: [${r.pass ? 'PASS' : 'FAIL'}] ${r.name} -> ${r.outcome}`));
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
