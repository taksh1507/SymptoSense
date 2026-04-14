/**
 * Production-ready types for the AIQuestionEngine module.
 */

export type Language = "en" | "hi";

export interface QuestionOption {
  label: { en: string; hi: string };
  value: string; // Canonical value for logic
  emoji: string;
  speech?: { en: string; hi: string }; // Optional custom speech overrides
}

export interface QuestionStep {
  id: string;
  key: string;
  question: { en: string; hi: string };
  options: QuestionOption[];
  type: "mcq";
  category?: string;
}

export interface QuestionContext {
  initialSymptom: string;
  answers: AnswerMap;
  currentStep: number;
  language: Language;
}

export type AnswerMap = Record<string, string>;

export interface FinalAssessmentPayload {
  symptom: string;
  severity: string;
  duration: string;
  additionalSymptoms: string[];
  language: string;
}

export interface EngineProps {
  initialSymptom: string;
  defaultLanguage?: Language;
  onComplete: (data: FinalAssessmentPayload) => void;
}

/**
 * Risk Engine Types (Kept for integration support)
 */

export type UrgencyLevel = "Low" | "Medium" | "High";

export interface RiskAnalysis {
  score: number;
  urgency: UrgencyLevel;
  explanation: string[];
  recommendation: { en: string; hi: string };
  isRedFlag: boolean;
  narrative?: { en: string; hi: string };
}
