/**
 * reasoningEngine.ts
 * Pure deterministic logic for generating risk explanations and recommendations.
 * No API calls — runs instantly on the client.
 */

import { emergencyFindings } from '@/lib/assessment/findings';
import { formatSymptomName } from '@/lib/assessment/symptomPresentation';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface ReasoningInput {
  primarySymptom: string;
  severity: string;        // mild | moderate | severe | critical
  duration: string;        // < 1 day | 1-3 days | 4-7 days | > 1 week
  additionalSymptoms: string[];
  medicalHistory: string[];
  riskLevel: RiskLevel;
  riskScore: number;
}

export interface RiskExplanation {
  summary: string;
  factors: string[];
}

export interface RecommendationOutput {
  primaryAction: string;
  steps: string[];
}

// ── Symptom label map ─────────────────────────────────────────
const HISTORY_LABELS: Record<string, string> = {
  diabetes: 'diabetes',
  hypertension: 'hypertension',
  heart_disease: 'heart disease',
  blood_thinners: 'blood thinners',
  asthma: 'asthma',
};

function labelSymptom(s: string): string {
  const formatted = formatSymptomName(s, 'en');
  return formatted ? formatted.toLowerCase() : s.replace(/_/g, ' ');
}

function labelHistory(h: string): string {
  return HISTORY_LABELS[h] || h.replace(/_/g, ' ');
}

// ── Risk Explanation ──────────────────────────────────────────

export function generateRiskExplanation(data: ReasoningInput): RiskExplanation {
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel, riskScore = 0 } = data;
  const symptomLabel = labelSymptom(primarySymptom);
  const factors: string[] = [];

  // 1. Primary driver
  factors.push(`${symptomLabel.charAt(0).toUpperCase() + symptomLabel.slice(1)} is the main contributing symptom.`);

  // 2. Severity impact
  if (severity === 'critical' || severity === 'severe') {
    factors.push('High severity significantly increases risk.');
  } else if (severity === 'moderate') {
    factors.push('Moderate severity contributes to the overall risk.');
  } else {
    factors.push('Low severity reduces immediate concern.');
  }

  // 3. Duration impact
  if (duration === '> 12 weeks' || duration === '4-12 weeks') {
    factors.push('Persistent or chronic symptoms lasting multiple weeks or months raise clinical concern.');
  } else if (duration === '> 1 week' || duration === '4-7 days') {
    factors.push('Symptoms lasting multiple days raise clinical concern.');
  } else if (duration === '1-3 days') {
    factors.push('Symptoms lasting a few days add to the risk assessment.');
  } else {
    factors.push('Short duration reduces immediate risk.');
  }

  // 4. Additional symptoms
  const validAdditional = additionalSymptoms.filter(
    s => s && s !== 'none' && s !== primarySymptom
  );
  if (validAdditional.length > 0) {
    const listed = validAdditional.slice(0, 2).map(labelSymptom).join(' and ');
    factors.push(`Additional symptoms (${listed}) further increase risk.`);
  }

  // 5. Medical history
  const validHistory = medicalHistory.filter(h => h && h !== 'none');
  if (validHistory.length > 0) {
    const listed = validHistory.slice(0, 2).map(labelHistory).join(' and ');
    factors.push(`Existing condition${validHistory.length > 1 ? 's' : ''} (${listed}) increase vulnerability.`);
  }

  // 6. Summary
  const isEmergency = riskScore === 100 || emergencyFindings([primarySymptom, ...additionalSymptoms]).length > 0;
  const summary = isEmergency
    ? 'Emergency red-flag indicators were identified that require immediate medical attention.'
    : riskLevel === 'High'
    ? `Multiple concurrent symptoms with moderate severity persisting 1–3 days produced an elevated urgency score of ${riskScore}/100 (reaching the High threshold ≥55 in rule-based decision support). Prompt clinical evaluation is advised.`
    : `Overall, these factors contribute to a ${riskLevel.toLowerCase()} risk assessment (${riskScore}/100).`;

  return { summary, factors };
}

export function generateRecommendations(data: ReasoningInput): RecommendationOutput {
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel, riskScore } = data;
  const isEmergency = riskScore === 100 || emergencyFindings([primarySymptom, ...additionalSymptoms]).length > 0;
  const steps: string[] = [];

  // Base steps by risk level
  if (isEmergency) {
    steps.push('Seek immediate medical attention — do not delay.');
    steps.push('Call emergency services (108) or proceed to the nearest emergency hospital.');
  } else if (riskLevel === 'High') {
    steps.push('Consult a doctor promptly for a comprehensive clinical evaluation.');
    steps.push('Rest and track your symptoms regularly.');
  } else if (riskLevel === 'Medium') {
    steps.push('Consult a healthcare professional if symptoms persist or do not improve.');
    steps.push('Track symptom changes every few hours.');
  } else {
    steps.push('Rest and stay well hydrated.');
    steps.push('Monitor your symptoms over the next 24 hours.');
  }

  // Contextual additions
  if (severity === 'severe' || severity === 'critical') {
    steps.push('Avoid physical exertion until evaluated.');
  }

  if (duration === '> 1 week' || duration === '4-7 days') {
    steps.push('Persistent symptoms require a proper medical evaluation.');
  }

  const allSymptoms = [primarySymptom, ...additionalSymptoms];

  if (allSymptoms.some(s => s === 'chest_pain' || s === 'breathlessness')) {
    steps.push('Monitor your breathing closely and seek help if it worsens.');
  }

  if (allSymptoms.some(s => s === 'fever')) {
    steps.push('Stay hydrated and monitor your temperature regularly.');
  }

  if (allSymptoms.some(s => s === 'dizziness')) {
    steps.push('Avoid driving or operating machinery while dizzy.');
  }

  const validHistory = medicalHistory.filter(h => h && h !== 'none');
  if (validHistory.includes('diabetes')) {
    steps.push('Monitor blood sugar levels closely during illness.');
  }
  if (validHistory.includes('heart_disease') || validHistory.includes('hypertension')) {
    steps.push('Inform your cardiologist or GP about these symptoms promptly.');
  }

  // Always end with safety note
  steps.push('Seek emergency care immediately if symptoms worsen suddenly.');

  // Primary action
  const primaryAction =
    isEmergency
      ? 'Call emergency services (108) or go to the nearest emergency room now.'
      : riskLevel === 'High'
      ? 'Schedule a prompt medical consultation today for clinical evaluation.'
      : riskLevel === 'Medium'
      ? 'Consult a healthcare professional if symptoms persist.'
      : 'Rest at home and monitor your symptoms.';

  return { primaryAction, steps: steps.slice(0, 6) }; // cap at 6 steps
}
