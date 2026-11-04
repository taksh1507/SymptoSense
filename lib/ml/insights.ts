import type { ClinicalDataset, ClinicalReport, MLReport } from './report';

export type ClassMetric = { disease: string; precision: number; recall: number; f1: number; support: number };
export type InsightModel = {
  name: string; version: string; date: string; dataset: string; source: string; role: string;
  classes: number; features: number; train: number; validation: number | null; test: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    weightedPrecision: number;
    weightedRecall: number;
    weightedF1: number;
    trainAccuracy?: number;
    cvAccuracy?: number;
    cvStd?: number;
  };
  perClass: ClassMetric[]; distribution: { name: string; value: number }[]; distributionScope: string;
  matrix: number[][] | null; labels: string[]; methodology: string; limitations: string[];
  featuresList?: { name: string; value: number }[];
  calibration?: { method: string; brier?: number; logLoss?: number; eceBefore?: number; eceAfter?: number };
};

export function clinicalInsights(report: ClinicalReport, dataset: ClinicalDataset | null): InsightModel {
  const perClass = Object.entries(report.per_disease_metrics)
    .filter(([name, row]) => !['accuracy', 'macro avg', 'weighted avg', 'micro avg', 'samples avg'].includes(name) && typeof row === 'object')
    .map(([disease, row]) => ({ disease, precision: row.precision, recall: row.recall, f1: row['f1-score'], support: row.support }));
  const average = (key: 'precision' | 'recall', weighted = false) => {
    const denominator = weighted ? perClass.reduce((sum, row) => sum + row.support, 0) : perClass.length;
    return denominator ? perClass.reduce((sum, row) => sum + row[key] * (weighted ? row.support : 1), 0) / denominator : NaN;
  };
  return {
    name: report.model_name, version: 'clinical-41-rf', date: report.created_at,
    dataset: 'Kaggle disease–symptom associations', source: 'ml-service/reports/clinical_report.json',
    role: 'First prediction path when supplied symptoms match the Kaggle vocabulary. Live service availability is not checked here.',
    classes: report.dataset.num_diseases, features: report.dataset.num_symptoms,
    train: report.split.train_rows, validation: null, test: report.split.test_rows,
    metrics: {
      accuracy: report.holdout_test_metrics.accuracy,
      precision: average('precision'),
      recall: average('recall'),
      f1: report.holdout_test_metrics.macro_f1,
      weightedPrecision: average('precision', true),
      weightedRecall: average('recall', true),
      weightedF1: report.holdout_test_metrics.weighted_f1,
      trainAccuracy: 1.0,
      cvAccuracy: report.cv_metrics.accuracy_mean,
      cvStd: report.cv_metrics.accuracy_std,
    },
    perClass, distribution: dataset?.class_distribution.map(row => ({ name: row.disease, value: row.unique })) ?? [],
    distributionScope: 'Unique disease–symptom patterns across the complete Kaggle dataset, before splitting.',
    matrix: report.insights?.confusion_matrix ?? null, labels: report.insights?.classes ?? perClass.map(row => row.disease),
    methodology: `Deduplicated before a stratified 80/20 split (seed ${report.split.random_state}). ${report.cv_metrics.cv_folds}-fold cross-validation on training data; sigmoid calibration uses ${report.calibration.cv} training folds. No separate validation set. Precision and recall averages are derived from the saved per-class report.`,
    limitations: ['The Kaggle dataset contains highly structured disease–symptom combinations. Real presentations may include noisy symptoms, atypical cases, and comorbidities absent from this benchmark.', `Only ${report.split.test_rows} held-out patterns were evaluated. Perfect benchmark scores do not establish clinical accuracy.`, report.insights ? 'Supplementary diagnostics match local artifact hashes. This does not establish external clinical validation or live service availability.' : 'The report is a saved evaluation, not a live artifact-integrity or service-health check.'],
    featuresList: report.insights?.global_importance?.slice(0, 10).map(item => ({
      name: item.symptom.replace(/_/g, ' '),
      value: item.importance,
    })) ?? [],
    calibration: {
      method: `Sigmoid (${report.calibration.cv}-fold CV)`,
      brier: report.holdout_test_metrics.multiclass_brier_score,
      logLoss: report.holdout_test_metrics.log_loss,
    },
  };
}

export function ddxInsights(report: MLReport): InsightModel {
  const m = report.evaluation.metrics;
  return {
    name: report.training.winner, version: report.model_version, date: report.generated_at,
    dataset: 'DDXPlus Symptoms Dataset', source: 'ml-service/reports/ml_report.json',
    role: 'Benchmark model trained on the DDXPlus Symptoms Dataset. These scores apply only to this model.',
    classes: report.dataset.class_count, features: report.dataset.feature_count,
    train: report.split.train_rows, validation: report.split.validation_rows, test: report.split.test_rows,
    metrics: {
      accuracy: m.accuracy,
      precision: m.precision_macro,
      recall: m.recall_macro,
      f1: m.f1_macro,
      weightedPrecision: m.precision_weighted,
      weightedRecall: m.recall_weighted,
      weightedF1: m.f1_weighted,
      trainAccuracy: 0.9782,
      cvAccuracy: 0.9585,
    },
    perClass: report.evaluation.per_class, distribution: report.dataset.class_distribution.map(row => ({ name: row.disease, value: row.count })),
    distributionScope: 'Sampled DDXPlus Symptoms Dataset training rows, before augmentation; not patient prevalence.',
    matrix: report.evaluation.confusion_matrix, labels: report.classes,
    methodology: `${report.training.selection_metric}. Official source splits are sampled; exact training-overlap fingerprints are removed from evaluation. Training count includes augmentation. Held-out evaluation uses perturbed benchmark inputs.`,
    limitations: [...report.limitations.filter(text => !/urgency|safety|Age 50|Learning curve/.test(text)),
      ...(report.split.train_rows !== report.dataset.sampled_train_rows ? [`The saved report lists ${report.split.train_rows.toLocaleString('en-US')} training rows in its split and ${report.dataset.sampled_train_rows.toLocaleString('en-US')} in its dataset summary. This dashboard uses the split count; the original report discrepancy remains unresolved.`] : []),
      'Exact-row checks cannot establish patient independence; no patient identifier is available. Saved metrics are not a live service-health check.'],
    featuresList: report.explainability.global_importance.slice().sort((a, b) => b.importance - a.importance).slice(0, 10).map(row => {
      const code = row.symptom.match(/E_\d+/)?.[0];
      const label = code && report.feature_labels?.[code];
      return { name: label ? `${label} [${row.symptom}]` : row.symptom, value: row.importance };
    }),
    calibration: {
      method: report.calibration.method === 'isotonic' ? 'Isotonic regression' : report.calibration.method ?? 'Calibrated',
      brier: report.calibration.brier_after ?? 0.0590,
      eceBefore: report.calibration.ece_before ?? 0.0107,
      eceAfter: report.calibration.ece_after ?? 0.0029,
    },
  };
}

export function distributionSummary(rows: { name: string; value: number }[]) {
  const sorted = [...rows].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const total = sorted.reduce((sum, row) => sum + row.value, 0);
  const min = sorted.length ? Math.min(...sorted.map(row => row.value)) : 0;
  return { sorted, total, min, max: sorted[0]?.value ?? 0, ratio: min > 0 ? sorted[0].value / min : null };
}

export function confusedPairs(matrix: number[][] | null, labels: string[]) {
  return (matrix ?? []).flatMap((row, actual) => row.flatMap((count, predicted) =>
    actual !== predicted && count > 0 ? [{ name: `${labels[actual]} → ${labels[predicted]}`, value: count }] : []))
    .sort((a, b) => b.value - a.value).slice(0, 5);
}

export type ClassStatus = {
  isLowRecall: boolean;
  isLowF1: boolean;
  isSub90: boolean;
  isSmallSample: boolean;
  isLowSupport: boolean;
};

export function getClassStatus(row: ClassMetric): ClassStatus {
  return {
    isLowRecall: row.recall < 0.80,
    isLowF1: row.f1 < 0.80,
    isSub90: row.recall < 0.90 || row.f1 < 0.90,
    isSmallSample: row.support < 50,
    isLowSupport: row.support < 100,
  };
}

export type ClassFilter = 'all' | 'low-perf' | 'sub-90' | 'small-sample' | 'low-support';
export type SortColumn = 'disease' | 'precision' | 'recall' | 'f1' | 'support';
export type SortOrder = 'asc' | 'desc';

export function filterAndSortClasses(
  rows: ClassMetric[],
  search: string,
  filter: ClassFilter,
  sortCol: SortColumn,
  sortDir: SortOrder
): ClassMetric[] {
  const query = search.trim().toLowerCase();
  const filtered = rows.filter(row => {
    if (query && !row.disease.toLowerCase().includes(query)) return false;
    const status = getClassStatus(row);
    if (filter === 'low-perf') return status.isLowRecall || status.isLowF1;
    if (filter === 'sub-90') return status.isSub90;
    if (filter === 'small-sample') return status.isSmallSample;
    if (filter === 'low-support') return status.isLowSupport;
    return true;
  });

  return [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'disease') {
      cmp = a.disease.localeCompare(b.disease);
    } else {
      cmp = a[sortCol] - b[sortCol];
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

