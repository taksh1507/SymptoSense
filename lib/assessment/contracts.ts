import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
export class InputError extends Error {}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Expected an object');
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string, max = 500): string {
  if (typeof value !== 'string' || value.length > max) throw new InputError('Invalid ' + name);
  return value.trim();
}
export function choices(value: unknown, name: string, allowed: readonly string[]): string {
  const result = text(value, name, 80);
  if (!allowed.includes(result)) throw new InputError('Invalid ' + name);
  return result;
}
function strings(value: unknown, name: string, max = 20): string[] {
  if (!Array.isArray(value) || value.length > max) throw new InputError('Invalid ' + name);
  return value.map(v => text(v, name, 500)).filter(Boolean);
}
function answers(value: unknown): Record<string, string> {
  const entries = Object.entries(record(value ?? {}));
  if (entries.length > 6) throw new InputError('Too many adaptive answers');
  return Object.fromEntries(entries.map(([k, v]) => [text(k, 'answer key', 80), text(v, 'answer', 500)]));
}
export function parseAssessment(value: unknown): FinalAssessmentPayload {
  const b = record(value);
  const symptoms = strings(b.symptoms, 'symptoms');
  const customSymptom = b.customSymptom ? text(b.customSymptom, 'custom symptom') : undefined;
  if (!symptoms.length && !customSymptom) throw new InputError('At least one symptom is required');
  return {
    age: choices(b.age, 'age', ['child', 'teen', 'adult', 'elderly']), symptoms, customSymptom,
    aiAnswers: answers(b.aiAnswers), aiAnswerLabels: answers(b.aiAnswerLabels),
    duration: choices(b.duration, 'duration', ['< 1 day', '1-3 days', '4-7 days', '> 1 week']),
    severity: choices(b.severity, 'severity', ['mild', 'moderate', 'severe', 'critical']),
    medications: strings(b.medications, 'medical history'),
    customMedication: b.customMedication ? text(b.customMedication, 'custom medication') : undefined,
    language: choices(b.language, 'language', ['en', 'hi', 'mr']),
  };
}
export function serializeAnswers(payload: FinalAssessmentPayload) {
  const fields: Record<string, string | string[]> = {
    age: payload.age, symptoms: payload.symptoms, severity: payload.severity, duration: payload.duration,
    medications: payload.medications, customSymptom: payload.customSymptom ?? '', customMedication: payload.customMedication ?? '',
    ...payload.aiAnswers,
  };
  return Object.entries(fields).map(([questionId, answer]) => ({ questionId, answer, timestamp: Date.now() }));
}
