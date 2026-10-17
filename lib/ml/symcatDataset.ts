import fs from 'fs';
import type { SymcatDataset, SymcatUrgencyRow, SymcatSymptomRow, SymcatBucketRow, ClinicalPreprocessStep } from './report';

interface RawCondition {
  id: string;
  name: string;
  urgency: string;
  prevalence?: number;
  symptoms?: Record<string, number>;
  description?: string;
  precautions?: string[];
}

interface RawKnowledgeBase {
  version: string;
  source: string;
  total_conditions: number;
  total_symptoms: number;
  symptoms: string[];
  conditions: Record<string, RawCondition>;
}

const bucketOf = (n: number): string =>
  n <= 8 ? '≤8' : n <= 11 ? '9–11' : n === 12 ? '12' : n <= 17 ? '13–17' : n <= 25 ? '18–25' : n <= 40 ? '26–40' : '41+';

const BUCKET_ORDER = ['≤8', '9–11', '12', '13–17', '18–25', '26–40', '41+'];

export function analyzeSymcatDataset(filePath: string): SymcatDataset {
  const kb = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawKnowledgeBase;
  const conditions = Object.values(kb.conditions || {});

  const urgencyCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  const bucketCounts: Record<string, number> = {};
  for (const b of BUCKET_ORDER) bucketCounts[b] = 0;

  const symptomConditions: Record<string, number> = {};
  const symptomProbSum: Record<string, number> = {};
  let symptomLinks = 0;
  let withDescription = 0;
  let withPrecautions = 0;

  for (const condition of conditions) {
    const urgency = urgencyCounts[condition.urgency] !== undefined ? condition.urgency : 'Medium';
    urgencyCounts[urgency] += 1;

    const syms = condition.symptoms || {};
    const names = Object.keys(syms);
    symptomLinks += names.length;
    bucketCounts[bucketOf(names.length)] += 1;

    if (condition.description && condition.description.trim().length > 0) withDescription += 1;
    if (Array.isArray(condition.precautions) && condition.precautions.length > 0) withPrecautions += 1;

    for (const s of names) {
      symptomConditions[s] = (symptomConditions[s] || 0) + 1;
      symptomProbSum[s] = (symptomProbSum[s] || 0) + (typeof syms[s] === 'number' ? syms[s] : 0);
    }
  }

  const urgencyDistribution: SymcatUrgencyRow[] = ['High', 'Medium', 'Low']
    .map(urgency => ({ urgency, conditions: urgencyCounts[urgency] }));

  const topSymptoms: SymcatSymptomRow[] = Object.keys(symptomConditions)
    .map(symptom => ({
      symptom,
      conditions: symptomConditions[symptom],
      avg_probability: Math.round((100 * (symptomProbSum[symptom] || 0) / Math.max(1, symptomConditions[symptom]))) / 100,
    }))
    .sort((a, b) => b.conditions - a.conditions)
    .slice(0, 25);

  const symptomsPerCondition: SymcatBucketRow[] = BUCKET_ORDER.map(bucket => ({ bucket, conditions: bucketCounts[bucket] }));

  const total = conditions.length;
  const avg = Math.round((symptomLinks / Math.max(1, total)) * 100) / 100;

  const preprocessing: ClinicalPreprocessStep[] = [
    { step: 1, name: 'Load raw CDC/SymCat CSV exports', input: 'symcat-801-diseases.csv + symcat-474-symptoms.csv', output: `${total} disorder groups`, formula: 'read_csv(low_memory=False) → column groups ending in "_disorder_name"' },
    { step: 2, name: 'Extract condition records', input: `${total} disorder groups`, output: total, formula: 'dropna → normalize name to snake_case slug → dedupe' },
    { step: 3, name: 'Map cardinal symptoms + probabilities', input: `${total} conditions`, output: symptomLinks, formula: 'percentage ÷ 100 → clamp to [0.05, 0.99]' },
    { step: 4, name: 'Cross-reference symptom database', input: 'symcat-474-symptoms.csv', output: kb.total_symptoms, formula: 'add missing symptom→condition links, dedupe' },
    { step: 5, name: 'Rule-based urgency tagging', input: total, output: `${urgencyCounts.High} High / ${urgencyCounts.Medium} Medium / ${urgencyCounts.Low} Low`, formula: 'red-flag keyword match on name/slug' },
    { step: 6, name: 'Enrich descriptions & precautions', input: total, output: `${withDescription} described / ${withPrecautions} with guidance`, formula: 'merge Kaggle symptom_Description.csv + symptom_precaution.csv' },
    { step: 7, name: 'Compile knowledge-base JSON', input: total, output: `${total} conditions × ${kb.total_symptoms} symptoms`, formula: 'sum(conditions.symptoms) = ' + symptomLinks + ' links', },
  ];

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: kb.source,
    version: kb.version,
    total_conditions: total,
    total_symptoms: kb.total_symptoms,
    symptom_links: symptomLinks,
    avg_symptoms_per_condition: avg,
    with_description: withDescription,
    with_precautions: withPrecautions,
    urgency_distribution: urgencyDistribution,
    top_symptoms: topSymptoms,
    symptoms_per_condition: symptomsPerCondition,
    preprocessing,
  };
}
