/** Canonical findings shared by questionnaire, scoring, and feature extraction. */
import { RED_FLAGS } from '@/lib/redFlags';

const ALIASES: Record<string, string[]> = {
  chest_pain: ['chest pain', 'सीने में दर्द', 'छातीत दुखणे'],
  breathlessness: ['breathlessness', 'shortness of breath', 'difficulty breathing', 'सांस लेने में तकलीफ', 'सांस की तकलीफ', 'श्वास घेण्यास त्रास', 'श्वास लागणे'],
  chest_tightness: ['chest tightness'], loss_of_consciousness: ['loss of consciousness', 'unconsciousness', 'unconscious', 'behosh', 'बेहोश', 'बेशुद्ध', 'मूर्छा'],
  severe_bleeding: ['severe bleeding', 'heavy bleeding', 'जोरदार रक्तस्त्राव'], confusion: ['confusion', 'confused', 'गोंधळ'],
  sudden_severe_headache: ['sudden severe headache'], chills: ['chills'], fever: ['fever', 'बुखार', 'ताप'], cough: ['cough', 'खांसी', 'खोकला'],
  dizziness: ['dizziness', 'dizzy', 'lightheaded', 'chakkar', 'चक्कर'], fatigue: ['fatigue', 'weakness', 'exhausted', 'tired', 'थकान', 'थकवा'],
  headache: ['headache', 'सिरदर्द', 'डोकेदुखी'], stomach_pain: ['stomach pain', 'abdominal pain', 'पेट दर्द', 'पोटदुखी'],
  nausea: ['nausea', 'मतली', 'मळमळ'], vomiting: ['vomiting'], bleeding: ['bleeding', 'रक्तस्त्राव'], palpitations: ['palpitations'],
  blood_in_stool: ['blood in stool'], rectal_bleeding: ['rectal bleeding'], sweating: ['sweating'], rash: ['rash'], piles: ['piles'], pain: ['pain'],
};
for (const key of RED_FLAGS) ALIASES[key] ??= [key.replace(/_/g, ' ')];
export const EMERGENCY_FINDINGS = new Set<string>([...RED_FLAGS, 'breathlessness', 'confusion']);
export function normalizeClinicalValue(text: string): string {
  return text.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeRegex(text: string): string { return [...text].map(c => '\\^$.*+?()[]{}|'.includes(c) ? '\\' + c : c).join(''); }
export function extractAffirmedSymptoms(text: string): string[] {
  const normalized = normalizeClinicalValue(text);
  const found = new Set<string>();
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      const pattern = new RegExp('(^|[^\\p{L}\\p{N}])(' + escapeRegex(alias) + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
      for (const match of normalized.matchAll(pattern)) {
        const before = normalized.slice(0, match.index! + match[1].length);
        const clause = before.split(/[.;!?]|\b(?:but|however|although)\b/).pop() || '';
        const scope = clause.replace(/\b(?:not sure|no improvement|no relief|not improving)\b/g, '').trim().split(/\s+/).slice(-8).join(' ');
        const denied = /\b(?:no|not|without|denies|denied|never|negative for|none)\b/.test(scope);
        const after = normalized.slice(match.index! + match[0].length, match.index! + match[0].length + 24);
        const deniedAfter = /^\s*(?:नहीं|नाही|नसणे|नसते)(?:\s|$)/u.test(after);
        if (!denied && !deniedAfter) found.add(key);
      }
    }
  }
  // A specific finding should not also contribute its generic substring.
  if (found.has('chest_pain') || found.has('stomach_pain') || found.has('sudden_severe_headache')) found.delete('pain');
  if (found.has('sudden_severe_headache')) found.delete('headache');
  if (found.has('severe_bleeding') || found.has('rectal_bleeding')) found.delete('bleeding');
  return [...found];
}
export function emergencyFindings(values: string[]): string[] {
  return [...new Set(values.flatMap(extractAffirmedSymptoms))].filter(s => EMERGENCY_FINDINGS.has(s));
}
export function isDeniedFinding(value: string): boolean {
  return /\b(?:no|not|none|without|denies|denied|never)\b/i.test(value) || /नहीं|नाही|नसणे|नसते/u.test(value);
}
export function collectSymptoms(selected: string[], custom?: string, labels: string[] = []): string[] {
  const chosen = [...selected, ...(custom ? [custom] : [])].flatMap(raw => {
    const found = extractAffirmedSymptoms(raw);
    return found.length ? found : isDeniedFinding(raw) ? [] : [normalizeClinicalValue(raw).replace(/ /g, '_')];
  });
  return [...new Set([...chosen, ...labels.flatMap(extractAffirmedSymptoms)])];
}
