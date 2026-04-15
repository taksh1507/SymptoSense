import type { FinalAssessmentPayload } from "@/components/ai-question-engine/types";

export interface MLFeatures {
  age_group: number;
  severity: number;
  duration: number;
  fever: number;
  cough: number;
  chest_pain: number;
  dizziness: number;
  fatigue: number;
  diabetes: number;
  heart_disease: number;
  rule_score?: number;
  risk_level?: number;
  
  // New Dynamic Features
  symptom_intensity_score: number;   // 0-3
  symptom_consistency_score: number; // 0-1
  symptom_progression: number;       // 0-2
  answer_confidence_proxy: number;     // 0-1
  ambiguity_score: number;           // 0-1
  multi_symptom_density: number;     // 0-1
}

/**
 * Maps survey answers to the numeric/binary feature vector required by the ML model.
 * Enhanced with dynamic signal heuristics from AI-generated questions.
 */
export function mapAnswersToMLFeatures(data: Partial<FinalAssessmentPayload>): MLFeatures {
  const symptoms = new Set(data.symptoms || []);
  const meds = new Set(data.medications || []);
  
  // Combine all AI answer values AND keys for richer text matching
  const aiValues = Object.values(data.aiAnswers || {});
  const aiKeys = Object.keys(data.aiAnswers || {});
  const aiAnswersRaw = [...aiValues, ...aiKeys].join(" ").toLowerCase();

  // Helper to check for a symptom in selections or AI follow-up text
  const hasSymptom = (key: string, patterns: string[]) => {
    if (symptoms.has(key)) return 1;
    return patterns.some(p => aiAnswersRaw.includes(p)) ? 1 : 0;
  };

  // 1. Age Mapping — matches actual Q1 values: child, teen, adult, elderly
  let age_group = 1; // Default: adult
  if (data.age === "child") age_group = 0;
  else if (data.age === "teen") age_group = 1;
  else if (data.age === "adult") age_group = 1;
  else if (data.age === "elderly") age_group = 2;

  // 2. Severity Mapping — matches actual Q10 values: mild, moderate, severe, critical
  let severity = 1;
  if (data.severity === "moderate") severity = 2;
  else if (data.severity === "severe" || data.severity === "critical") severity = 3;

  // 3. Duration Mapping — matches actual Q9 values: < 1 day, 1-3 days, 4-7 days, > 1 week
  let duration = 1;
  if (data.duration === "1-3 days") duration = 2;
  else if (data.duration === "4-7 days" || data.duration === "> 1 week") duration = 3;

  // 4. Dynamic Heuristics — improved pattern matching
  // Check both AI answer values AND common option value patterns
  let intensity = 1; // Default
  if (data.severity === "critical") intensity = 3;
  else if (data.severity === "severe") intensity = 3;
  else if (data.severity === "moderate") intensity = 2;
  // Also check AI answers for intensity signals
  if (/(severe|unbearable|intense|extreme|very_high|radiating|critical|worsening|worse)/i.test(aiAnswersRaw)) {
    intensity = Math.max(intensity, 3);
  } else if (/(moderate|medium|noticeable|persistent|frequent)/i.test(aiAnswersRaw)) {
    intensity = Math.max(intensity, 2);
  }

  let progression = 1; // Default: stable
  if (/(worsening|worse|increasing|aggravating|spreading|progressive)/i.test(aiAnswersRaw)) progression = 2;
  else if (/(improving|better|decreasing|subsiding|resolving)/i.test(aiAnswersRaw)) progression = 0;
  else if (/(stable|unchanged|same|constant|intermittent)/i.test(aiAnswersRaw)) progression = 1;
  // If severity is critical/severe and duration is long, lean toward worsening
  if (severity === 3 && duration === 3 && progression === 1) progression = 2;

  // Ambiguity detection
  let ambiguity = 0;
  const hasMild = /(mild|slight|low|tolerable)/i.test(aiAnswersRaw);
  const hasSevere = /(severe|extreme|intense|critical|unbearable)/i.test(aiAnswersRaw);
  const hasUncertain = /(not_sure|don't know|unsure|maybe|possibly|unclear|not sure)/i.test(aiAnswersRaw);
  
  if (hasMild && hasSevere) ambiguity += 0.5;
  if (hasUncertain) ambiguity += 0.3;
  // Mixed severity signals between static and dynamic
  if (data.severity === 'mild' && intensity === 3) ambiguity += 0.3;
  if (data.severity === 'severe' && intensity === 1) ambiguity += 0.3;
  ambiguity = Math.min(1.0, ambiguity);

  // Consistency check — compare static severity vs dynamic intensity
  let consistency = 1.0;
  if (data.severity === 'mild' && intensity === 3) consistency -= 0.4;
  if (data.severity === 'severe' && intensity === 1) consistency -= 0.4;
  if (data.severity === 'critical' && intensity === 1) consistency -= 0.5;
  consistency = Math.max(0.0, consistency);

  // Confidence Proxy — penalize uncertainty signals
  let confProxy = 1.0;
  if (data.customSymptom || data.customMedication) confProxy -= 0.15;
  if (hasUncertain) confProxy -= 0.25;
  if (ambiguity > 0.4) confProxy -= 0.2;
  // Reward clear, consistent high-confidence cases
  if (consistency > 0.8 && !hasUncertain && ambiguity < 0.2) confProxy = Math.min(1.0, confProxy + 0.1);
  confProxy = Math.max(0.0, Math.min(1.0, confProxy));

  return {
    age_group,
    severity,
    duration,
    fever: hasSymptom("fever", ["fever", "temperature", "chills"]),
    cough: hasSymptom("cough", ["cough", "dry cough", "mucus"]),
    chest_pain: hasSymptom("chest_pain", ["chest pain", "chest_pain", "tightness"]),
    dizziness: hasSymptom("dizziness", ["dizzy", "lightheaded", "faint", "dizziness"]),
    fatigue: hasSymptom("fatigue", ["tired", "weak", "exhausted", "fatigue"]),
    diabetes: meds.has("diabetes") ? 1 : 0,
    heart_disease: meds.has("heart_disease") ? 1 : 0,

    // Dynamic signals
    symptom_intensity_score: intensity,
    symptom_consistency_score: consistency,
    symptom_progression: progression,
    answer_confidence_proxy: confProxy,
    ambiguity_score: ambiguity,
    multi_symptom_density: Math.min(1.0, symptoms.size / 8)
  };
}
