import { SCORING_DATASET } from "./rules";
import { RiskAnalysis, SurveyResult, UrgencyLevel } from "./types";

/**
 * Deterministic Risk Scoring Engine
 * Analyzes health survey data based on rule-weighted dataset.
 */
export function calculateRisk(input: SurveyResult): RiskAnalysis {
  const explanation: string[] = [];
  let score = 0;

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
  // Default 15 for unknown symptoms — ensures severity can still push them to High
  const baseScore = SCORING_DATASET.symptoms[baseSymptom] ?? 15;
  score += baseScore;
  explanation.push(`+${baseScore} Primary symptom base score (${input.symptom})`);

  // 3. Severity Weight
  const severityVal = input.severity.toLowerCase();
  const severityScore = SCORING_DATASET.severity[severityVal] ?? 0;
  score += severityScore;
  if (severityScore > 0) {
    explanation.push(`+${severityScore} for ${input.severity} intensity`);
  }

  // 4. Duration Weight
  const durationVal = input.duration.toLowerCase();
  let durationScore = SCORING_DATASET.duration[durationVal] ?? 0;

  // Normalization fallback for AI-generated duration strings
  if (durationScore === 0) {
    if (durationVal.includes("<") || durationVal.includes("less"))   durationScore = 0;
    else if (durationVal.includes("1-3") || durationVal.includes("few days")) durationScore = 10;
    else if (durationVal.includes("4-7") || durationVal.includes("week") && !durationVal.includes(">")) durationScore = 18;
    else if (durationVal.includes(">") || durationVal.includes("more than")) durationScore = 25;
  }
  
  score += durationScore;
  if (durationScore > 0) {
    explanation.push(`+${durationScore} for symptoms lasting ${input.duration}`);
  }

  // 5. Additional Symptom Weight
  if (input.additional && input.additional !== "none") {
    const additionalVal = input.additional.toLowerCase();
    const additionalScore = SCORING_DATASET.additionalSymptoms[additionalVal] ?? 10;
    score += additionalScore;
    explanation.push(`+${additionalScore} for accompanying symptom (${input.additional})`);
  }

  // 6. Medical History weight
  if (input.history && input.history !== "none") {
    const historyVal = input.history.toLowerCase();
    const historyScore = SCORING_DATASET.medicalHistory[historyVal] ?? 10; // default 10 for unknown conditions
    score += historyScore;
    if (historyScore > 0) {
      explanation.push(`+${historyScore} Risk weight for history of ${input.history}`);
    }
  }

  // 7. Urgency Classification — cap score at 100 before classifying
  score = Math.min(100, Math.max(0, score));

  let urgency: UrgencyLevel = "Low";
  if (score >= SCORING_DATASET.thresholds.high) {
    urgency = "High";
  } else if (score >= SCORING_DATASET.thresholds.medium) {
    urgency = "Medium";
  }

  // 8. Construct Story-Format Narrative
  const historyText = input.history === "none" ? "no prior medical conditions" : `a medical history of ${input.history}`;
  const narrativeEn = `You are experiencing ${input.symptom} with ${input.severity} intensity for ${input.duration}. Given your report of ${input.additional === 'none' ? 'no other symptoms' : input.additional} and ${historyText}, we've assessed your risk level as ${urgency}.`;
  const urgencyHi = urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'कम';
  const urgencyMr = urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'सौम्य';
  const narrativeHi = `${input.symptom} के आपके लक्षणों के आधार पर, ${input.severity} तीव्रता और ${input.duration} की अवधि को देखते हुए, हमने आपके जोखिम स्तर को ${urgencyHi} के रूप में मूल्यांकन किया है।`;
  const narrativeMr = `${input.symptom} च्या तुमच्या लक्षणांच्या आधारावर, ${input.severity} तीव्रता आणि ${input.duration} कालावधी लक्षात घेता, आम्ही तुमची जोखीम पातळी ${urgencyMr} म्हणून मूल्यांकन केली आहे.`;

  return {
    score,
    urgency,
    isRedFlag: false,
    explanation,
    recommendation: SCORING_DATASET.recommendations[urgency],
    narrative: {
      en: narrativeEn,
      hi: narrativeHi,
      mr: narrativeMr,
    }
  };
}
