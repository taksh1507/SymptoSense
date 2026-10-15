/** Training report shape; chart values are supplied only by /api/ml/report. */
type ExistingReport = typeof import('../../ml-service/reports/ml_report.json');
export type MLReport = ExistingReport & {
  baselines?: { majority_class: Record<string, unknown>; nearest_neighbour: Record<string, unknown>; interpretation: string };
  noise_robustness?: { variant?: string; percent_wrong_evidence: number; accuracy: number; top3_accuracy: number; augmented_training_rows?: number }[];
  severity_table?: { disease: string; severity: number; urgency: string }[];
  clean_synthetic?: {
    metrics: {
      accuracy: number;
      precision_macro: number;
      recall_macro: number;
      f1_macro: number;
      precision_weighted?: number;
      recall_weighted?: number;
      f1_weighted?: number;
      top_3_accuracy: number;
      top_5_accuracy: number;
    };
    topk: { top_3: number; top_5: number };
    test_rows: number;
  };
  realistic_input?: {
    seeds: number;
    accuracy_mean: number;
    accuracy_std: number;
    f1_macro_mean: number;
    f1_macro_std: number;
    top3_mean: number;
    top3_std: number;
    top5_mean: number;
    top5_std: number;
  };
  differential_metrics?: {
    gtpa_at_1: number;
    gtpa_at_3: number;
    gtpa_at_5: number;
    top1_in_gt_differential_rate: number | null;
    differential_evaluated_cases: number;
  };
  selective_prediction?: {
    operating_point: {
      threshold: number;
      margin: number;
      expected_precision: number;
      expected_coverage: number;
      min_precision_target?: number;
    };
    wrong_and_confident_at_80?: {
      proportion_of_all: number;
      error_in_high_confidence: number;
    };
  };
  data_hygiene?: Record<string, unknown>;
  calibration: ExistingReport['calibration'] & {
    method?: string;
    ece_before?: number;
    ece_after?: number;
    reliability_curve_before?: { bin_index: number; confidence_range: [number, number]; mean_confidence: number; observed_accuracy: number; sample_count: number }[];
    reliability_curve_after?: { bin_index: number; confidence_range: [number, number]; mean_confidence: number; observed_accuracy: number; sample_count: number }[];
  };
  dataset: ExistingReport['dataset'] & { sample_sizes?: Record<string, { rows_before_sampling: number; rows_after_sampling: number }>; split_overlap_fingerprints?: Record<string, number>; input_sha256?: Record<string, string> };
};
