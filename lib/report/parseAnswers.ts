import { parseAssessment } from '@/lib/assessment/contracts';
import { assessmentContext } from '@/lib/assessment/evaluate';
interface ParsedAssessment { primarySymptom: string; allSymptoms: string[]; severity: string; duration: string; additionalSymptoms: string[]; medicalHistory: string[]; }
export function parseStoredAssessment(answersJson: string, payloadJson?: string | null): ParsedAssessment {
  try {
    if (payloadJson) {
      const p = parseAssessment(JSON.parse(payloadJson)); const context = assessmentContext(p);
      return { primarySymptom: context.primarySymptom, allSymptoms: context.selected, severity: p.severity, duration: p.duration, additionalSymptoms: context.additionalSymptoms, medicalHistory: context.medicalHistory };
    }
    const values: Record<string, string> = Object.fromEntries(JSON.parse(answersJson || '[]').map((a: { questionId: string; answer: string | string[] }) => [a.questionId, Array.isArray(a.answer) ? a.answer.join(',') : String(a.answer)]));
    const symptoms = (values.symptoms ?? values.q1 ?? '').split(',').filter(Boolean);
    return { primarySymptom: symptoms[0] || values.customSymptom || 'general', allSymptoms: symptoms, severity: values.severity ?? values.q2 ?? 'mild', duration: values.duration ?? values.q3 ?? '< 1 day', additionalSymptoms: [...symptoms.slice(1), ...(values.q4 ?? '').split(',')].filter(s => s && s !== 'none'), medicalHistory: (values.medications ?? values.q11 ?? '').split(',').filter(s => s && s !== 'none') };
  } catch { return { primarySymptom: 'general', allSymptoms: [], severity: 'mild', duration: '< 1 day', additionalSymptoms: [], medicalHistory: [] }; }
}
