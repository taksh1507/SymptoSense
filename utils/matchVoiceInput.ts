import type { QuestionStep } from '@/components/ai-question-engine/types';
export function matchVoiceToOption(transcript: string, step: QuestionStep): string | null {
  const raw = transcript.trim().toLowerCase(); if (!raw) return null;
  const normalize = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  const input = normalize(raw);
  // Exact current values precede number synonyms (English "teen" is an age).
  const exact = step.options.find(o => [o.value, o.label.en, o.label.hi, o.label.mr].some(v => normalize(v) === input));
  if (exact) return exact.value;
  const numbers: Record<string, number> = { '1': 0, one: 0, first: 0, ek: 0, 'एक': 0, '2': 1, two: 1, second: 1, do: 1, 'दो': 1, '3': 2, three: 2, third: 2, 'तीन': 2, '4': 3, four: 3, fourth: 3, 'चार': 3 };
  if (numbers[input] !== undefined) return step.options[numbers[input]]?.value ?? null;
  // Negated free-form statements must not silently select the opposite option.
  if (/\b(no|not|without|don't|never)\b/.test(input) || /नहीं|नाही/u.test(input)) return null;
  if (step.key === 'duration') {
    if (/\b(more than|over) (a |one )?week\b/.test(input)) return '> 1 week';
    if (/\b(one|a|1) week\b/.test(input)) return '4-7 days';
    if (/\b(today|less than (a |one )?day|under 24 hours)\b/.test(input)) return '< 1 day';
  }
  const aliases: Record<string, string[]> = { mild: ['slight', 'हल्का', 'सौम्य'], moderate: ['medium', 'मध्यम'], severe: ['severe', 'extreme', 'गंभीर'], diabetes: ['diabetes', 'मधुमेह'], hypertension: ['hypertension', 'blood pressure', 'बीपी'] };
  const matches = step.options.filter(o => {
    const candidates = [normalize(o.value), normalize(o.label.en), normalize(o.label.hi), normalize(o.label.mr), ...(aliases[o.value] ?? [])];
    return candidates.some(c => c.length > 2 && (input === c || input.split(/[,;]|\band\b/).some(part => part.trim() === c)));
  });
  return matches.length === 1 ? matches[0].value : null;
}
