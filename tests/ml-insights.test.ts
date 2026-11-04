import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clinicalInsights, ddxInsights, distributionSummary, confusedPairs, getClassStatus, filterAndSortClasses } from '../lib/ml/insights';
import { analyzeClinicalDataset } from '../lib/ml/clinicalDataset';
import type { ClinicalReport, MLReport } from '../lib/ml/report';
import { loadClinicalDiagnostics } from '../lib/ml/clinicalDiagnostics';
import os from 'node:os';
import path from 'node:path';

const clinical = JSON.parse(fs.readFileSync('ml-service/reports/clinical_report.json', 'utf8')) as ClinicalReport;
const ddx = JSON.parse(fs.readFileSync('ml-service/reports/ml_report.json', 'utf8')) as MLReport;

test('Kaggle metrics exclude aggregate rows and agree with saved averages', () => {
  const result = clinicalInsights(clinical, null);
  assert.equal(result.perClass.length, clinical.dataset.num_diseases);
  assert.equal(result.perClass.reduce((sum, row) => sum + row.support, 0), result.test);
  assert.equal(result.metrics.precision, clinical.per_disease_metrics['macro avg'].precision);
  assert.equal(result.metrics.weightedRecall, clinical.per_disease_metrics['weighted avg'].recall);
  assert.equal(result.matrix, null);
  assert.equal(result.validation, null);
  assert.deepEqual(result.distribution, []);
});

test('macro and weighted averages respect class support without including report summary rows', () => {
  const report = { ...clinical, per_disease_metrics: {
    Alpha: { precision: 0.5, recall: 0.2, 'f1-score': 0.3, support: 9 },
    Beta: { precision: 1, recall: 0.8, 'f1-score': 0.9, support: 1 },
    'macro avg': { precision: 0.75, recall: 0.5, 'f1-score': 0.6, support: 10 },
  } };
  const result = clinicalInsights(report, null);
  assert.equal(result.metrics.precision, 0.75);
  assert.equal(result.metrics.weightedPrecision, 0.55);
  assert.equal(result.metrics.weightedRecall, 0.26);
});

test('DDX confusion counts, class support, and held-out test scope agree', () => {
  const result = ddxInsights(ddx);
  assert.equal(result.matrix?.flat().reduce((sum, count) => sum + count, 0), result.test);
  assert.equal(result.labels.length, result.matrix?.length);
  result.matrix?.forEach((row, index) => {
    assert.equal(row.length, result.labels.length);
    assert.equal(result.perClass[index].disease, result.labels[index]);
    assert.equal(row.reduce((sum, count) => sum + count, 0), result.perClass[index].support);
  });
  assert.equal(result.metrics.accuracy, ddx.evaluation.metrics.accuracy);
});

test('per-class status correctly identifies low recall and small sample sizes', () => {
  const result = ddxInsights(ddx);
  assert.equal(result.perClass.length, 49);
  
  const acuteRhino = result.perClass.find(r => r.disease === 'Acute rhinosinusitis')!;
  assert.ok(acuteRhino);
  const acuteStatus = getClassStatus(acuteRhino);
  assert.equal(acuteStatus.isLowRecall, true);
  assert.equal(acuteStatus.isLowF1, true);

  const unstableAngina = result.perClass.find(r => r.disease === 'Unstable angina')!;
  assert.ok(unstableAngina);
  const unstableStatus = getClassStatus(unstableAngina);
  assert.equal(unstableStatus.isLowRecall, true);
  assert.equal(unstableStatus.isLowF1, true);

  const bronchiolitis = result.perClass.find(r => r.disease === 'Bronchiolitis')!;
  assert.ok(bronchiolitis);
  const bronchiolitisStatus = getClassStatus(bronchiolitis);
  assert.equal(bronchiolitisStatus.isSmallSample, true);
  assert.equal(bronchiolitis.support, 9);

  const ebola = result.perClass.find(r => r.disease === 'Ebola')!;
  assert.ok(ebola);
  const ebolaStatus = getClassStatus(ebola);
  assert.equal(ebolaStatus.isSmallSample, true);
  assert.equal(ebola.support, 19);

  // Test sorting by f1 ascending
  const sortedF1 = filterAndSortClasses(result.perClass, '', 'all', 'f1', 'asc');
  assert.equal(sortedF1[0].disease, 'Acute rhinosinusitis');
  assert.equal(sortedF1[1].disease, 'Unstable angina');

  // Test filtering low performance
  const lowPerf = filterAndSortClasses(result.perClass, '', 'low-perf', 'f1', 'asc');
  assert.ok(lowPerf.some(r => r.disease === 'Acute rhinosinusitis'));
  assert.ok(lowPerf.some(r => r.disease === 'Unstable angina'));
  assert.ok(lowPerf.some(r => r.disease === 'Stable angina'));

  // Test filtering small samples
  const smallSamples = filterAndSortClasses(result.perClass, '', 'small-sample', 'support', 'asc');
  assert.deepEqual(smallSamples.map(r => r.disease), ['Bronchiolitis', 'Ebola']);
});

test('confusions exclude diagonal counts and preserve actual-to-predicted direction', () => {
  assert.deepEqual(confusedPairs([[99, 4], [2, 50]], ['A', 'B']), [{ name: 'A → B', value: 4 }, { name: 'B → A', value: 2 }]);
  assert.deepEqual(confusedPairs(null, []), []);
});

test('Kaggle distribution counts genuine deduplicated patterns, not assessments', () => {
  const dataset = analyzeClinicalDataset('ml-service/data/dataset.csv');
  const summary = distributionSummary(clinicalInsights(clinical, dataset).distribution);
  assert.equal(summary.total, clinical.dataset.unique_rows);
  assert.equal(summary.sorted.length, clinical.dataset.num_diseases);
  assert.equal(distributionSummary([]).ratio, null);
  assert.equal(distributionSummary([{ name: 'A', value: 0 }, { name: 'B', value: 2 }]).ratio, null);
});

test('Kaggle supplementary diagnostics agree with the saved model and holdout', () => {
  const insights = loadClinicalDiagnostics();
  assert.ok(insights);
  const model = clinicalInsights({ ...clinical, insights }, null);
  assert.equal(model.matrix?.flat().reduce((sum, count) => sum + count, 0), model.test);
  assert.deepEqual(insights.classes, model.perClass.map(row => row.disease));
  assert.equal(insights.global_importance.length, clinical.dataset.num_symptoms);
  assert.ok(Math.abs(insights.global_importance.reduce((sum, row) => sum + row.importance, 0) - 1) < 1e-8);
});

test('missing or stale artifact inputs suppress supplementary diagnostics', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'symptosense-insights-'));
  try {
    fs.mkdirSync(path.join(temp, 'reports'));
    fs.copyFileSync('ml-service/reports/clinical_insights.json', path.join(temp, 'reports/clinical_insights.json'));
    assert.equal(loadClinicalDiagnostics(temp), null);
    fs.mkdirSync(path.join(temp, 'data'));
    fs.writeFileSync(path.join(temp, 'data/dataset.csv'), 'changed dataset');
    assert.equal(loadClinicalDiagnostics(temp), null);
  } finally {
    fs.rmSync(temp, { recursive: true });
  }
});

test('dual model calibration and generalization report contract', () => {
  assert.ok(fs.existsSync('ml-service/reports/generalization_report.json'));
  const genReport = JSON.parse(fs.readFileSync('ml-service/reports/generalization_report.json', 'utf8'));
  assert.equal(genReport.schema_version, 1);
  assert.equal(genReport.dataset_audit.independent_dataset_available, false);
  assert.ok(genReport.dataset_audit.statement.includes('Independent clinical evaluation'));
  assert.equal(genReport.calibration_verification.random_forest.method, 'sigmoid');
  assert.equal(genReport.calibration_verification.xgboost.method, 'isotonic');
  assert.ok(genReport.scenario_evaluations.length >= 8);

  const ambiguousCase = genReport.scenario_evaluations.find((s: { name: string }) => s.name.includes('Stomach pain, cough, fever'));
  assert.ok(ambiguousCase);
  assert.equal(ambiguousCase.uncertain, true);
  assert.equal(ambiguousCase.status, 'ABSTAIN/UNCERTAIN');

  const rfModel = clinicalInsights(clinical, null);
  assert.equal(rfModel.metrics.trainAccuracy, 1.0);
  assert.equal(rfModel.calibration?.method, 'Sigmoid (3-fold CV)');
});

test('ML Insights dashboard displays only DDXPlus XGBoost and removes legacy Random Forest', () => {
  const pageSrc = fs.readFileSync('app/dashboard/ml-insights/page.tsx', 'utf8');

  // 1. Dashboard title and architecture
  assert.ok(pageSrc.includes('ML Insights — Disease Prediction Model'));
  assert.ok(pageSrc.includes('DISEASE PREDICTION ARCHITECTURE'));

  // 2. Random Forest UI and metrics are NOT visible in the dashboard
  assert.equal(pageSrc.includes('Random Forest — Symptom Dataset'), false);
  assert.equal(pageSrc.includes('clinical-41-rf'), false);
  assert.equal(pageSrc.includes('Original Structured Benchmark'), false);
  assert.equal(pageSrc.includes('Ambiguous Case Deferral'), false);
  assert.equal(pageSrc.includes('481/482'), false);
  assert.equal(pageSrc.includes('305/305'), false);
  assert.equal(pageSrc.includes('Candidate model experimentation'), false);
  assert.equal(pageSrc.includes('Kaggle 41-Disease'), false);
  assert.equal(pageSrc.includes('Platt scaling'), false);
  assert.equal(pageSrc.includes('selectedModel'), false);

  // 3. DDXPlus XGBoost data and metrics remain visible and functional
  assert.ok(pageSrc.includes('DDXPlus'));
  assert.ok(pageSrc.includes('XGBoost'));
  assert.ok(pageSrc.includes('95.64%'));
  assert.ok(pageSrc.includes('19,547'));
  assert.ok(pageSrc.includes('Isotonic regression'));
  assert.ok(pageSrc.includes('TreeSHAP'));

  // 4. All four dashboard sections exist
  assert.ok(pageSrc.includes("'Overview'"));
  assert.ok(pageSrc.includes("'Model Performance'"));
  assert.ok(pageSrc.includes("'Explainability'"));
  assert.ok(pageSrc.includes("'Dataset Insights'"));

  // 5. Evaluation limitations and disclaimers are preserved
  assert.ok(pageSrc.includes('Independent clinical evaluation has not been performed'));
  assert.ok(pageSrc.includes('Evaluation Type: Original Benchmark'));
  assert.ok(pageSrc.includes('Evaluation Type: Synthetic Stress Test'));
  assert.ok(pageSrc.includes('Evaluation Type: Independent External Evaluation'));

  // 6. Production model artifacts and 980-feature contract remain protected and unchanged
  assert.ok(fs.existsSync('ml-service/artifacts/clinical/clinical_model.joblib'));
  assert.ok(fs.existsSync('ml-service/artifacts/calibrated_model.joblib'));
  assert.ok(fs.existsSync('ml-service/artifacts/feature_columns.json'));
  const featCols = JSON.parse(fs.readFileSync('ml-service/artifacts/feature_columns.json', 'utf8'));
  assert.equal(featCols.length, 980);
});
