import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ClinicalDiagnostics } from './report';

const inputs = [
  'data/dataset.csv', 'artifacts/clinical/clinical_model.joblib',
  'artifacts/clinical/clinical_encoder.joblib', 'artifacts/clinical/symptom_list.json',
  'reports/clinical_report.json',
];

/** Fail closed when diagnostics no longer match the deployed local artifacts. */
export function loadClinicalDiagnostics(root = path.join(process.cwd(), 'ml-service')): ClinicalDiagnostics | null {
  try {
    const diagnostics = JSON.parse(fs.readFileSync(path.join(root, 'reports/clinical_insights.json'), 'utf8')) as ClinicalDiagnostics;
    if (diagnostics.schema_version !== 1 || !Array.isArray(diagnostics.global_importance) || !Array.isArray(diagnostics.classes)) return null;
    for (const file of inputs) {
      const digest = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
      if (diagnostics.input_sha256[file] !== digest) return null;
    }
    if (diagnostics.confusion_matrix.length !== diagnostics.classes.length || diagnostics.confusion_matrix.some(row => row.length !== diagnostics.classes.length || row.some(value => !Number.isInteger(value) || value < 0))) return null;
    if (diagnostics.confusion_matrix.flat().reduce((sum, value) => sum + value, 0) !== diagnostics.test_rows) return null;
    return diagnostics;
  } catch {
    return null;
  }
}
