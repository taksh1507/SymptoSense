import vocabulary from './symptom-list.json';
import { mlBaseUrl } from './service';
export const DISEASE_SYMPTOMS: string[] = vocabulary;
export interface DiseasePrediction {
  top3: { disease: string; probability: number }[];
  confidence: number; uncertain: boolean; urgency: 'Low' | 'Medium' | 'High';
  model_urgency: 'Low' | 'Medium' | 'High'; red_flag_override: boolean;
  disease_safety_override: boolean; disease_safety_floor: 'Medium' | 'High' | null; disease_safety_conditions: string[];
  shap_top5: { symptom: string; contribution: number; present: boolean }[];
  ignored_symptoms: string[]; mapped_symptoms: { input: string; symptom: string }[]; symptoms_used: string[];
  uncertainty_threshold: number; model_version: string; disclaimer: string; context_note: string;
  explanation?: string;
}
export interface DiseaseRequest { symptoms: string[]; age_group?: string; severity?: string; duration?: string }
export function parseDiseaseRequest(value: unknown): DiseaseRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(k => !['symptoms', 'age_group', 'severity', 'duration'].includes(k))) throw new Error('Unknown field');
  if (!Array.isArray(body.symptoms) || !body.symptoms.length || body.symptoms.length > 132 || body.symptoms.some(s => typeof s !== 'string' || !s.trim() || s.length > 100)) throw new Error('Supply non-empty symptom strings');
  for (const key of ['age_group', 'severity', 'duration']) if (body[key] !== undefined && (typeof body[key] !== 'string' || (body[key] as string).length > 80)) throw new Error('Invalid context');
  return body as unknown as DiseaseRequest;
}
export function validateDiseasePrediction(value: unknown): DiseasePrediction {
  if (!value || typeof value !== 'object') throw new Error('Invalid disease response');
  const result = value as DiseasePrediction;
  const probability = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
  if (!Array.isArray(result.top3) || result.top3.length !== 3 || result.top3.some(v => typeof v.disease !== 'string' || !v.disease || !probability(v.probability)) || !probability(result.confidence) || result.confidence !== result.top3[0].probability || !probability(result.uncertainty_threshold) || typeof result.uncertain !== 'boolean' || result.uncertain !== (result.confidence < result.uncertainty_threshold) || !['Low', 'Medium', 'High'].includes(result.urgency) || !['Low', 'Medium', 'High'].includes(result.model_urgency) || typeof result.red_flag_override !== 'boolean' || (result.red_flag_override && result.urgency !== 'High') || typeof result.disease_safety_override !== 'boolean' || ![null, 'Medium', 'High'].includes(result.disease_safety_floor) || !Array.isArray(result.disease_safety_conditions) || result.disease_safety_conditions.some(v => typeof v !== 'string')) throw new Error('Invalid disease probability');
  if (!Array.isArray(result.shap_top5) || result.shap_top5.length !== 5 || result.shap_top5.some(v => !vocabulary.includes(v.symptom) || !Number.isFinite(v.contribution) || typeof v.present !== 'boolean') || !Array.isArray(result.ignored_symptoms) || result.ignored_symptoms.some(v => typeof v !== 'string') || !Array.isArray(result.symptoms_used) || result.symptoms_used.some(v => !vocabulary.includes(v)) || typeof result.model_version !== 'string' || typeof result.disclaimer !== 'string') throw new Error('Invalid disease explanation');
  return result;
}
export async function requestDisease(input: DiseaseRequest): Promise<DiseasePrediction> {
  const response = await fetch(mlBaseUrl() + '/predict-disease', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error('Disease inference failed'), { status: response.status, detail: body.detail });
  return validateDiseasePrediction(body);
}
