import fs from 'fs';
import type { ClinicalDataset, ClinicalClassRow, ClinicalSymptomRow, ClinicalCaseRow, ClinicalPreprocessStep } from './report';

const norm = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

export function analyzeClinicalDataset(filePath: string): ClinicalDataset {
  const text = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const header = lines[0].split(',');
  const symptomColumns = header.slice(1);

  const byDiseaseRaw: Record<string, number> = {};
  const byDiseaseUnique: Record<string, number> = {};
  const seenPatterns = new Set<string>();
  const symptomUnique: Record<string, number> = {};
  const symptomRaw: Record<string, number> = {};
  const casesBySymptomCount: Record<number, number> = {};
  let rawCells = 0;
  let blankCells = 0;
  let populatedCells = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    const disease = (fields[0] || '').trim();
    if (!disease) continue;
    byDiseaseRaw[disease] = (byDiseaseRaw[disease] || 0) + 1;

    const symptoms = new Set<string>();
    for (let j = 1; j < fields.length; j++) {
      rawCells++;
      const cell = fields[j];
      if (cell === undefined || cell.trim() === '') { blankCells++; continue; }
      const token = norm(cell);
      if (!token) { blankCells++; continue; }
      populatedCells++;
      symptoms.add(token);
      symptomRaw[token] = (symptomRaw[token] || 0) + 1;
    }

    const key = disease + '|' + [...symptoms].sort().join(',');
    if (!seenPatterns.has(key)) {
      seenPatterns.add(key);
      byDiseaseUnique[disease] = (byDiseaseUnique[disease] || 0) + 1;
      for (const s of symptoms) symptomUnique[s] = (symptomUnique[s] || 0) + 1;
    }
    casesBySymptomCount[symptoms.size] = (casesBySymptomCount[symptoms.size] || 0) + 1;
  }

  const rawRows = lines.length - 1;
  const uniquePatterns = seenPatterns.size;
  const diseases = Object.keys(byDiseaseRaw).length;
  const distinctSymptoms = Object.keys(symptomUnique).length;
  const ones = Object.values(symptomUnique).reduce((a, b) => a + b, 0);

  const classDistribution: ClinicalClassRow[] = Object.keys(byDiseaseRaw)
    .sort((a, b) => byDiseaseRaw[b] - byDiseaseRaw[a])
    .map(disease => ({ disease, raw: byDiseaseRaw[disease], unique: byDiseaseUnique[disease] || 0 }));

  const topSymptoms: ClinicalSymptomRow[] = Object.keys(symptomUnique)
    .map(symptom => ({ symptom, unique_patterns: symptomUnique[symptom], raw_cells: symptomRaw[symptom] || 0 }))
    .sort((a, b) => b.unique_patterns - a.unique_patterns)
    .slice(0, 25);

  const symptomsPerCase: ClinicalCaseRow[] = Object.keys(casesBySymptomCount)
    .map(Number)
    .sort((a, b) => a - b)
    .map(count => ({ count, cases: casesBySymptomCount[count] }));

  const deduplicationRatio = Math.round((rawRows / Math.max(1, uniquePatterns)) * 1000) / 1000;
  const matrixCells = uniquePatterns * distinctSymptoms;

  const preprocessing: ClinicalPreprocessStep[] = [
    { step: 1, name: 'Load raw CSV & strip BOM/whitespace', input: `${rawRows} rows × ${symptomColumns.length} symptom columns`, output: rawRows, formula: 'read_csv → trim cell whitespace' },
    { step: 2, name: 'Normalize symptom tokens', input: `${populatedCells} populated cells`, output: distinctSymptoms, formula: 'lowercase → non-alphanumeric→"_" → collapse "_"' },
    { step: 3, name: 'Drop blank / empty symptom cells', input: rawCells, output: populatedCells, formula: `${rawCells} − ${blankCells} blank = ${populatedCells}` },
    { step: 4, name: 'Deduplicate symptoms within each row', input: populatedCells, output: ones, formula: 'set() per row (repeat symptom counted once)' },
    { step: 5, name: 'Deduplicate identical disease+pattern rows', input: rawRows, output: uniquePatterns, formula: `group by (disease, sorted symptoms) → ${deduplicationRatio}× reduction` },
    { step: 6, name: 'Binary feature encoding', input: uniquePatterns, output: `${uniquePatterns} × ${distinctSymptoms}`, formula: `matrix ${matrixCells} cells, ${ones} ones, ${(100 * ones / Math.max(1, matrixCells)).toFixed(1)}% dense` },
    { step: 7, name: 'Label-encode disease classes', input: uniquePatterns, output: diseases, formula: 'LabelEncoder → integer targets' },
    { step: 8, name: 'Stratified 80/20 holdout split', input: uniquePatterns, output: '80% / 20%', formula: 'train_test_split(stratify=y, random_state=42)' },
    { step: 9, name: 'Feature scaling', input: ones, output: 'not applied', formula: 'binary features → Random Forest needs none' },
  ];

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: 'ml-service/data/dataset.csv',
    raw_rows: rawRows,
    symptom_columns: symptomColumns.length,
    diseases,
    distinct_symptoms: distinctSymptoms,
    unique_patterns: uniquePatterns,
    deduplication_ratio: deduplicationRatio,
    cells: {
      total: rawCells,
      blank: blankCells,
      populated: populatedCells,
      blank_pct: Math.round((100 * blankCells / Math.max(1, rawCells)) * 10) / 10,
    },
    class_distribution: classDistribution,
    top_symptoms: topSymptoms,
    symptoms_per_case: symptomsPerCase,
    matrix: {
      rows: uniquePatterns,
      cols: distinctSymptoms,
      cells: matrixCells,
      ones,
      density: Math.round((100 * ones / Math.max(1, matrixCells)) * 10) / 10,
    },
    preprocessing,
  };
}
