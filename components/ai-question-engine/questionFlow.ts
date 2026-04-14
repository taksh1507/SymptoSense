// ============================================================
// questionFlow.ts
// Static questions: Q1 (Age), Q2 (Symptoms), Q9 (Duration),
// Q10 (Severity), Q11 (Medications).
// Q3-Q8 are generated dynamically by Gemini AI.
// ============================================================

import type { QuestionStep, FinalAssessmentPayload, AnswerMap } from "./types";

// ── Q1: Age ──────────────────────────────────────────────────
export const Q1_AGE: QuestionStep = {
  id: "q1_age",
  key: "age",
  type: "mcq",
  singleSelect: true,
  question: {
    en: "What is your age group?",
    hi: "आपकी आयु वर्ग क्या है?",
    mr: "तुमची वयोगट काय आहे?",
  },
  options: [
    { label: { en: "Child (0–12)", hi: "बच्चा (0–12)", mr: "मूल (0–12)" }, value: "child", emoji: "👶" },
    { label: { en: "Teen (13–18)", hi: "किशोर (13–18)", mr: "किशोर (13–18)" }, value: "teen", emoji: "👦" },
    { label: { en: "Adult (19–50)", hi: "वयस्क (19–50)", mr: "प्रौढ (19–50)" }, value: "adult", emoji: "👨" },
    { label: { en: "Elderly (50+)", hi: "बुजुर्ग (50+)", mr: "वृद्ध (50+)" }, value: "elderly", emoji: "👴" },
  ],
};

// ── Q2: Symptoms ─────────────────────────────────────────────
export const Q2_SYMPTOMS: QuestionStep = {
  id: "q2_symptoms",
  key: "symptoms",
  type: "multiselect",
  allowOther: true,
  question: {
    en: "What are your main symptoms? (Select all that apply)",
    hi: "आपके मुख्य लक्षण क्या हैं? (सभी लागू विकल्प चुनें)",
    mr: "तुमची मुख्य लक्षणे कोणती आहेत? (सर्व लागू पर्याय निवडा)",
  },
  options: [
    { label: { en: "Fever / Chills", hi: "बुखार / कंपकंपी", mr: "ताप / थंडी" }, value: "fever", emoji: "🌡️" },
    { label: { en: "Headache", hi: "सिरदर्द", mr: "डोकेदुखी" }, value: "headache", emoji: "🤕" },
    { label: { en: "Cough", hi: "खांसी", mr: "खोकला" }, value: "cough", emoji: "🫁" },
    { label: { en: "Chest Pain", hi: "सीने में दर्द", mr: "छातीत दुखणे" }, value: "chest_pain", emoji: "💔" },
    { label: { en: "Shortness of Breath", hi: "सांस की तकलीफ", mr: "श्वास घेण्यास त्रास" }, value: "breathlessness", emoji: "😮‍💨" },
    { label: { en: "Stomach Pain / Nausea", hi: "पेट दर्द / मतली", mr: "पोटदुखी / मळमळ" }, value: "stomach_pain", emoji: "🤢" },
    { label: { en: "Fatigue / Weakness", hi: "थकान / कमजोरी", mr: "थकवा / अशक्तपणा" }, value: "fatigue", emoji: "⚡" },
    { label: { en: "Dizziness", hi: "चक्कर आना", mr: "चक्कर येणे" }, value: "dizziness", emoji: "🌀" },
  ],
};

// ── Q9: Duration ─────────────────────────────────────────────
export const Q9_DURATION: QuestionStep = {
  id: "q9_duration",
  key: "duration",
  type: "mcq",
  singleSelect: true,
  question: {
    en: "How long have you been experiencing these symptoms?",
    hi: "आपको ये लक्षण कितने समय से हैं?",
    mr: "तुम्हाला ही लक्षणे किती काळापासून आहेत?",
  },
  options: [
    { label: { en: "Less than 24 hours", hi: "24 घंटे से कम", mr: "24 तासांपेक्षा कमी" }, value: "< 1 day", emoji: "⏰" },
    { label: { en: "1 – 3 days", hi: "1 – 3 दिन", mr: "1 – 3 दिवस" }, value: "1-3 days", emoji: "📅" },
    { label: { en: "4 – 7 days", hi: "4 – 7 दिन", mr: "4 – 7 दिवस" }, value: "4-7 days", emoji: "📆" },
    { label: { en: "More than a week", hi: "एक हफ्ते से ज़्यादा", mr: "एका आठवड्यापेक्षा जास्त" }, value: "> 1 week", emoji: "⏳" },
  ],
};

// ── Q10: Severity ─────────────────────────────────────────────
export const Q10_SEVERITY: QuestionStep = {
  id: "q10_severity",
  key: "severity",
  type: "mcq",
  singleSelect: true,
  question: {
    en: "How severe are your symptoms overall?",
    hi: "आपके लक्षण कुल मिलाकर कितने गंभीर हैं?",
    mr: "तुमची लक्षणे एकूण किती गंभीर आहेत?",
  },
  options: [
    { label: { en: "Mild — I can manage normally", hi: "हल्का — मैं सामान्य रूप से काम कर सकता हूँ", mr: "सौम्य — मी सामान्यपणे काम करू शकतो" }, value: "mild", emoji: "🟢" },
    { label: { en: "Moderate — Some activities are harder", hi: "मध्यम — कुछ काम मुश्किल हैं", mr: "मध्यम — काही कामे कठीण आहेत" }, value: "moderate", emoji: "🟡" },
    { label: { en: "Severe — Mostly unable to function", hi: "गंभीर — ज़्यादातर काम नहीं कर पा रहा", mr: "गंभीर — बहुतेक काम करणे शक्य नाही" }, value: "severe", emoji: "🔴" },
    { label: { en: "Critical — Cannot get out of bed", hi: "अत्यंत गंभीर — बिस्तर से उठ नहीं सकता", mr: "अत्यंत गंभीर — अंथरुणातून उठता येत नाही" }, value: "critical", emoji: "🚨" },
  ],
};

// ── Q11: Medications ──────────────────────────────────────────
export const Q11_MEDICATIONS: QuestionStep = {
  id: "q11_medications",
  key: "medications",
  type: "multiselect",
  allowOther: true,
  question: {
    en: "Are you currently on any medications or have known conditions?",
    hi: "क्या आप अभी कोई दवाई ले रहे हैं या कोई ज्ञात बीमारी है?",
    mr: "तुम्ही सध्या कोणती औषधे घेत आहात किंवा कोणता ज्ञात आजार आहे का?",
  },
  options: [
    { label: { en: "No medications / conditions", hi: "कोई दवाई / बीमारी नहीं", mr: "कोणतीही औषधे / आजार नाही" }, value: "none", emoji: "✅" },
    { label: { en: "Diabetes", hi: "मधुमेह", mr: "मधुमेह" }, value: "diabetes", emoji: "💉" },
    { label: { en: "Hypertension / BP", hi: "उच्च रक्तचाप", mr: "उच्च रक्तदाब" }, value: "hypertension", emoji: "💓" },
    { label: { en: "Heart disease", hi: "हृदय रोग", mr: "हृदयरोग" }, value: "heart_disease", emoji: "🫀" },
    { label: { en: "Blood thinners", hi: "खून पतला करने की दवा", mr: "रक्त पातळ करणारी औषधे" }, value: "blood_thinners", emoji: "💊" },
    { label: { en: "Asthma / Lung condition", hi: "अस्थमा / फेफड़े की बीमारी", mr: "दमा / फुफ्फुसाचा आजार" }, value: "asthma", emoji: "🫁" },
  ],
};

// ── Flow stage helpers ────────────────────────────────────────

export type FlowStage =
  | "q1_age"
  | "q2_symptoms"
  | "ai_questions"   // Q3-Q8 (Gemini)
  | "q9_duration"
  | "q10_severity"
  | "q11_medications"
  | "complete";

export function getStaticQuestion(stage: FlowStage): QuestionStep | null {
  switch (stage) {
    case "q1_age": return Q1_AGE;
    case "q2_symptoms": return Q2_SYMPTOMS;
    case "q9_duration": return Q9_DURATION;
    case "q10_severity": return Q10_SEVERITY;
    case "q11_medications": return Q11_MEDICATIONS;
    default: return null;
  }
}

export function buildFinalOutput(
  age: string,
  symptoms: string[],
  customSymptom: string | undefined,
  aiAnswers: AnswerMap,
  duration: string,
  severity: string,
  medications: string[],
  customMedication: string | undefined,
  language: string
): FinalAssessmentPayload {
  return {
    age,
    symptoms,
    customSymptom,
    aiAnswers,
    duration,
    severity,
    medications,
    customMedication,
    language,
  };
}

// Total steps: Q1 + Q2 + 6 AI + Q9 + Q10 + Q11 = 11
export const TOTAL_STEPS = 11;
export const AI_QUESTION_COUNT = 6;
