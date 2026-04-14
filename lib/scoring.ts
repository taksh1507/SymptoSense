import { QUESTIONS } from "./questionTree";
import { isRedFlag as checkMainRedFlag } from "./redFlags";
import { SCORING_DATASET } from "./ai-engine/scoring/rules";

export type Urgency = "Low" | "Medium" | "High";

export interface Factor {
  id: string;
  label: string;
  score: number;
  isRedFlag: boolean;
  category: string;
}

export interface ScoreResult {
  score: number;             // 0–100
  urgency: Urgency;
  factors: Factor[];
  recommendation: string;
  primaryCategory: string;
  hasRedFlag: boolean;
  symptomCount: number;
  highestSeverity: string;
  narrative?: {
    en: string;
    hi: string;
    mr: string;
  };
}

export interface Answer {
  questionId: string;
  answer: string | string[] | number;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// Multipliers and Bonuses (Enhanced with AI Engine Dataset)
const SEVERITY_MULTIPLIERS = SCORING_DATASET.severity;
const DURATION_BONUSES = SCORING_DATASET.duration;

// Age-based modifiers (Preserved from earlier turn)
const AGE_MODIFIERS: Record<string, number> = {
  child: 1.1,
  senior: 1.25,
  adult: 1.0,
  teen: 1.0,
};

// Category label map
const CATEGORY_LABELS: Record<string, string> = {
  cardiac: "Cardiac / Cardiovascular",
  respiratory: "Respiratory",
  neurological: "Neurological",
  infection: "Infectious / Fever",
  gastrointestinal: "Gastrointestinal",
  dermatological: "Dermatological",
  mental_health: "Mental Health",
  general: "General / Systemic",
  triage: "Multi-System",
};

// ──────────────────────────────────────────────────────────────

export function computeScore(answers: Answer[]): ScoreResult {
  const factors: Factor[] = [];
  let rawScore = 0;
  let hasRedFlag = false;
  let severityMultiplier = 1.0;
  let durationBonus = 0;
  let ageModifier = 1.0;
  const categories: Record<string, number> = {};

  // Extract critical inputs for AI-aware scoring
  const rawAnswersMap: Record<string, string> = {};
  for (const ans of answers) {
    const val = Array.isArray(ans.answer) ? ans.answer[0] : String(ans.answer);
    rawAnswersMap[ans.questionId] = val;

    if (ans.questionId === "q_severity") {
      severityMultiplier = SEVERITY_MULTIPLIERS[val] ?? 1.0;
    }
    if (ans.questionId === "q_duration") {
      durationBonus = DURATION_BONUSES[val] ?? 0;
    }
    if (ans.questionId === "q_age") {
      ageModifier = AGE_MODIFIERS[val] ?? 1.0;
    }
  }

  // 1. Check for RED FLAGS (AI Engine Data Integration)
  const answersToScan = Object.values(rawAnswersMap).join(" ").toLowerCase();
  const detectedRedFlag = SCORING_DATASET.redFlags.find(flag => 
    answersToScan.includes(flag.toLowerCase())
  );

  if (detectedRedFlag) {
    hasRedFlag = true;
  }

  // 2. Compute score from individual questions
  for (const ans of answers) {
    if (ans.questionId === "q_severity" || ans.questionId === "q_duration") continue;

    const question = QUESTIONS[ans.questionId];
    if (!question) continue;

    const selectedIds = Array.isArray(ans.answer) ? ans.answer : [String(ans.answer)];

    if (question.type === "scale") {
      const val = Number(ans.answer);
      const scaleScore = Math.round((val / 10) * 25 * question.weight);
      if (scaleScore > 0) {
        factors.push({
          id: `${ans.questionId}_scale`,
          label: `Pain/Severity Score: ${val}/10`,
          score: scaleScore,
          isRedFlag: val >= 8,
          category: question.category,
        });
        rawScore += scaleScore;
        categories[question.category] = (categories[question.category] ?? 0) + scaleScore;
        if (val >= 8) hasRedFlag = true;
      }
      continue;
    }

    for (const optId of selectedIds) {
      if (optId === "none" || optId === "no_medications" || optId === "none_of_above") continue;

      const option = question.options?.find((o) => o.id === optId);
      if (!option || !option.score) continue;

      const optScore = option.score;
      const rf = option.redFlag || checkMainRedFlag(optId);
      if (rf) hasRedFlag = true;

      factors.push({
        id: optId,
        label: option.label,
        score: optScore,
        isRedFlag: rf,
        category: question.category,
      });

      rawScore += optScore;
      categories[question.category] = (categories[question.category] ?? 0) + optScore;
    }
  }

  // 3. Final Calculation
  let adjustedScore = (rawScore * severityMultiplier * ageModifier) + durationBonus;
  
  // High-score factor bonus
  if (factors.filter(f => f.score >= 20).length >= 2) adjustedScore += 10;
  
  if (hasRedFlag) adjustedScore = Math.max(adjustedScore, 90);

  const finalScore = Math.round(Math.min(100, Math.max(0, adjustedScore)));

  // 4. Urgency
  let urgency: Urgency = "Low";
  if (finalScore >= SCORING_DATASET.thresholds.high || hasRedFlag) urgency = "High";
  else if (finalScore >= SCORING_DATASET.thresholds.medium) urgency = "Medium";

  const primaryCategoryKey = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";
  const primaryCategoryDisplay = CATEGORY_LABELS[primaryCategoryKey] ?? "General Triage";

  // 5. Narrative Generation (Bilingual)
  const mainSymptom = rawAnswersMap["q_start"] || "symptoms";
  const narrative = {
    en: `Based on your report of ${mainSymptom}, we've assessed your risk level as ${urgency}. Factors including your age, severity, and duration have been weighted.`,
    hi: `${mainSymptom} की आपकी रिपोर्ट के आधार पर, हमने आपके जोखिम स्तर को ${urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'कम'} के रूप में मूल्यांकन किया है।`,
    mr: `${mainSymptom} च्या तुमच्या अहवालाच्या आधारावर, आम्ही तुमची जोखीम पातळी ${urgency === 'High' ? 'उच्च' : urgency === 'Medium' ? 'मध्यम' : 'सौम्य'} म्हणून मूल्यांकन केली आहे.`
  };

  return {
    score: finalScore,
    urgency,
    factors: factors.sort((a, b) => b.score - a.score),
    recommendation: SCORING_DATASET.recommendations[urgency].en, // Default to EN, client can switch
    primaryCategory: primaryCategoryDisplay,
    hasRedFlag,
    symptomCount: factors.length,
    highestSeverity: factors[0]?.label ?? "General symptoms",
    narrative
  };
}


// Recommendation panel content
export interface RecommendationContent {
  homeCare: string[];
  seeDoctor: string[];
  emergency: string[];
  specialist: string;
  disclaimer: string;
}

export function getRecommendationContent(
  urgency: Urgency,
  category: string
): RecommendationContent {
  const specialist = getSpecialist(category);
  const disclaimer =
    "This app provides health guidance only — not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.";

  const baseHome = [
    "Rest and avoid strenuous physical activity",
    "Stay well hydrated — aim for 8–10 glasses of water per day",
    "Monitor your symptoms every 4–6 hours",
    "Avoid self-medicating unless previously prescribed",
    "Inform a family member or close friend about your condition",
  ];

  const baseDoctor = [
    "Book an appointment with your primary care physician",
    "Bring a written list of all symptoms and their onset",
    "Carry a list of current medications",
    "Request blood tests or imaging if recommended",
    "Ask about over-the-counter relief options",
  ];

  const baseEmergency = [
    "Call emergency services (112/911) immediately",
    "Do not drive yourself to the hospital",
    "Keep someone with you at all times",
    "Do not eat or drink anything until evaluated",
    "Inform responders of all symptoms and medications",
  ];

  return {
    homeCare: baseHome,
    seeDoctor: baseDoctor,
    emergency: baseEmergency,
    specialist,
    disclaimer,
  };
}

function getSpecialist(category: string): string {
  const map: Record<string, string> = {
    cardiac: "Cardiologist (Heart Specialist)",
    respiratory: "Pulmonologist or ENT Specialist",
    neurological: "Neurologist or Neurosurgeon",
    infection: "General Physician or Infectious Disease Specialist",
    gastrointestinal: "Gastroenterologist",
    dermatological: "Dermatologist",
    mental_health: "Psychiatrist or Licensed Therapist",
    general: "General Physician (Family Doctor)",
    triage: "General Physician",
  };
  return map[category] ?? "General Physician";
}
