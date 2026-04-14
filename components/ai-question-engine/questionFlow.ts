// ============================================================
// Module 2: questionFlow.ts
// Deterministic, static question tree — fully offline capable.
// This is BOTH the fallback AND the primary question structure.
// AI/Sarvam is additive enhancement, not a dependency.
// ============================================================

import type { QuestionStep, AnswerMap, Language } from "./types";

// ---- Question Bank ----
// Each question has bilingual text baked in (no translation API needed for display).

const SEVERITY_STEP: QuestionStep = {
  id: "severity",
  key: "severity",
  question: {
    en: "How severe is your symptom right now?",
    hi: "अभी आपका लक्षण कितना गंभीर है?",
  },
  type: "mcq",
  options: [
    { label: { en: "Mild — manageable", hi: "हल्का — सहनीय" }, value: "mild", emoji: "🟢" },
    { label: { en: "Moderate — uncomfortable", hi: "मध्यम — असहज" }, value: "moderate", emoji: "🟡" },
    { label: { en: "Severe — very painful", hi: "गंभीर — बहुत दर्दनाक" }, value: "severe", emoji: "🔴" },
  ],
};

const DURATION_STEP: QuestionStep = {
  id: "duration",
  key: "duration",
  question: {
    en: "How long have you been experiencing this?",
    hi: "आप कब से यह महसूस कर रहे हैं?",
  },
  type: "mcq",
  options: [
    { label: { en: "Less than 1 day", hi: "1 दिन से कम" }, value: "< 1 day", emoji: "🕒" },
    { label: { en: "1 – 3 days", hi: "1 – 3 दिन" }, value: "1-3 days", emoji: "📅" },
    { label: { en: "More than 3 days", hi: "3 दिन से अधिक" }, value: "> 3 days", emoji: "⏳" },
  ],
};

const HISTORY_STEP: QuestionStep = {
  id: "history",
  key: "history",
  question: {
    en: "Do you have any pre-existing medical conditions?",
    hi: "क्या आपको पहले से कोई बीमारी है?",
  },
  type: "mcq",
  options: [
    { label: { en: "No known conditions", hi: "कोई नहीं" }, value: "none", emoji: "✅" },
    { label: { en: "Diabetes", hi: "मधुमेह" }, value: "diabetes", emoji: "🩸" },
    { label: { en: "Hypertension", hi: "उच्च रक्तचाप" }, value: "hypertension", emoji: "💓" },
    { label: { en: "Heart disease", hi: "हृदय रोग" }, value: "heart_disease", emoji: "🫀" },
    { label: { en: "Other", hi: "अन्य" }, value: "other", emoji: "🏥" },
  ],
};

// ---- Symptom-specific follow-up steps ----
const SYMPTOM_FOLLOWUP: Record<string, QuestionStep> = {
  fever: {
    id: "fever_followup",
    key: "additional",
    question: {
      en: "Are you experiencing chills or sweating along with the fever?",
      hi: "क्या बुखार के साथ कंपकंपी या पसीना भी हो रहा है?",
    },
    type: "mcq",
    options: [
      { label: { en: "Yes, chills", hi: "हाँ, कंपकंपी" }, value: "chills", emoji: "❄️" },
      { label: { en: "Yes, sweating", hi: "हाँ, पसीना" }, value: "sweating", emoji: "💦" },
      { label: { en: "Both chills and sweating", hi: "दोनों" }, value: "chills_and_sweating", emoji: "🤒" },
      { label: { en: "Neither", hi: "कोई नहीं" }, value: "none", emoji: "❌" },
    ],
  },
  headache: {
    id: "headache_followup",
    key: "additional",
    question: {
      en: "Where is the headache located?",
      hi: "सिरदर्द कहाँ हो रहा है?",
    },
    type: "mcq",
    options: [
      { label: { en: "Forehead", hi: "माथा" }, value: "forehead", emoji: "👤" },
      { label: { en: "Back of head", hi: "सिर के पीछे" }, value: "back_of_head", emoji: "🔙" },
      { label: { en: "One side (migraine)", hi: "एक तरफ (माइग्रेन)" }, value: "one_side", emoji: "🌓" },
      { label: { en: "Entire head", hi: "पूरा सिर" }, value: "full_head", emoji: "🙆" },
    ],
  },
  cough: {
    id: "cough_followup",
    key: "additional",
    question: {
      en: "What type of cough are you experiencing?",
      hi: "आपको किस प्रकार की खांसी है?",
    },
    type: "mcq",
    options: [
      { label: { en: "Dry cough", hi: "सूखी खांसी" }, value: "dry", emoji: "🌵" },
      { label: { en: "Wet / phlegm cough", hi: "बलगम वाली खांसी" }, value: "wet", emoji: "💧" },
      { label: { en: "Cough with blood", hi: "खून वाली खांसी" }, value: "bloody", emoji: "🔴" },
      { label: { en: "Mild tickle", hi: "हल्की गुदगुदी" }, value: "tickle", emoji: "☁️" },
    ],
  },
  fatigue: {
    id: "fatigue_followup",
    key: "additional",
    question: {
      en: "Is the fatigue constant or does it come and go?",
      hi: "थकान लगातार रहती है या आती-जाती है?",
    },
    type: "mcq",
    options: [
      { label: { en: "Constant all day", hi: "पूरे दिन लगातार" }, value: "constant", emoji: "♾️" },
      { label: { en: "Worse in the morning", hi: "सुबह ज़्यादा" }, value: "morning", emoji: "🌅" },
      { label: { en: "Worse in the evening", hi: "शाम को ज़्यादा" }, value: "evening", emoji: "🌇" },
      { label: { en: "Comes and goes", hi: "आती-जाती है" }, value: "intermittent", emoji: "📉" },
    ],
  },
  default: {
    id: "generic_followup",
    key: "additional",
    question: {
      en: "Are there any other symptoms accompanying this?",
      hi: "क्या इसके साथ कोई और लक्षण भी हैं?",
    },
    type: "mcq",
    options: [
      { label: { en: "Nausea or vomiting", hi: "मतली या उल्टी" }, value: "nausea", emoji: "🤢" },
      { label: { en: "Dizziness", hi: "चक्कर आना" }, value: "dizziness", emoji: "🌀" },
      { label: { en: "Shortness of breath", hi: "सांस की तकलीफ" }, value: "breathlessness", emoji: "🫁" },
      { label: { en: "No other symptoms", hi: "कोई और नहीं" }, value: "none", emoji: "❌" },
    ],
  },
};

// ---- Flow definition ----
// Steps in order: severity → duration → symptom-followup → history

function getFlowSteps(symptom: string): QuestionStep[] {
  const normalized = (symptom ?? "").toLowerCase().trim();
  const followup = SYMPTOM_FOLLOWUP[normalized] ?? SYMPTOM_FOLLOWUP.default;
  return [SEVERITY_STEP, DURATION_STEP, followup, HISTORY_STEP];
}

// ---- Public API ----

/**
 * Returns the QuestionStep for the given step index and symptom.
 * Returns null when the flow is complete (index >= total steps).
 */
export function getNextQuestion(
  step: number,
  symptom: string
): QuestionStep | null {
  const steps = getFlowSteps(symptom);
  return step < steps.length ? steps[step] : null;
}

/**
 * Total number of steps for a given symptom.
 */
export function getTotalSteps(symptom: string): number {
  return getFlowSteps(symptom).length;
}

/**
 * Returns true when the step index has passed all available questions.
 */
export function isFlowComplete(step: number, symptom: string): boolean {
  return step >= getTotalSteps(symptom);
}

/**
 * Builds the final structured output object from accumulated answers.
 */
export function buildFinalOutput(symptom: string, answers: AnswerMap, language?: string): any {
  return {
    symptom: (symptom ?? "").toLowerCase().trim(),
    severity: answers.severity ?? "unknown",
    duration: answers.duration ?? "unknown",
    additionalSymptoms: answers.additional ? [answers.additional] : [],
    language: language ?? "en",
  };
}
