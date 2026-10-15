/** Real HTTP/auth/database/model checks. Only disposable test data is written. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(path.join(root, '.local'), { recursive: true });
const dir = mkdtempSync(path.join(root, '.local/integration-'));
const dbPath = path.join(dir, 'test.db');
const dbUrl = 'file:' + dbPath.replaceAll('\\', '/');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
async function freePort() { const s = createServer(); const port = await listen(s); await new Promise(r => s.close(r)); return port; }
const [webPort, mlPort] = await Promise.all([freePort(), freePort()]);
const url = 'http://127.0.0.1:' + webPort;
const mlUrl = 'http://127.0.0.1:' + mlPort;
const counts = new Map();
const redis = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  const commands = JSON.parse(body); const key = commands[0][1];
  const count = (counts.get(key) ?? 0) + 1; counts.set(key, count);
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify([{ result: count }, { result: 1 }]));
});
const redisPort = await listen(redis);
const env = { ...process.env, DATABASE_URL: dbUrl, SYMPTOSENSE_DB: dbPath, NEXTAUTH_URL: url, NEXTAUTH_SECRET: 'integration-only-secret-01234567890123456789',
  ML_SERVICE_URL: mlUrl, ML_SERVER_URL: '', ML_PORT: String(mlPort), SCHEDULER_DISABLED: '1', GROQ_API_KEY: '', SARVAM_API_KEY: '',
  GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', ADMIN_EMAILS: 'admin@example.test', RETRAIN_TOKEN: '', TRUST_PROXY: 'false',
  RATE_LIMIT_REST_URL: 'http://127.0.0.1:' + redisPort, RATE_LIMIT_REST_TOKEN: 'test-token', NEXT_TELEMETRY_DISABLED: '1' };
execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: root, env, stdio: 'pipe', windowsHide: true });
let logs = ''; const children = [];
function launch(command, args) { const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); children.push(child); child.stdout.on('data', c => { logs = (logs + c).slice(-12000); }); child.stderr.on('data', c => { logs = (logs + c).slice(-12000); }); return child; }
const python = process.env.PYTHON ?? (existsSync(path.join(root, '.venv/Scripts/python.exe')) ? path.join(root, '.venv/Scripts/python.exe') : 'python');
const ml = launch(python, ['-X', 'utf8', 'ml-service/server.py']);
const web = launch(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), process.argv.includes('--dev') ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', String(webPort)]);
async function ready(endpoint, child) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Service exited before startup');
    try { const r = await fetch(endpoint, { signal: AbortSignal.timeout(2000) }); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Service startup timed out');
}
function client() {
  const cookies = new Map();
  return async (pathname, method = 'GET', body, expected = 200) => {
    const headers = { Cookie: [...cookies].map(([k,v]) => k + '=' + v).join('; ') };
    if (body !== undefined) headers['Content-Type'] = body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json';
    const res = await fetch(url + pathname, { method, headers, body: body === undefined ? undefined : body instanceof URLSearchParams ? body : JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    for (const cookie of res.headers.getSetCookie()) { const part = cookie.split(';')[0]; const at = part.indexOf('='); cookies.set(part.slice(0, at), part.slice(at + 1)); }
    const raw = await res.text(); let data; try { data = JSON.parse(raw); } catch { data = raw; }
    const message = method + ' ' + pathname + ': ' + JSON.stringify(data).slice(0, 300);
    if (Array.isArray(expected)) assert.ok(expected.includes(res.status), message); else assert.equal(res.status, expected, message);
    return data;
  };
}
async function login(email) {
  const request = client();
  await request('/api/auth/register', 'POST', { name: 'Integration fixture', email, password: 'test-password-123' }, 201);
  const csrf = await request('/api/auth/csrf');
  await request('/api/auth/callback/credentials', 'POST', new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: 'test-password-123', json: 'true', callbackUrl: url + '/dashboard' }));
  const session = await request('/api/auth/session'); assert.ok(session.user?.id);
  return request;
}
function stop(child) { if (child.exitCode === null) child.kill(); }
try {
  await Promise.all([ready(url + '/api/auth/csrf', web), ready(mlUrl + '/health', ml)]);
  const anonymous = client();
  await anonymous('/api/sessions', 'GET', undefined, 401);
  await anonymous('/api/ml/predict', 'POST', {}, 401);
  await anonymous('/api/ml/disease', 'POST', { symptoms: ['itching'] }, 401);
  await anonymous('/api/ml/report', 'GET', undefined, 401);
  await anonymous('/api/auth/register', 'POST', { email: 'invalid', password: 'short' }, 400);
  const alice = await login('alice@example.test'); const bob = await login('bob@example.test');
  const admin = await login('admin@example.test');
  await alice('/api/ml/report', 'GET', undefined, 403);
  const mlReport = await admin('/api/ml/report'); assert.equal(mlReport.schema_version, 1);
  const insights = await admin('/dashboard/ml-insights'); assert.match(insights, /ML Insights/);
  await alice('/api/ml/extract', 'POST', { text: 'I have itching', language: 'English' }, 503);
  await alice('/api/ml/extract', 'POST', { text: 123 }, 400);
  await alice('/api/ml/disease', 'POST', { symptoms: [] }, 400);
  await alice('/api/ml/disease', 'POST', { symptoms: ['invented_symptom'] }, 422);
  const disease = await alice('/api/ml/disease', 'POST', { symptoms: ['itching', 'skin_rash', 'nodal_skin_eruptions'] });
  assert.equal(disease.top3.length, 3); assert.equal(disease.shap_top5.length, 5);
  assert.equal(disease.confidence, disease.top3[0].probability); assert.ok(disease.explanation);
  const emergencyDisease = await alice('/api/ml/disease', 'POST', { symptoms: ['itching', 'chest_pain'] });
  assert.equal(emergencyDisease.urgency, 'High'); assert.equal(emergencyDisease.red_flag_override, true);
  const created = await alice('/api/sessions', 'POST', { language: 'mr' });
  const assessment = { age: 'teen', symptoms: ['cough', 'headache'], aiAnswers: { ai_q1: 'option_a' }, aiAnswerLabels: { ai_q1: 'Sudden confusion' }, duration: '< 1 day', severity: 'mild', medications: ['diabetes', 'heart_disease', 'blood_thinners'], customMedication: 'asthma', language: 'mr' };
  await bob('/api/sessions?sessionId=' + created.sessionId, 'GET', undefined, 404);
  await bob('/api/sessions', 'PATCH', { sessionId: created.sessionId, assessment }, 404);
  const completed = await alice('/api/sessions', 'PATCH', { sessionId: created.sessionId, assessment, score: 0, urgency: 'Low' });
  assert.equal(completed.result.score, 100); assert.equal(completed.result.urgency, 'High');
  assert.equal(typeof completed.result.confidenceScore, 'number'); assert.ok(completed.result.modelVersion); assert.ok(completed.result.ruleVersion);
  assert.match(completed.result.primaryAction, /ताबडतोब|तात्काळ/);
  await alice('/api/sessions', 'PATCH', { sessionId: created.sessionId, assessment });
  await alice('/api/sessions', 'PATCH', { sessionId: created.sessionId, assessment: { ...assessment, severity: 'severe' } }, 409);
  const saved = await alice('/api/sessions?sessionId=' + created.sessionId);
  assert.deepEqual(JSON.parse(saved.assessmentPayload), assessment);
  const list = await alice('/api/sessions?page=1.5'); assert.equal(list.page, 1); assert.equal(list.total, 1);
  assert.equal((await bob('/api/sessions')).total, 0);
  await bob('/api/followups', 'POST', { sessionId: created.sessionId, improved: 'better' }, 404);
  const outcome1 = await alice('/api/followups', 'POST', { sessionId: created.sessionId, improved: 'better', contactedDoctor: true });
  const outcome2 = await alice('/api/followups', 'POST', { sessionId: created.sessionId, improved: 'recovered' });
  assert.equal(outcome1.id, outcome2.id); assert.equal(outcome2.reviewedCorrect, null);
  assert.equal((await alice('/api/followups')).length, 1); assert.equal((await bob('/api/followups')).length, 0);
  await alice('/api/model-health', 'GET', undefined, 403);
  await alice('/api/model-health', 'POST', { action: 'retrain' }, 403);
  await alice('/api/ml/log', 'POST', { features: { notes: 'bad' } }, 405);
  await alice('/api/ml/predict', 'POST', { cough: 2 }, 400);
  await alice('/api/sessions', 'PATCH', { sessionId: created.sessionId, assessment: null }, 400);
  await alice('/api/profile', 'POST', { phone: 'incorrect' }, 400);
  await alice('/api/profile', 'POST', { phone: '+910000000000', emailReminders: true, whatsappReminders: true });
  const cleared = await alice('/api/profile', 'POST', { phone: '' }); assert.equal(cleared.phone, null); assert.equal(cleared.whatsappReminders, false);
  const fallback = await alice('/api/explanation', 'POST', { sessionId: created.sessionId }); assert.ok(fallback.riskReasoning);
  const race = await alice('/api/sessions', 'POST', {});
  const raced = await Promise.all([
    alice('/api/sessions', 'PATCH', { sessionId: race.sessionId, assessment }, [200, 409]),
    alice('/api/sessions', 'PATCH', { sessionId: race.sessionId, assessment: { ...assessment, symptoms: ['fever'] } }, [200, 409]),
  ]);
  assert.equal(raced.filter(data => data.success).length, 1);
  assert.equal(raced.filter(data => data.error).length, 1);
  stop(ml); await new Promise(r => ml.once('exit', r));
  const diseaseOutage = await alice('/api/ml/disease', 'POST', { symptoms: ['itching'] }, 503);
  assert.equal(diseaseOutage.confidence, null); assert.equal(diseaseOutage.status, 'unavailable');
  assert.equal(diseaseOutage.top3, undefined);
  await admin('/api/ml/report', 'GET', undefined, 503);
  const second = await alice('/api/sessions', 'POST', {});
  const low = { ...assessment, symptoms: ['cough'], aiAnswers: {}, aiAnswerLabels: {}, medications: [], customMedication: undefined, language: 'en' };
  const unavailable = await alice('/api/sessions', 'PATCH', { sessionId: second.sessionId, assessment: low });
  assert.equal(unavailable.result.confidenceScore, null); assert.equal(unavailable.result.confidenceLevel, 'unavailable'); assert.equal(unavailable.result.score, 12);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    assert.equal(db.prepare('SELECT COUNT(*) n FROM PredictionLog').get().n, 3);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM PredictionLog WHERE testSessionId IS NULL OR userId IS NULL').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM FollowUp').get().n, 3);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM PredictionLog WHERE mlAvailable=0 AND predictedConfidence IS NULL').get().n, 1);
    for (const row of db.prepare('SELECT features FROM PredictionLog').all()) assert.equal(Object.keys(JSON.parse(row.features)).length, 18);
  } finally { db.close(); }
  const family = await alice('/api/sessions', 'POST', { personName: 'Family test fixture', isSelf: false, relation: 'Parent', gender: 'Female' });
  await alice('/api/sessions', 'PATCH', { sessionId: family.sessionId, assessment: low });
  assert.equal((await alice('/api/sessions?subject=family')).total, 1);
  assert.equal((await alice('/api/sessions?search=Family%20test')).total, 1);
  const members = await alice('/api/sessions?view=family');
  assert.equal(members.members[0].assessmentCount, 1);
  assert.equal((await bob('/api/sessions?view=family')).members.length, 0);
  if (process.argv.includes('--visual')) {
    const visualMl = launch(python, ['-X', 'utf8', 'ml-service/server.py']);
    await ready(mlUrl + '/health', visualMl);
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/visual-check.cjs'], { cwd: root, env: { ...env, UI_URL: url, UI_AUTH_CHECK: '1' }, windowsHide: true, stdio: 'inherit' });
      child.on('exit', code => code === 0 ? resolve() : reject(new Error('Visual checks failed: ' + code)));
      child.on('error', reject);
    });
  }
  console.log('PASS: real login, ownership, server scoring, persistence, full payload, localized emergency, linked inference, idempotency, outcomes, admin denial, validation, preferences model outage, disease inference, SHAP, extraction fallback, report authorization and ML Insights route.');
} catch (error) { console.error(logs); throw error; }
finally { for (const child of children) stop(child); await new Promise(r => redis.close(r)); }
