'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ConfidenceMeter } from './ConfidenceMeter';
import type { DiseasePrediction } from '@/lib/ml/disease';
export function DiseaseResults({ result, status, error }: { result: DiseasePrediction | null; status: string; error: string }) {
  if (!result) return <section className="card" style={{ padding: 24 }} aria-live="polite"><h2>Top 3 possible conditions</h2><p>{status === 'loading' ? 'Extracting symptoms and calculating disease probabilities…' : error || 'Disease prediction has not run yet.'}</p><p style={{ color: 'var(--text-3)', fontSize: 13 }}>Not a medical diagnosis. The rule triage result and emergency guidance remain available.</p></section>;
  const bars = result.shap_top5.map(v => ({ ...v, label: v.symptom.replace(/_/g, ' ') + (v.present ? ' (present)' : ' (absent)'), points: v.contribution * 100 }));
  return <section className="card" style={{ padding: 24, borderRadius: 20 }}>
    <h2 style={{ fontSize: 19 }}>Top 3 possible conditions</h2>
    <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{result.disclaimer}</p>
    {result.uncertain && <p role="status" style={{ padding: 14, borderRadius: 12, background: '#FFFBEB', color: '#92400E', fontWeight: 700 }}>Uncertain, please consult a doctor. The top probability is below the configured {(result.uncertainty_threshold * 100).toFixed(0)}% threshold.</p>}
    {result.red_flag_override && <p role="alert" style={{ color: 'var(--red)', fontWeight: 800 }}>Red-flag override: High urgency. Seek immediate medical attention; model probabilities cannot rule out an emergency.</p>}
    {result.disease_safety_override && <p role="alert" style={{ color: 'var(--red)', fontWeight: 800 }}>Safety floor applied: {result.disease_safety_floor} urgency because the model ranked {result.disease_safety_conditions.join(', ')}. This is a precautionary rule, not a diagnosis.</p>}
    {result.symptoms_used.length <= 1 && <p role="status" style={{ padding: 12, borderRadius: 10, background: 'var(--bg)', color: 'var(--text-2)' }}>Add more symptoms for a better-supported estimate. A single symptom often cannot distinguish between conditions.</p>}
    <ol style={{ padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
      {result.top3.map(condition => <li key={condition.disease} style={{ padding: 14, background: 'var(--bg)', borderRadius: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{condition.disease}</strong><span>{(condition.probability * 100).toFixed(1)}%</span></div><div style={{ height: 7, background: 'var(--border-faint)', borderRadius: 8, marginTop: 10 }}><div style={{ height: '100%', width: (condition.probability * 100) + '%', background: 'var(--red)', borderRadius: 8 }} /></div></li>)}
    </ol>
    <div className="ml-result-grid">
      <ConfidenceMeter score={result.confidence * 100} level={result.uncertain ? 'Low' : 'High'} kind="disease" explanation="Top prediction probability after training-only calibration. This does not measure clinical diagnostic accuracy." />
      <div style={{ minWidth: 0 }}><h3>Why this result?</h3><p style={{ fontSize: 12, color: 'var(--text-3)' }}>SHAP contributions to the top condition’s calibrated probability, in percentage points. Present and absent symptoms can influence the result; these are model associations.</p><div style={{ height: 300, width: '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={bars} layout="vertical" margin={{ left: 5, right: 15 }}><XAxis type="number" /><YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} /><Tooltip /><ReferenceLine x={0} stroke="#64748B" /><Bar dataKey="points" name="Probability contribution (points)">{bars.map(v => <Cell key={v.symptom} fill={v.points >= 0 ? '#15803D' : '#B91C1C'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </div>
    <p style={{ lineHeight: 1.7 }}>{result.explanation}</p>
    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{result.context_note} Safety-adjusted urgency: {result.urgency}. Experimental research urgency model: {result.model_urgency}. Model version: {result.model_version}.</p>
    {result.ignored_symptoms.length > 0 && <p style={{ fontSize: 12 }}>Outside the dataset vocabulary: {result.ignored_symptoms.join(', ')}.</p>}
  </section>;
}
