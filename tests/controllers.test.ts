import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { evaluateAssessment, assessmentContext } from '@/lib/assessment/evaluate';
import { calculateRisk } from '@/lib/ai-engine/scoring/engine';
import { collectSymptoms } from '@/lib/assessment/findings';
import { matchVoiceToOption } from '@/utils/matchVoiceInput';
import * as flow from '@/components/ai-question-engine/questionFlow';

// Deterministic React hook harness: runs the real controllers, with queued effects,
// memoized callbacks, state, refs and controllable network completion order.
function harness(file: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const slots: { value?: unknown; deps?: unknown[]; cleanup?: () => void }[] = [];
  let cursor = 0, dirty = false; let effects: (() => void)[] = [];
  const same = (a?: unknown[], b?: unknown[]) => !!a && !!b && a.length === b.length && a.every((v,i) => v === b[i]);
  const react = {
    useState(initial: unknown) { const i = cursor++; if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, (v: unknown) => { const next = typeof v === 'function' ? v(slots[i].value) : v; if (next !== slots[i].value) { slots[i].value = next; dirty = true; } }]; },
    useRef(initial: unknown) { const i = cursor++; if (!slots[i]) slots[i] = { value: { current: initial } }; return slots[i].value; },
    useCallback(callback: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: callback, deps }; return slots[i].value; },
    useEffect(effect: () => (() => void) | void, deps?: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); const cleanup = effect(); if (cleanup) slots[i].cleanup = cleanup; }); } },
    createContext: () => ({ Provider: 'provider' }),
  };
  const fixtureModule = { exports: {} as Record<string, (...args: unknown[]) => unknown> };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { module: fixtureModule, exports: fixtureModule.exports, require: (key: string) => {
    if (key === 'react') return react;
    if (key === 'react/jsx-runtime') return { jsx: (_: unknown, props: { value: unknown }) => props.value };
    if (!(key in dependencies)) throw new Error('Unexpected import ' + key);
    return dependencies[key];
  }, AbortController, AbortSignal, setTimeout, clearTimeout, console, ...globals }, { filename: file });
  return {
    render(name: string, props: unknown = {}) { let value: unknown; let iterations = 0; do { if (++iterations > 30) throw new Error('Render loop'); dirty = false; cursor = 0; effects = []; value = fixtureModule.exports[name](props); for (const effect of effects) effect(); } while (dirty); return value as Record<string, any>; },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
const payload = { age: 'adult', symptoms: ['cough'], severity: 'mild', duration: '< 1 day', medications: [], aiAnswers: {}, aiAnswerLabels: {}, language: 'en' };
const dependencies = { '@/lib/assessment/evaluate': { evaluateAssessment, assessmentContext } };
const settle = () => new Promise(resolve => setImmediate(resolve));
const response = (data: unknown, ok = true) => ({ ok, json: async () => data });

test('model failure on a later assessment clears earlier confidence and advice', async () => {
  let mode = 'success';
  const h = harness('app/context/AppContext.tsx', dependencies, { fetch: async (url: string) => {
    if (mode === 'failure') throw new Error('Network unavailable');
    if (url === '/api/explanation') return response({});
    if (url.startsWith('/api/ml/')) return response({}, false);
    if (url === '/api/sessions') { if (mode === 'created') { mode = 'success'; return response({ result: { ...evaluateAssessment(payload), confidenceScore: .96, confidenceLevel: 'High', primaryAction: 'First assessment advice' } }); } mode = 'created'; return response({ sessionId: 'first' }); }
  } });
  let app = h.render('AppProvider'); app.handleAIComplete(payload); await settle(); app = h.render('AppProvider');
  assert.equal(app.mlScore, 96); assert.equal(app.primaryAction, 'First assessment advice');
  app.startTest(); mode = 'failure'; app = h.render('AppProvider'); app.handleAIComplete(payload); await settle(); app = h.render('AppProvider');
  assert.equal(app.mlScore, 0); assert.equal(app.mlLevel, 'unavailable'); assert.equal(app.saveStatus, 'failed'); assert.notEqual(app.primaryAction, 'First assessment advice');
  h.unmount();
});

test('late completion from a canceled assessment cannot update a newer one', async () => {
  let completeOld: (data: unknown) => void = () => {}; let oldPatch = true;
  const h = harness('app/context/AppContext.tsx', dependencies, { fetch: async (url: string, init: { method: string }) => {
    if (url === '/api/explanation') return response({});
    if (url.startsWith('/api/ml/')) return response({}, false);
    if (init.method === 'POST') return response({ sessionId: 'fixture' });
    if (oldPatch) { oldPatch = false; return new Promise(resolve => { completeOld = resolve; }); }
    return response({ result: { ...evaluateAssessment(payload), confidenceScore: null, confidenceLevel: 'unavailable' } });
  } });
  let app = h.render('AppProvider'); app.handleAIComplete({ ...payload, symptoms: ['chest_pain'] }); await settle(); app = h.render('AppProvider'); app.startTest(); app = h.render('AppProvider'); app.handleAIComplete(payload); await settle();
  completeOld(response({ result: { ...evaluateAssessment({ ...payload, symptoms: ['chest_pain'] }), confidenceScore: .99, confidenceLevel: 'High' } })); await settle(); app = h.render('AppProvider');
  assert.equal(app.riskScore, 12); assert.equal(app.mlScore, 0); assert.equal(app.saveStatus, 'saved'); h.unmount();
});

test('save retry reuses the created assessment instead of creating duplicate records', async () => {
  let posts = 0, patches = 0;
  const h = harness('app/context/AppContext.tsx', dependencies, { fetch: async (url: string, init: { method: string }) => {
    if (url === '/api/explanation') return response({});
    if (url.startsWith('/api/ml/')) return response({}, false);
    if (init.method === 'POST') { posts++; return response({ sessionId: 'reuse-me' }); }
    if (++patches === 1) return response({}, false);
    return response({ result: { ...evaluateAssessment(payload), confidenceScore: null } });
  } });
  let app = h.render('AppProvider'); app.handleAIComplete(payload); await settle(); app = h.render('AppProvider'); assert.equal(app.saveStatus, 'failed'); app.retrySave(); await settle(); app = h.render('AppProvider');
  assert.equal(app.saveStatus, 'saved'); assert.equal(posts, 1); assert.equal(patches, 2); h.unmount();
});

test('first adaptive request includes selected symptoms; new danger signs finish at emergency risk', async () => {
  const contexts: any[] = [];
  let completed: typeof payload | undefined;
  const noop = () => {};
  const h = harness('components/ai-question-engine/useQuestionEngine.ts', {
    '@/services/questionService': { fetchAIQuestion: async (context: unknown) => { contexts.push(context); return { id: 'ai_q1', key: 'ai_q1', type: 'mcq', question: { en: 'Other findings?', hi: 'अन्य?', mr: 'इतर?' }, options: [{ value: 'confusion', label: { en: 'Sudden confusion', hi: 'भ्रम', mr: 'गोंधळ' } }, { value: 'none', label: { en: 'None', hi: 'नहीं', mr: 'नाही' } }] }; } },
    '@/utils/matchVoiceInput': { matchVoiceToOption },
    './useSarvamTTS': { useSarvamTTS: () => ({ speak: noop, stop: noop, isSpeaking: false }) },
    './useSarvamSTT': { useSarvamSTT: () => ({ startRecording: async () => 'teen', stopRecording: async () => '', cancelRecording: noop, isRecording: false }) },
    './useSarvamTranslate': { useSarvamTranslate: () => ({ translate: async (value: string) => value }) },
    './questionFlow': flow, '@/lib/ai-engine/scoring/engine': { calculateRisk }, '@/lib/assessment/findings': { collectSymptoms },
  });
  const props = { onComplete: (value: typeof payload) => { completed = value; } };
  let q = h.render('useQuestionEngine', props); q.handleOptionToggle('adult'); q = h.render('useQuestionEngine', props); await q.handleNext(); q = h.render('useQuestionEngine', props);
  q.handleOptionToggle('cough'); q = h.render('useQuestionEngine', props); await q.handleNext(); q = h.render('useQuestionEngine', props);
  assert.deepEqual([...contexts[0].symptoms], ['cough']); assert.equal(contexts[0].riskSnapshot.score, 12);
  q.handleOptionToggle('confusion'); q = h.render('useQuestionEngine', props); await q.handleNext(); q = h.render('useQuestionEngine', props);
  assert.equal(q.redFlagPending, true); q.acknowledgeRedFlag(); assert.ok(completed); assert.equal(evaluateAssessment(completed).score, 100); h.unmount();
});


test('Groq extraction is rule-checked before saving; extracted red flags remain High', async () => {
  let stored: any;
  const h = harness('app/context/AppContext.tsx', dependencies, { fetch: async (url: string, init: { method: string; body: string }) => {
    if (url === '/api/ml/extract') return response({ symptoms: ['chest_pain'] });
    if (url === '/api/ml/disease') return response({}, false);
    if (url === '/api/explanation') return response({});
    if (init.method === 'POST') return response({ sessionId: 'extracted' });
    stored = JSON.parse(init.body).assessment;
    return response({ result: evaluateAssessment(stored) });
  } });
  let app = h.render('AppProvider'); app.handleAIComplete(payload); await settle(); app = h.render('AppProvider');
  assert.ok(stored.symptoms.includes('chest_pain')); assert.equal(app.riskScore, 100); assert.equal(app.riskLevel, 'High');
  assert.equal(app.saveStatus, 'saved'); h.unmount();
});

test('late disease predictions from a canceled assessment cannot replace the new result', async () => {
  let first = true; let completeOld: (value: unknown) => void = () => {};
  const h = harness('app/context/AppContext.tsx', dependencies, { fetch: async (url: string, init: { method: string; body: string }) => {
    if (url === '/api/ml/extract') return response({}, false);
    if (url === '/api/ml/disease') {
      if (first) { first = false; return new Promise(resolve => { completeOld = resolve; }); }
      return response({ model_version: 'new-model', top3: [], red_flag_override: false });
    }
    if (url === '/api/explanation') return response({});
    if (init.method === 'POST') return response({ sessionId: 'fixture' });
    return response({ result: evaluateAssessment(JSON.parse(init.body).assessment) });
  } });
  let app = h.render('AppProvider'); app.handleAIComplete(payload); await settle(); app = h.render('AppProvider'); app.startTest();
  app = h.render('AppProvider'); app.handleAIComplete(payload); await settle();
  completeOld(response({ model_version: 'old-model', top3: [], red_flag_override: true })); await settle(); app = h.render('AppProvider');
  assert.equal(app.diseasePrediction.model_version, 'new-model'); assert.equal(app.riskLevel, 'Low'); h.unmount();
});
