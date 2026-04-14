import { SCORING_DATASET } from "./rules";
import { RiskAnalysis, SurveyResult, UrgencyLevel } from "./types";

/**
 * Deterministic Risk Scoring Engine
 * Analyzes health survey data based on rule-weighted dataset.
 */
export function calculateRisk(input: SurveyResult): RiskAnalysis {
  const explanation: string[] = [];
  let score = 0;
  let isRedFlag = false;

  // 1. Check for RED FLAGS (Highest Priority)
  const inputsToSearch = [
    input.symptom, 
    input.additional, 
    input.severity
  ].filter(Boolean).map(s => s?.toLowerCase());

  const detectedRedFlag = SCORING_DATASET.redFlags.find(flag => 
    inputsToSearch.some(val => val?.includes(flag))
  );

  if (detectedRedFlag) {
    isRedFlag = true;
    return {
      score: 100,
      urgency: "High",
      isRedFlag: true,
      explanation: [`CRITICAL: Red flag detected ("${detectedRedFlag}"). Emergency priority override.`],
      recommendation: SCORING_DATASET.recommendations.High
    };
  }

  // 2. Base Symptom Score
  const baseSymptom = input.symptom.toLowerCase();
  const baseScore = SCORING_DATASET.symptoms[baseSymptom] || 5; // Default 5 if unknown
  score += baseScore;
  explanation.push(`+${baseScore} Primary symptom base score (${input.symptom})`);

  // 3. Severity Weight
  const severityVal = input.severity.toLowerCase();
  const severityScore = SCORING_DATASET.severity[severityVal] || 0;
  score += severityScore;
  if (severityScore > 0) {
    explanation.push(`+${severityScore} for ${input.severity} intensity`);
  }

  // 4. Duration Weight
  const durationVal = input.duration.toLowerCase();
  // Try direct match first, then normalize common ones
  let durationScore = SCORING_DATASET.duration[durationVal] || 0;
  
  // Normalization logic for AI variations
  if (durationScore === 0) {
    if (durationVal.includes("<")) durationScore = 0;
    else if (durationVal.includes("1-3")) durationScore = 10;
    else if (durationVal.includes(">") || durationVal.includes("3")) durationScore = 20;
  }
  
  score += durationScore;
  if (durationScore > 0) {
    explanation.push(`+${durationScore} for symptoms lasting ${input.duration}`);
  }

  // 5. Additional Symptom Weight
  if (input.additional && input.additional !== "none") {
    const additionalVal = input.additional.toLowerCase();
    const additionalScore = SCORING_DATASET.additionalSymptoms[additionalVal] || 5;
    score += additionalScore;
    explanation.push(`+${additionalScore} for accompanying symptom (${input.additional})`);
  }

  // 6. Medical History weight
  if (input.history && input.history !== "none") {
    const historyVal = input.history.toLowerCase();
    const historyScore = SCORING_DATASET.medicalHistory[historyVal] || 0;
    score += historyScore;
    if (historyScore > 0) {
      explanation.push(`+${historyScore} Risk weight for history of ${input.history}`);
    }
  }

  // 7. Urgency Classification
  let urgency: UrgencyLevel = "Low";
  if (score >= SCORING_DATASET.thresholds.high) {
    urgency = "High";
  } else if (score >= SCORING_DATASET.thresholds.medium) {
    urgency = "Medium";
  }

  // 8. Construct Story-Format Narrative
  const historyText = input.history === "none" ? "no prior medical conditions" : `a medical history of ${input.history}`;
  const narrativeEn = `You are experiencing ${input.symptom} with ${input.severity} intensity for ${input.duration}. Given your report of ${input.additional === 'none' ? 'no other symptoms' : input.additional} and ${historyText}, we've assessed your risk level as ${urgency}.`;

  return {
    score,
    urgency,
    isRedFlag: false,
    explanation,
    recommendation: SCORING_DATASET.recommendations[urgency],
    narrative: {
      en: narrativeEn,
      hi: narrativeEn // Will be translated client-side
    }
  };
}
