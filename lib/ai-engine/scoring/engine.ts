import { SCORING_DATASET } from './rules';
import { classifyUrgency } from './thresholds';
import type { RiskAnalysis, SurveyResult } from './types';
import { extractAffirmedSymptoms, emergencyFindings, normalizeClinicalValue, isDeniedFinding } from '@/lib/assessment/findings';

export const RULE_VERSION = '2026-10-13.2';
export function calculateRisk(input: SurveyResult): RiskAnalysis {
  const rawPrimary = input.symptoms?.length ? input.symptoms : [input.symptom];
  const rawAdditional = input.additionalSymptoms ?? (input.additional && input.additional !== 'none' ? [input.additional] : []);
  const flags = emergencyFindings([...rawPrimary, ...rawAdditional]);
  if (flags.length) return {
    score: 100, urgency: 'High', isRedFlag: true,
    factors: flags.map(id => ({ id, label: 'Emergency indicator: ' + id.replace(/_/g, ' '), score: 100, isRedFlag: true, category: 'red_flag' })),
    explanation: ['Emergency indicators require immediate evaluation.'], recommendation: SCORING_DATASET.recommendations.High,
  };
  const factors: RiskAnalysis['factors'] = [];
  const add = (id: string, label: string, score: number, category: string) => {
    if (score > 0) factors.push({ id, label, score, isRedFlag: false, category });
  };
  const canonical = (raw: string): string[] => {
    if (!raw || normalizeClinicalValue(raw) === 'none') return [];
    const known = extractAffirmedSymptoms(raw);
    if (known.length) return known;
    // A denied finding is not an unknown affirmative symptom.
    if (isDeniedFinding(raw)) return [];
    return [normalizeClinicalValue(raw).replace(/ /g, '_')];
  };
  const primary = [...new Set(rawPrimary.flatMap(canonical))];
  const additional = [...new Set(rawAdditional.flatMap(canonical))].filter(s => !primary.includes(s));
  for (const symptom of primary) add('symptom_' + symptom, 'Reported symptom: ' + symptom.replace(/_/g, ' '), SCORING_DATASET.symptoms[symptom] ?? 15, 'symptom');
  for (const symptom of additional) add('additional_' + symptom, 'Additional symptom: ' + symptom.replace(/_/g, ' '), SCORING_DATASET.additionalSymptoms[symptom] ?? SCORING_DATASET.symptoms[symptom] ?? 10, 'additional');
  add('severity', 'Severity: ' + input.severity, SCORING_DATASET.severity[input.severity.toLowerCase()] ?? 0, 'severity');
  add('duration', 'Duration: ' + input.duration, SCORING_DATASET.duration[input.duration.toLowerCase()] ?? 0, 'duration');
  const history = [...new Set((input.medicalHistory ?? (input.history ? [input.history] : [])).filter(h => !isDeniedFinding(h)).map(h => normalizeClinicalValue(h).replace(/ /g, '_')))].filter(h => h && h !== 'none');
  for (const condition of history) add('history_' + condition, 'History: ' + condition.replace(/_/g, ' '), SCORING_DATASET.medicalHistory[condition] ?? 10, 'history');
  const score = Math.min(100, factors.reduce((total, factor) => total + factor.score, 0));
  const urgency = classifyUrgency(score);
  const symptomText = primary.map(s => s.replace(/_/g, ' ')).join(', ') || 'reported symptoms';
  return {
    score, urgency, isRedFlag: false, factors,
    explanation: factors.map(f => '+' + f.score + ' ' + f.label),
    recommendation: SCORING_DATASET.recommendations[urgency],
    narrative: {
      en: 'Your reported ' + symptomText + ' with ' + input.severity + ' severity and ' + input.duration + ' duration produced a ' + urgency + ' triage level.',
      hi: 'आपके बताए गए लक्षणों के आधार पर जोखिम स्तर ' + ({ High: 'उच्च', Medium: 'मध्यम', Low: 'कम' }[urgency]) + ' है।',
      mr: 'तुम्ही नोंदवलेल्या लक्षणांनुसार जोखीम पातळी ' + ({ High: 'उच्च', Medium: 'मध्यम', Low: 'कमी' }[urgency]) + ' आहे.',
    },
  };
}
