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

export interface ClinicalClassRow { disease: string; raw: number; unique: number; }
export interface ClinicalSymptomRow { symptom: string; unique_patterns: number; raw_cells: number; }
export interface ClinicalCaseRow { count: number; cases: number; }
export interface ClinicalPreprocessStep { step: number; name: string; input: number | string | null; output: number | string; formula: string; }

export interface ClinicalDataset {
  schema_version: number;
  generated_at: string;
  source: string;
  raw_rows: number;
  symptom_columns: number;
  diseases: number;
  distinct_symptoms: number;
  unique_patterns: number;
  deduplication_ratio: number;
  cells: { total: number; blank: number; populated: number; blank_pct: number };
  class_distribution: ClinicalClassRow[];
  top_symptoms: ClinicalSymptomRow[];
  symptoms_per_case: ClinicalCaseRow[];
  matrix: { rows: number; cols: number; cells: number; ones: number; density: number };
  preprocessing: ClinicalPreprocessStep[];
}

export interface SymcatUrgencyRow { urgency: string; conditions: number; }
export interface SymcatSymptomRow { symptom: string; conditions: number; avg_probability: number; }
export interface SymcatBucketRow { bucket: string; conditions: number; }

export interface SymcatDataset {
  schema_version: number;
  generated_at: string;
  source: string;
  version: string;
  total_conditions: number;
  total_symptoms: number;
  symptom_links: number;
  avg_symptoms_per_condition: number;
  with_description: number;
  with_precautions: number;
  urgency_distribution: SymcatUrgencyRow[];
  top_symptoms: SymcatSymptomRow[];
  symptoms_per_condition: SymcatBucketRow[];
  preprocessing: ClinicalPreprocessStep[];
}

export interface ClinicalReport {
  schema_version: number;
  model_name: string;
  created_at: string;
  dataset: {
    name: string;
    raw_rows: number;
    unique_rows: number;
    num_diseases: number;
    num_symptoms: number;
    deduplication_ratio: number;
    data_hygiene: string;
  };
  split: {
    train_rows: number;
    test_rows: number;
    test_size: number;
    stratified: boolean;
    random_state: number;
  };
  cv_metrics: {
    cv_folds: number;
    accuracy_mean: number;
    accuracy_std: number;
  };
  holdout_test_metrics: {
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    top3_accuracy: number;
    top5_accuracy: number;
    multiclass_brier_score: number;
    log_loss: number;
  };
  per_disease_metrics: Record<string, { precision: number; recall: number; 'f1-score': number; support: number }>;
  calibration: {
    method: string;
    cv: number;
  };
  disclaimer: string;
}

