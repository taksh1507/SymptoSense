import type { QuestionStep, Language } from "@/components/ai-question-engine/types";

/**
 * SYNONYM MAPPING
 * Maps common natural language descriptors to canonical internal values.
 */
const SYNONYM_MAP: Record<string, string> = {
  // Severity
  high: "severe",
  extreme: "severe",
  very: "severe",
  bad: "severe",
  painful: "severe",
  tez: "severe",
  gambhir: "severe",
  zyada: "severe",
  "तेज": "severe",
  "गंभीर": "severe",
  low: "mild",
  small: "mild",
  slight: "mild",
  fine: "mild",
  okay: "mild",
  halka: "mild",
  thoda: "mild",
  kam: "mild",
  "हल्का": "mild",
  "थोड़ा": "mild",
  "कम": "mild",
  medium: "moderate",
  average: "moderate",
  uncomfy: "moderate",
  theek: "moderate",
  beech: "moderate",
  "ठीक": "moderate",
  "मध्यम": "moderate",
  // Duration
  new: "< 1 day",
  today: "< 1 day",
  recently: "< 1 day",
  one: "1",
  two: "2",
  three: "3",
  few: "1-3 days",
  week: "> 3 days",
  long: "> 3 days",
  // History
  bp: "hypertension",
  pressure: "hypertension",
  sugar: "diabetes",
  heart: "heart_disease",
  "मधुमेह": "diabetes",
  "बीपी": "hypertension",
};

/**
 * Given a voice transcript and a list of options, returns the closest matching option value.
 * Uses a multi-tiered confidence approach:
 * 1. Numerical Matching (1, One, Ek, Pehla)
 * 2. Exact Match (100%)
 * 3. Partial Match (70-90%)
 * 4. Fuzzy Match (calculated)
 * Rejects if confidence < 60%
 */
export function matchVoiceToOption(
  transcript: string,
  step: QuestionStep,
  language: Language
): string | null {
  if (!transcript) return null;

  const raw = transcript.toLowerCase().trim();
  let normalized = raw;

  // A. Numerical Matching (Highest Priority)
  const numLookup: Record<string, number> = {
    "1": 0, "one": 0, "first": 0, "pehla": 0, "ek": 0, "एक": 0, "पहला": 0,
    "2": 1, "two": 1, "second": 1, "do": 1, "dusra": 1, "दो": 1, "दूसरा": 1,
    "3": 2, "three": 2, "third": 2, "teen": 2, "tisra": 2, "तीन": 2, "तीसरा": 2,
    "4": 3, "four": 3, "fourth": 3, "char": 3, "chautha": 3, "चार": 3, "चौथा": 3,
  };

  // numLookup values are indices (0-based), so check with !== undefined (0 is valid!)
  if (numLookup[raw] !== undefined) {
    const idx = numLookup[raw];
    if (idx < step.options.length) {
      console.log(`[STT Match] Numerical: "${raw}" matched index ${idx}`);
      return step.options[idx].value;
    }
  }

  // B. Synonym Mapping & Normalization
  Object.entries(SYNONYM_MAP).forEach(([syn, actual]) => {
    if (raw.includes(syn)) {
      normalized = normalized.replace(syn, actual);
    }
  });

  const options = step.options;
  let bestMatch: { value: string; confidence: number } | null = null;

  for (const option of options) {
    const val = option.value.toLowerCase();
    const labelEn = option.label.en.toLowerCase();
    const labelHi = option.label.hi.toLowerCase();
    
    let confidence = 0;

    // 1. Exact Match (100%)
    if (normalized === val || normalized === labelEn || normalized === labelHi) {
      confidence = 1;
    } 
    // 2. Partial Match (90% if word-boundary match, 70% if substring)
    else if (normalized.includes(val) || normalized.includes(labelEn) || normalized.includes(labelHi)) {
       // Escape regex special characters before constructing RegExp
       const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex = new RegExp(`\\b(${escapeRegex(val)}|${escapeRegex(labelEn)})\\b`, 'i');
       confidence = regex.test(normalized) ? 0.9 : 0.7;
    }
    // 3. Simple Fuzzy / Overlap Match
    else {
      const inputWords = normalized.split(/\s+/);
      const targetWords = [...val.split(/\s+/), ...labelEn.split(/\s+/)];
      const matches = inputWords.filter(w => targetWords.includes(w));
      const score = matches.length / Math.max(inputWords.length, targetWords.length);
      
      if (score > 0.4) {
        confidence = score * 0.8; // scaling factor
      }
    }

    if (confidence > (bestMatch?.confidence || 0)) {
      bestMatch = { value: option.value, confidence };
    }
  }

  // Reject if below threshold (60%)
  if (bestMatch && bestMatch.confidence >= 0.6) {
    console.log(`[STT Match] Raw: "${raw}" | Matched: "${bestMatch.value}" | Conf: ${Math.round(bestMatch.confidence * 100)}%`);
    return bestMatch.value;
  }

  console.warn(`[STT Match] No confident match for "${raw}" (Best: ${Math.round((bestMatch?.confidence || 0) * 100)}%)`);
  return null;
}
