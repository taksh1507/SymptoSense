/**
 * reasoningEngine.ts
 * Pure deterministic logic for generating risk explanations and recommendations.
 * No API calls — runs instantly on the client.
 */

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
const SYMPTOM_LABELS: Record<string, string> = {
  fever: 'fever',
  headache: 'headache',
  cough: 'cough',
  chest_pain: 'chest pain',
  breathlessness: 'shortness of breath',
  stomach_pain: 'stomach pain',
  fatigue: 'fatigue',
  dizziness: 'dizziness',
};

const HISTORY_LABELS: Record<string, string> = {
  diabetes: 'diabetes',
  hypertension: 'hypertension',
  heart_disease: 'heart disease',
  blood_thinners: 'blood thinners',
  asthma: 'asthma',
};

function labelSymptom(s: string): string {
  return SYMPTOM_LABELS[s] || s.replace(/_/g, ' ');
}

function labelHistory(h: string): string {
  return HISTORY_LABELS[h] || h.replace(/_/g, ' ');
}

// ── Risk Explanation ──────────────────────────────────────────

export function generateRiskExplanation(data: ReasoningInput): RiskExplanation {
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel } = data;
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
  if (duration === '> 1 week' || duration === '4-7 days') {
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
  const summary = `Overall, these factors contribute to a ${riskLevel.toLowerCase()} risk assessment.`;

  return { summary, factors };
}

// ── Recommendation Engine ─────────────────────────────────────

export function generateRecommendations(data: ReasoningInput): RecommendationOutput {
  const { primarySymptom, severity, duration, additionalSymptoms, medicalHistory, riskLevel } = data;
  const steps: string[] = [];

  // Base steps by risk level
  if (riskLevel === 'High') {
    steps.push('Seek immediate medical attention — do not delay.');
    steps.push('Call emergency services or go to the nearest hospital.');
  } else if (riskLevel === 'Medium') {
    steps.push('Consult a doctor within 24–48 hours.');
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
    riskLevel === 'High'
      ? 'Go to the nearest emergency department now.'
      : riskLevel === 'Medium'
      ? 'Consult a doctor within 24 hours.'
      : 'Rest at home and monitor your symptoms.';

  return { primaryAction, steps: steps.slice(0, 6) }; // cap at 6 steps
}
