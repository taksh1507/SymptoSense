// ============================================================
// SCORING ENGINE — Pure TypeScript deterministic scoring
// ============================================================
import { QUESTIONS, type Question } from "./questionTree";
import { isRedFlag } from "./redFlags";

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
}

export interface Answer {
  questionId: string;
  answer: string | string[] | number;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// Severity multipliers based on q_severity answer
const SEVERITY_MULTIPLIERS: Record<string, number> = {
  mild: 1.0,
  moderate: 1.5,
  severe: 2.0,
  critical: 2.0,
};

// Duration bonuses based on q_duration answer  
const DURATION_BONUSES: Record<string, number> = {
  hours: 5,
  days: 12,
  week: 15,
  weeks: 18,
  months: 22,
};

// Age-based modifiers
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

  // Extract severity and duration first for multipliers
  for (const ans of answers) {
    if (ans.questionId === "q_severity") {
      const sev = Array.isArray(ans.answer) ? ans.answer[0] : String(ans.answer);
      severityMultiplier = SEVERITY_MULTIPLIERS[sev] ?? 1.0;
    }
    if (ans.questionId === "q_duration") {
      const dur = Array.isArray(ans.answer) ? ans.answer[0] : String(ans.answer);
      durationBonus = DURATION_BONUSES[dur] ?? 0;
    }
    if (ans.questionId === "q_age") {
      const age = Array.isArray(ans.answer) ? ans.answer[0] : String(ans.answer);
      ageModifier = AGE_MODIFIERS[age] ?? 1.0;
    }
  }

  // Compute score from answers
  for (const ans of answers) {
    if (ans.questionId === "q_severity" || ans.questionId === "q_duration") continue;

    const question = QUESTIONS[ans.questionId];
    if (!question) continue;

    const selectedIds = Array.isArray(ans.answer) ? ans.answer : [String(ans.answer)];

    // Scale question scoring
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

    // MCQ / YesNo scoring
    for (const optId of selectedIds) {
      if (optId === "none" || optId === "no_medications" || optId === "none_of_above" || optId === "none_fever" || optId === "no_association" || optId === "normal_breath") continue;

      const option = question.options?.find((o) => o.id === optId);
      if (!option || !option.score || option.score === 0) continue;

      const optScore = option.score;
      const rf = option.redFlag || isRedFlag(optId);

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

    // Handle "other_text:" special input
    const otherText = selectedIds.find(id => id.startsWith("other_text:"))?.replace("other_text:", "");
    if (otherText) {
      const keywords = {
        severe: 15,
        pain: 10,
        blood: 25,
        urgent: 20,
        breathing: 20,
        chest: 15,
      };
      let textScore = 5; // base score for generic other input
      for (const [kw, val] of Object.entries(keywords)) {
        if (otherText.toLowerCase().includes(kw)) {
          textScore += val;
        }
      }
      
      factors.push({
        id: "other_custom",
        label: `Other: ${otherText.length > 30 ? otherText.substring(0, 30) + "..." : otherText}`,
        score: textScore,
        isRedFlag: textScore >= 25,
        category: question.category,
      });
      rawScore += textScore;
      categories[question.category] = (categories[question.category] ?? 0) + textScore;
      if (textScore >= 25) hasRedFlag = true;
    }
  }

  // Apply multipliers
  let adjustedScore = (rawScore * severityMultiplier * ageModifier) + durationBonus;

  // Combine bonus: 3+ high-score factors
  const highScoreFactors = factors.filter((f) => f.score >= 20);
  if (highScoreFactors.length >= 3) adjustedScore += 10;

  // Red flag override
  if (hasRedFlag) {
    adjustedScore = Math.max(adjustedScore, 90);
  }

  // Clamp to 0–100
  const finalScore = Math.round(Math.min(100, Math.max(0, adjustedScore)));

  // Urgency
  let urgency: Urgency;
  if (finalScore < 35) urgency = "Low";
  else if (finalScore <= 65) urgency = "Medium";
  else urgency = "High";

  // If red flag always High
  if (hasRedFlag) urgency = "High";

  // Primary category: highest score sum
  const primaryCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general";

  // Highest severity factor
  const topFactor = factors.sort((a, b) => b.score - a.score)[0];
  const highestSeverity = topFactor?.label ?? "General symptoms";

  // Recommendation text
  const recommendation = buildRecommendation(urgency, primaryCategory);

  return {
    score: finalScore,
    urgency,
    factors: factors.sort((a, b) => b.score - a.score),
    recommendation,
    primaryCategory: CATEGORY_LABELS[primaryCategory] ?? primaryCategory,
    hasRedFlag,
    symptomCount: factors.length,
    highestSeverity,
  };
}

function buildRecommendation(urgency: Urgency, category: string): string {
  if (urgency === "High") {
    return "Your symptoms suggest a potentially serious condition that requires immediate medical evaluation. Please seek emergency care or call emergency services.";
  }
  if (urgency === "Medium") {
    return "Your symptoms indicate you should see a doctor within the next 24 hours. Avoid strenuous activity and monitor your condition closely.";
  }
  return "Your symptoms appear manageable at home. Rest, stay hydrated, and monitor for any worsening. Consult a doctor if symptoms persist beyond 3 days.";
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
