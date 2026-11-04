/** Canonical findings shared by questionnaire, scoring, and feature extraction. */
import { RED_FLAGS } from '@/lib/redFlags';

const ALIASES: Record<string, string[]> = {
  weakness_of_one_body_side: ['weakness of one body side', 'weakness on one side', 'one-sided weakness', 'weakness of one side', 'e 156'],
  altered_sensorium: ['altered sensorium', 'altered mental status', 'sudden confusion', 'e 39'],
  loss_of_balance: ['loss of balance', 'sudden loss of balance'],
  coughing_of_blood: ['coughing of blood', 'coughing blood', 'coughing up blood', 'e 45'],
  chest_pain: ['chest pain', 'pain in chest', 'chest heaviness', 'heaviness in chest', 'severe chest pain', 'angina', 'e 14', 'pain at rest', 'chest pain at rest', 'pain in chest at rest', 'rest pain', 'chest discomfort at rest', 'chest discomfort', 'discomfort in chest', 'सीने में दर्द', 'छातीत दुखणे'],
  exertional_chest_pain: ['pain with exertion', 'pain with physical exertion', 'pain during exertion', 'pain during physical exertion', 'chest pain with exertion', 'exertional chest pain', 'exertional pain', 'increased with physical exertion', 'alleviated with rest', 'e 218'],
  crescendo_angina: ['worsened over the last 2 weeks', 'progressively less effort', 'worsened over last 2 weeks', 'e 13'],
  breathlessness: ['severe breathlessness', 'severe shortness of breath', 'breathlessness', 'shortness of breath', 'difficulty breathing', 'trouble breathing', 'hard to breathe', 'struggling to breathe', 'short of breath', 'e 66', 'e 64', 'e 194', 'सांस लेने में तकलीफ', 'सांस की तकलीफ', 'श्वास घेण्यास त्रास', 'श्वास लागणे'],
  chest_tightness: ['chest tightness', 'tightness in chest', 'chest pressure', 'pressure in chest'], loss_of_consciousness: ['loss of consciousness', 'unconsciousness', 'unconscious', 'passed out', 'passing out', 'blacked out', 'blacking out', 'syncope', 'e 159', 'e 43', 'behosh', 'बेहोश', 'बेशुद्ध', 'मूर्छा'],
  severe_bleeding: ['severe bleeding', 'heavy bleeding', 'जोरदार रक्तस्त्राव'], confusion: ['confusion', 'confused', 'गोंधळ'],
  sudden_severe_headache: ['sudden severe headache', 'thunderclap headache', 'worst headache of life', 'worst headache of my life', 'अचानक गंभीर सिरदर्द', 'अचानक तीव्र डोकेदुखी'],
  severe_abdominal_pain: ['severe abdominal pain', 'severe stomach pain', 'intense abdominal pain', 'intense stomach pain', 'गंभीर पेट दर्द', 'तीव्र पोटदुखी'],
  speech_difficulty: ['e 63', 'speech difficulty', 'slurred speech'], vomiting_blood: ['e 210', 'vomiting blood', 'blood in vomit'], chills: ['chills'], fever: ['fever', 'e 91', 'बुखार', 'ताप'], cough: ['cough', 'e 201', 'खांसी', 'खोकला'],
  runny_nose: ['runny nose', 'nasal congestion', 'clear runny nose', 'rhinorrhea', 'e 181', 'बहती नाक', 'वाहणारे नाक'],
  sore_throat: ['sore throat', 'pharyngitis', 'throat irritation', 'throat pain', 'e 97', 'गले में खराश', 'घसा खवखवणे'],
  dizziness: ['dizziness', 'dizzy', 'lightheaded', 'chakkar', 'चक्कर', 'e 82'], fatigue: ['fatigue', 'weakness', 'exhausted', 'tired', 'थकान', 'थकवा', 'e 89'],
  headache: ['headache', 'सिरदर्द', 'डोकेदुखी'], stomach_pain: ['stomach pain', 'abdominal pain', 'पेट दर्द', 'पोटदुखी'],
  nausea: ['nausea', 'मतली', 'मळमळ', 'e 148'], vomiting: ['vomiting', 'उल्टी'], bleeding: ['bleeding', 'रक्तस्त्राव'], palpitations: ['palpitations'],
  diarrhea: ['diarrhea', 'loose motions', 'loose stool', 'दस्त', 'जुलाब', 'e 51'],
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
  if (found.has('chest_pain') || found.has('exertional_chest_pain') || found.has('stomach_pain') || found.has('sudden_severe_headache') || found.has('severe_abdominal_pain')) found.delete('pain');
  if (found.has('severe_abdominal_pain')) found.delete('stomach_pain');
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
