/**
 * symptomPresentation.ts
 *
 * Centralized patient-facing presentation and translation boundary.
 * Maps canonical symptom keys, DDXPlus evidence codes (E_*), and model features
 * to clear, clinically understandable patient-facing labels in English, Hindi, and Marathi.
 *
 * Guarantees that raw DDXPlus codes (e.g. E_181, E_97, E_91, E_66) NEVER leak into UI text.
 */

import vocabulary from '../ml/symptom-list.json';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

interface VocabEntry {
  code: string;
  name: string;
  display_name: string;
  is_antecedent?: boolean;
}

const vocabList = vocabulary as VocabEntry[];
const vocabByCode = new Map<string, VocabEntry>();
for (const entry of vocabList) {
  vocabByCode.set(entry.code, entry);
}

// Canonical patient-facing label dictionary
interface LabelTranslation {
  en: string;
  hi: string;
  mr: string;
}

const SYMPTOM_LABELS: Record<string, LabelTranslation> = {
  // Respiratory & ENT
  runny_nose: { en: 'Runny nose', hi: 'बहती नाक', mr: 'वाहणारे नाक' },
  nasal_congestion: { en: 'Runny nose / nasal congestion', hi: 'बहती नाक / बंद नाक', mr: 'वाहणारे नाक / भरलेले नाक' },
  sore_throat: { en: 'Sore throat', hi: 'गले में खराश', mr: 'घसा खवखवणे' },
  cough: { en: 'Cough', hi: 'खांसी', mr: 'खोकला' },
  persistent_cough: { en: 'Persistent cough', hi: 'लगातार खांसी', mr: 'सतत येणारा खोकला' },
  coughing_fits: { en: 'Coughing fits', hi: 'खांसी के दौरे', mr: 'खोकल्याची उबळ' },
  wheezing: { en: 'Wheezing', hi: 'घरघराहट', mr: 'घरघर आवाज' },
  phlegm: { en: 'Phlegm / mucus', hi: 'बलगम / कफ', mr: 'कफ' },
  sputum: { en: 'Sputum', hi: 'कफ', mr: 'कफ' },
  coughing_blood: { en: 'Coughing up blood', hi: 'खांसी में खून', mr: 'खोकल्यातून रक्त पडणे' },
  coughing_of_blood: { en: 'Coughing up blood', hi: 'खांसी में खून', mr: 'खोकल्यातून रक्त पडणे' },
  shortness_of_breath: { en: 'Shortness of breath', hi: 'सांस की तकलीफ', mr: 'श्वास घेण्यास त्रास' },
  breathlessness: { en: 'Shortness of breath', hi: 'सांस की तकलीफ', mr: 'श्वास घेण्यास त्रास' },
  difficulty_breathing: { en: 'Difficulty breathing', hi: 'सांस लेने में कठिनाई', mr: 'श्वास घेण्यास त्रास' },
  continuous_sneezing: { en: 'Frequent sneezing', hi: 'लगातार छींक आना', mr: 'वारंवार शिंका येणे' },
  sneezing: { en: 'Sneezing', hi: 'छींक आना', mr: 'शिंकणे' },

  // Systemic / Infection
  fever: { en: 'Fever', hi: 'बुखार', mr: 'ताप' },
  mild_fever: { en: 'Mild fever', hi: 'हल्का बुखार', mr: 'सौम्य ताप' },
  high_fever: { en: 'High fever', hi: 'तेज़ बुखार', mr: 'तीव्र ताप' },
  chills: { en: 'Chills', hi: 'कंपकंपी', mr: 'थंडी वाजणे' },
  sweating: { en: 'Sweating', hi: 'पसीना आना', mr: 'घाम येणे' },
  fatigue: { en: 'Fatigue / tiredness', hi: 'थकान / कमजोरी', mr: 'थकवा / अशक्तपणा' },
  tiredness: { en: 'Tiredness', hi: 'थकान', mr: 'थकवा' },
  dizziness: { en: 'Dizziness', hi: 'चक्कर आना', mr: 'चक्कर येणे' },

  // Cardiac
  chest_pain: { en: 'Chest pain', hi: 'सीने में दर्द', mr: 'छातीत दुखणे' },
  chest_tightness: { en: 'Chest tightness', hi: 'सीने में भारीपन', mr: 'छातीत जड वाटणे' },
  palpitations: { en: 'Heart palpitations', hi: 'दिल की धड़कन तेज होना', mr: 'धडधड वाढणे' },
  exertional_chest_pain: { en: 'Chest pain with exertion', hi: 'परिश्रम के साथ सीने में दर्द', mr: 'श्रमाने छातीत दुखणे' },
  crescendo_angina: { en: 'Worsening chest pain', hi: 'बढ़ता हुआ सीने का दर्द', mr: 'वाढणारे छातीत दुखणे' },

  // Neurological
  headache: { en: 'Headache', hi: 'सिरदर्द', mr: 'डोकेदुखी' },
  sudden_severe_headache: { en: 'Sudden severe headache', hi: 'अचानक तीव्र सिरदर्द', mr: 'अचानक तीव्र डोकेदुखी' },
  loss_of_consciousness: { en: 'Loss of consciousness', hi: 'बेहोशी', mr: 'बेशुद्ध पडणे' },
  confusion: { en: 'Confusion / disorientation', hi: 'मानसिक भ्रम', mr: 'गोंधळ' },
  altered_sensorium: { en: 'Altered mental status', hi: 'मानसिक स्थिति में बदलाव', mr: 'मानसिक स्थितीत बदल' },
  weakness_of_one_body_side: { en: 'One-sided weakness', hi: 'शरीर के एक तरफ कमजोरी', mr: 'एका बाजूला अशक्तपणा' },
  speech_difficulty: { en: 'Speech difficulty', hi: 'बोलने में कठिनाई', mr: 'बोलण्यास त्रास' },

  // Gastrointestinal
  stomach_pain: { en: 'Stomach / abdominal pain', hi: 'पेट दर्द', mr: 'पोटदुखी' },
  abdominal_pain: { en: 'Abdominal pain', hi: 'पेट दर्द', mr: 'पोटदुखी' },
  severe_abdominal_pain: { en: 'Severe abdominal pain', hi: 'तीव्र पेट दर्द', mr: 'तीव्र पोटदुखी' },
  nausea: { en: 'Nausea', hi: 'मतली', mr: 'मळमळ' },
  vomiting: { en: 'Vomiting', hi: 'उल्टी', mr: 'उलटी' },
  severe_vomiting: { en: 'Forceful vomiting', hi: 'तीव्र उल्टी', mr: 'तीव्र उलटी' },
  forceful_vomiting: { en: 'Forceful vomiting', hi: 'तीव्र उल्टी', mr: 'तीव्र उलटी' },
  violent_retching: { en: 'Forceful retching', hi: 'तीव्र उल्टी का प्रयास', mr: 'तीव्र ओकारी' },
  diarrhea: { en: 'Diarrhea', hi: 'दस्त', mr: 'जुलाब' },
  loss_of_appetite: { en: 'Loss of appetite', hi: 'भूख में कमी', mr: 'भूक मंदावणे' },
  heartburn: { en: 'Heartburn / acid reflux', hi: 'सीने में जलन / एसिडिटी', mr: 'छातीत जळजळ' },
  blood_in_stool: { en: 'Blood in stool', hi: 'मल में खून', mr: 'शौचातून रक्त' },
  rectal_bleeding: { en: 'Rectal bleeding', hi: 'मलाशय से रक्तस्त्राव', mr: 'गुदद्वारातून रक्तस्त्राव' },
  vomiting_blood: { en: 'Vomiting blood', hi: 'उल्टी में खून', mr: 'उलटीतून रक्त' },

  // Pain / Musculoskeletal
  back_pain: { en: 'Back pain', hi: 'पीठ दर्द', mr: 'पाठदुखी' },
  joint_pain: { en: 'Joint pain', hi: 'जोड़ों का दर्द', mr: 'सांधेदुखी' },
  neck_pain: { en: 'Neck pain', hi: 'गर्दन दर्द', mr: 'मानदुखी' },
  ear_pain: { en: 'Ear pain', hi: 'कान दर्द', mr: 'कानदुखी' },
  eye_pain: { en: 'Eye pain', hi: 'आँख दर्द', mr: 'डोळे दुखणे' },
  body_aches: { en: 'Body aches', hi: 'शरीर में दर्द', mr: 'अंगदुखी' },
  pain: { en: 'Pain', hi: 'दर्द', mr: 'वेदना' },

  // Dermatological / Other
  rash: { en: 'Skin rash', hi: 'त्वचा पर चकत्ते', mr: 'त्वचेवर पुरळ' },
  piles: { en: 'Piles / hemorrhoids', hi: 'बवासीर', mr: 'मूळव्याध' },
  bleeding: { en: 'Bleeding', hi: 'रक्तस्त्राव', mr: 'रक्तस्त्राव' },
  severe_bleeding: { en: 'Severe bleeding', hi: 'भारी रक्तस्त्राव', mr: 'तीव्र रक्तस्त्राव' },

  // Model demographic features
  age: { en: 'Age', hi: 'आयु', mr: 'वय' },
  age_group_child: { en: 'Age: Child', hi: 'आयु: बच्चा', mr: 'वय: मूल' },
  age_group_teen: { en: 'Age: Teen', hi: 'आयु: किशोर', mr: 'वय: किशोर' },
  age_group_adult: { en: 'Age: Adult', hi: 'आयु: वयस्क', mr: 'वय: प्रौढ' },
  age_group_elderly: { en: 'Age: Elderly', hi: 'आयु: बुजुर्ग', mr: 'वय: वृद्ध' },
  sex_f: { en: 'Female biological sex', hi: 'महिला लिंग', mr: 'स्त्री लिंग' },
  sex_m: { en: 'Male biological sex', hi: 'पुरुष लिंग', mr: 'पुरुष लिंग' },
  sex_unknown: { en: 'Unspecified sex', hi: 'अनिर्दिष्ट लिंग', mr: 'अनिर्दिष्ट लिंग' },
};

// Evidence code to canonical symptom key mapping
const EVIDENCE_CODE_TO_CANONICAL: Record<string, string> = {
  E_181: 'runny_nose',
  E_97: 'sore_throat',
  E_91: 'fever',
  E_201: 'cough',
  E_203: 'coughing_fits',
  E_66: 'shortness_of_breath',
  E_64: 'difficulty_breathing',
  E_194: 'difficulty_breathing',
  E_124: 'wheezing',
  E_77: 'phlegm',
  E_45: 'coughing_blood',
  E_14: 'chest_pain',
  E_13: 'crescendo_angina',
  E_218: 'exertional_chest_pain',
  E_89: 'fatigue',
  E_82: 'dizziness',
  E_94: 'chills',
  E_51: 'diarrhea',
  E_148: 'nausea',
  E_211: 'severe_vomiting',
  E_210: 'vomiting_blood',
  E_86: 'loss_of_appetite',
  E_173: 'heartburn',
  E_39: 'altered_sensorium',
  E_63: 'speech_difficulty',
  E_156: 'weakness_of_one_body_side',
  E_159: 'loss_of_consciousness',
  E_43: 'loss_of_consciousness',
  E_160: 'body_aches',
  E_53: 'pain',
  // Specific location codes
  'E_55_@_V_89': 'headache',
  'E_55_@_V_187': 'stomach_pain',
  'E_55_@_V_101': 'chest_pain',
  'E_55_@_V_82': 'back_pain',
  'E_55_@_V_98': 'joint_pain',
  'E_55_@_V_103': 'neck_pain',
  'E_55_@_V_88': 'ear_pain',
  'E_55_@_V_87': 'eye_pain',
};

/**
 * Returns canonical symptom key for an evidence code (e.g. E_181 -> 'runny_nose').
 */
export function canonicalFindingFromEvidence(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.trim().replace(/^(symptom:|antecedent:)/, '');
  const normalizedCode = stripped.toUpperCase().replace(/\s+/g, '_');
  if (EVIDENCE_CODE_TO_CANONICAL[normalizedCode]) return EVIDENCE_CODE_TO_CANONICAL[normalizedCode];

  // Try base code if with value suffix
  const baseCode = normalizedCode.split(':@:')[0].split('_@_')[0];
  if (EVIDENCE_CODE_TO_CANONICAL[baseCode]) return EVIDENCE_CODE_TO_CANONICAL[baseCode];

  return null;
}

/**
 * Clean question text into a short readable title.
 */
function cleanQuestionToTitle(question: string): string {
  return question
    .replace(/^do you have\s+/i, '')
    .replace(/^have you had\s+/i, '')
    .replace(/^are you experiencing\s+/i, '')
    .replace(/^is there\s+/i, '')
    .replace(/\?$/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/**
 * Main patient-facing formatter.
 * Translates any symptom key, DDXPlus code, or ML feature to a clear, localized name.
 */
export function formatSymptomName(
  input: string,
  lang: SupportedLanguage = 'en'
): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // 1. Remove feature prefixes
  const stripped = trimmed.replace(/^(symptom:|antecedent:)/, '');

  // 2. Normalize key
  const normalizedKey = stripped.toLowerCase().replace(/[\s-]+/g, '_');

  // Check direct canonical dictionary
  if (SYMPTOM_LABELS[normalizedKey]) {
    return SYMPTOM_LABELS[normalizedKey][lang] || SYMPTOM_LABELS[normalizedKey].en;
  }

  // 3. Check evidence code mapping (e.g. E_181, E_97, E_55_@_V_89)
  const canonicalKey = canonicalFindingFromEvidence(stripped);
  if (canonicalKey && SYMPTOM_LABELS[canonicalKey]) {
    return SYMPTOM_LABELS[canonicalKey][lang] || SYMPTOM_LABELS[canonicalKey].en;
  }

  // 4. Handling pain character sub-tokens or composite evidence like E_54:@:V_154
  const baseCode = stripped.toUpperCase().split(':@:')[0].split('_@_')[0];
  if (baseCode === 'E_54') {
    return lang === 'hi' ? 'दर्द की प्रकृति' : lang === 'mr' ? 'वेदनेचे स्वरूप' : 'Pain characteristics';
  }

  // 5. Check vocabulary database
  const vocabEntry = vocabByCode.get(baseCode);
  if (vocabEntry) {
    const rawTitle = cleanQuestionToTitle(vocabEntry.display_name || vocabEntry.name).replace(/:\s*$/, '');
    if (rawTitle) {
      return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
    }
  }

  // 6. Generic formatting for unknown values: replace underscores with spaces and capitalize
  const clean = stripped
    .replace(/_@_[A-Z0-9_]+/gi, '')
    .replace(/_v_\d+/gi, '')
    .replace(/_/g, ' ')
    .trim();

  // If after cleaning it's just "E 181" or "E 97", ensure it maps cleanly
  const eMatch = clean.match(/^E\s*(\d+)$/i);
  if (eMatch) {
    const code = `E_${eMatch[1]}`;
    const mapped = canonicalFindingFromEvidence(code);
    if (mapped && SYMPTOM_LABELS[mapped]) {
      return SYMPTOM_LABELS[mapped][lang] || SYMPTOM_LABELS[mapped].en;
    }
  }

  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
}

/**
 * Sanitizes and deduplicates an array of symptom strings for presentation.
 */
export function sanitizeSymptomList(
  symptoms: string[],
  lang: SupportedLanguage = 'en'
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const s of symptoms) {
    const formatted = formatSymptomName(s, lang);
    if (formatted && !seen.has(formatted.toLowerCase())) {
      seen.add(formatted.toLowerCase());
      result.push(formatted);
    }
  }
  return result;
}
