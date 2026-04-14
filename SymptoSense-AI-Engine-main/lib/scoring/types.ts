/**
 * Shared types for the Risk Scoring Engine
 */

export type UrgencyLevel = "Low" | "Medium" | "High";

export interface SurveyResult {
  symptom: string;
  severity: string;
  duration: string;
  additional?: string;
  history?: string;
}

export interface RiskAnalysis {
  score: number;
  urgency: UrgencyLevel;
  explanation: string[];
  recommendation: { en: string; hi: string };
  isRedFlag: boolean;
  narrative?: { en: string; hi: string };
}

/**
 * Scoring Dataset Structure
 */

export interface ScoringRules {
  symptoms: Record<string, number>;
  severity: Record<string, number>;
  duration: Record<string, number>;
  medicalHistory: Record<string, number>;
  additionalSymptoms: Record<string, number>;
  redFlags: string[];
  thresholds: {
    medium: number;
    high: number;
  };
  recommendations: Record<UrgencyLevel, { en: string; hi: string }>;
}
