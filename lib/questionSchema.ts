import type { QuestionStep } from '@/components/ai-question-engine/types';
import { record, text, choices, InputError } from './assessment/contracts';
export const QUESTION_CATEGORIES = ['symptom_location', 'symptom_triggers', 'associated_symptoms', 'body_system_review', 'lifestyle_environmental', 'episode_history', 'clinical_red_flags'] as const;
export function validateQuestion(value: unknown, step: number): QuestionStep {
  const q = record(value); const question = record(q.question);
  const languageText = (o: Record<string, unknown>) => ({ en: text(o.en, 'English text', 400), hi: text(o.hi ?? o.en, 'Hindi text', 400), mr: text(o.mr ?? o.hi ?? o.en, 'Marathi text', 400) });
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) throw new InputError('Expected 3 or 4 options');
  const options = q.options.map(raw => { const o = record(raw); const v = text(o.value, 'option value', 60); if (!/^[a-z0-9_]+$/i.test(v)) throw new InputError('Invalid option value'); return { value: v, label: languageText(record(o.label)), emoji: o.emoji ? text(o.emoji, 'emoji', 16) : '•' }; });
  if (new Set(options.map(o => o.value)).size !== options.length) throw new InputError('Duplicate options');
  return { id: 'ai_q' + (step + 1), key: 'ai_q' + (step + 1), type: 'mcq', singleSelect: true, category: choices(q.category, 'category', QUESTION_CATEGORIES), question: languageText(question), options };
}
