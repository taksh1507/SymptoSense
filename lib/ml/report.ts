/** Training report shape; chart values are supplied only by /api/ml/report. */
type ExistingReport = typeof import('../../ml-service/reports/ml_report.json');
export type MLReport = ExistingReport & {
  baselines?: { majority_class: Record<string, unknown>; nearest_neighbour: Record<string, unknown>; interpretation: string };
  noise_robustness?: { variant?: string; percent_wrong_evidence: number; accuracy: number; top3_accuracy: number; augmented_training_rows?: number }[];
  severity_table?: { disease: string; severity: number; urgency: string }[];
  calibration: ExistingReport['calibration'] & { method?: string };
  dataset: ExistingReport['dataset'] & { sample_sizes?: Record<string, { rows_before_sampling: number; rows_after_sampling: number }>; split_overlap_fingerprints?: Record<string, number>; input_sha256?: Record<string, string> };
};
