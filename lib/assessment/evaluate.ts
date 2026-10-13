import type { FinalAssessmentPayload } from '@/components/ai-question-engine/types';
import { calculateRisk, RULE_VERSION } from '@/lib/ai-engine/scoring/engine';
import type { ScoreResult } from '@/lib/ai-engine/scoring/types';
import { collectSymptoms } from './findings';
import { localizeResult } from '@/lib/report/localize';
import { generateRiskExplanation, generateRecommendations } from '@/lib/report/reasoningEngine';

export function assessmentContext(data: FinalAssessmentPayload) {
  const selected = collectSymptoms(data.symptoms, data.customSymptom);
  const adaptive = collectSymptoms([], undefined, Object.values(data.aiAnswerLabels));
  const additionalSymptoms = [...new Set([...selected.slice(1), ...adaptive])].filter(s => s !== selected[0]);
  const medicalHistory = [...new Set([...data.medications, ...(data.customMedication ? [data.customMedication] : [])])].filter(m => m !== 'none');
  return { primarySymptom: selected[0] ?? data.customSymptom ?? data.symptoms[0] ?? 'general', additionalSymptoms, medicalHistory, selected, adaptive, severity: data.severity, duration: data.duration };
}
export function evaluateAssessment(data: FinalAssessmentPayload): ScoreResult {
  const context = assessmentContext(data);
  const analysis = calculateRisk({ symptom: context.primarySymptom, symptoms: context.selected.length ? context.selected : [context.primarySymptom], severity: data.severity, duration: data.duration, additionalSymptoms: context.adaptive, medicalHistory: context.medicalHistory });
  const local = generateRiskExplanation({ ...context, riskLevel: analysis.urgency, riskScore: analysis.score });
  const recs = generateRecommendations({ ...context, riskLevel: analysis.urgency, riskScore: analysis.score });
  return localizeResult({
    ...analysis, ruleVersion: RULE_VERSION, recommendation: analysis.recommendation.en,
    primaryCategory: context.primarySymptom, hasRedFlag: analysis.isRedFlag,
    symptomCount: context.selected.length + context.adaptive.filter(s => !context.selected.includes(s)).length,
    highestSeverity: data.severity, riskReasoning: analysis.urgency + ' triage level based on the reported findings.',
    riskSummary: local.summary, riskFactors: local.factors, primaryAction: recs.primaryAction,
    recommendationSteps: recs.steps, keyInsights: [],
  }, data.language);
}
