import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
import { collectSymptoms, normalizeClinicalValue, isDeniedFinding } from '@/lib/assessment/findings';
export interface MLFeatures {
  age_group: number; severity: number; duration: number; fever: number; cough: number;
  chest_pain: number; dizziness: number; fatigue: number; diabetes: number; heart_disease: number;
  rule_score?: number; risk_level?: number; symptom_intensity_score: number;
  symptom_consistency_score: number; symptom_progression: number;
  answer_confidence_proxy: number; ambiguity_score: number; multi_symptom_density: number;
}
export function mapAnswersToMLFeatures(data: Partial<FinalAssessmentPayload>): MLFeatures {
  const symptoms = new Set(collectSymptoms(data.symptoms ?? [], data.customSymptom, Object.values(data.aiAnswerLabels ?? {})));
  const conditions = new Set([...(data.medications ?? []), ...(data.customMedication ? [data.customMedication] : [])].filter(m => !isDeniedFinding(m)).map(m => normalizeClinicalValue(m).replace(/ /g, '_')));
  const severity = data.severity === 'moderate' ? 2 : data.severity === 'critical' ? 4 : data.severity === 'severe' ? 3 : 1;
  const duration = data.duration === '1-3 days' ? 2 : data.duration === '> 1 week' ? 4 : data.duration === '4-7 days' ? 3 : 1;
  const labels = Object.values(data.aiAnswerLabels ?? {}).join('. ').toLowerCase();
  const codes = Object.values(data.aiAnswers ?? {});
  const positive = labels.split(/[.;!?]|\bbut\b/).filter(t => !/\b(no|not|without|denies|none)\b/.test(t)).join(' ');
  const uncertain = /\b(not sure|unsure|unclear|maybe|don't know)\b/.test(labels) || codes.some(v => ['unsure', 'not_sure'].includes(v));
  const worsening = codes.includes('worsening') || /\b(worsening|getting worse|increasing|spreading)\b/.test(positive);
  const improving = codes.includes('improving') || /\b(improving|getting better|subsiding|resolving)\b/.test(positive);
  const intensity = /\b(severe|unbearable|extreme|critical)\b/.test(positive) ? 3 : severity;
  const conflict = severity === 1 && intensity === 3;
  return {
    age_group: data.age === 'child' ? 0 : data.age === 'elderly' ? 2 : 1, severity, duration,
    fever: Number(symptoms.has('fever')), cough: Number(symptoms.has('cough')),
    chest_pain: Number(symptoms.has('chest_pain')), dizziness: Number(symptoms.has('dizziness')),
    fatigue: Number(symptoms.has('fatigue')), diabetes: Number(conditions.has('diabetes')),
    heart_disease: Number(conditions.has('heart_disease')), symptom_intensity_score: intensity,
    symptom_consistency_score: conflict ? 0.6 : 1, symptom_progression: worsening ? 2 : improving ? 0 : 1,
    answer_confidence_proxy: Math.max(0, 1 - (uncertain ? 0.25 : 0) - (data.customSymptom || data.customMedication ? 0.15 : 0)),
    ambiguity_score: Math.min(1, (conflict ? 0.5 : 0) + (uncertain ? 0.3 : 0)),
    multi_symptom_density: Math.min(1, symptoms.size / 8),
  };
}
export const FEATURE_RANGES: Record<keyof MLFeatures, readonly [number, number]> = {
  age_group: [0, 2], severity: [1, 4], duration: [1, 4], fever: [0, 1], cough: [0, 1], chest_pain: [0, 1],
  dizziness: [0, 1], fatigue: [0, 1], diabetes: [0, 1], heart_disease: [0, 1], rule_score: [0, 100], risk_level: [0, 2],
  symptom_intensity_score: [0, 4], symptom_consistency_score: [0, 1], symptom_progression: [0, 2],
  answer_confidence_proxy: [0, 1], ambiguity_score: [0, 1], multi_symptom_density: [0, 1],
};
export function validateFeatures(value: unknown): MLFeatures {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid feature vector');
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some(k => !(k in FEATURE_RANGES))) throw new Error('Unknown feature');
  const result: Record<string, number> = {};
  for (const [key, [min, max]] of Object.entries(FEATURE_RANGES)) {
    const v = source[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Invalid feature: ' + key);
    if (['age_group', 'severity', 'duration', 'fever', 'cough', 'chest_pain', 'dizziness', 'fatigue', 'diabetes', 'heart_disease', 'risk_level'].includes(key) && !Number.isInteger(v)) throw new Error('Expected integer feature: ' + key);
    result[key] = v;
  }
  return result as unknown as MLFeatures;
}
