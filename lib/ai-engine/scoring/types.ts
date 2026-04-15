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
  narrative?: { en: string; hi: string; mr: string };
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

// ── Shared result types (used by AppContext, sessions, useTestSession) ──

export type Urgency = UrgencyLevel; // alias for backwards compatibility

export interface Factor {
  id: string;
  label: string;
  score: number;
  isRedFlag: boolean;
  category: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[] | number;
  timestamp: number;
}

export interface ScoreResult {
  score: number;
  urgency: Urgency;
  factors: Factor[];
  recommendation: string;
  primaryCategory: string;
  hasRedFlag: boolean;
  symptomCount: number;
  highestSeverity: string;
  confidenceScore?: number;
  confidenceLevel?: string;
  confidenceExplanation?: string;
  riskReasoning?: string;
  riskSummary?: string;
  riskFactors?: string[];
  primaryAction?: string;
  recommendationSteps?: string[];
  keyInsights?: string[];
  narrative?: {
    en: string;
    hi: string;
    mr: string;
  };
}
