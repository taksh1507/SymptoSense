/**
 * Production-ready types for the AIQuestionEngine module.
 */

export type Language = "en" | "hi" | "mr";

export interface QuestionOption {
  label: { en: string; hi: string; mr: string };
  value: string;
  emoji: string;
  speech?: { en: string; hi: string; mr: string };
}

export interface QuestionStep {
  id: string;
  key: string;
  question: { en: string; hi: string; mr: string };
  options: QuestionOption[];
  type: "mcq" | "multiselect";
  category?: string;
  allowOther?: boolean; // shows "Something else" text input
  singleSelect?: boolean; // enforces single selection even in multiselect
}

export interface QuestionContext {
  age: string;
  symptoms: string[];
  customSymptom?: string;
  aiAnswers: AnswerMap;
  currentAiStep: number; // 0-5 (6 AI questions max)
  language: Language;
}

export type AnswerMap = Record<string, string>;

export interface FinalAssessmentPayload {
  age: string;
  symptoms: string[];
  customSymptom?: string;
  aiAnswers: AnswerMap;
  duration: string;
  severity: string;
  medications: string[];
  customMedication?: string;
  language: string;
}

export interface EngineProps {
  defaultLanguage?: Language;
  onComplete: (data: FinalAssessmentPayload) => void;
  onCancel: () => void;
}

// ── Risk Engine Types ──────────────────────────────────────

export type UrgencyLevel = "Low" | "Medium" | "High";

export interface RiskAnalysis {
  score: number;
  urgency: UrgencyLevel;
  explanation: string[];
  recommendation: { en: string; hi: string };
  isRedFlag: boolean;
  narrative?: { en: string; hi: string };
}
