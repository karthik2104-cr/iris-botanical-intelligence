export type MeasurementKey =
  | "sepal_length_cm"
  | "sepal_width_cm"
  | "petal_length_cm"
  | "petal_width_cm";

export interface FeatureInfo {
  key: MeasurementKey;
  column: string;
  label: string;
  unit: string;
  description: string;
}

export interface IrisRecord {
  sepal_length_cm: number;
  sepal_width_cm: number;
  petal_length_cm: number;
  petal_width_cm: number;
  species: string;
}

export interface ClassDistribution {
  species: string;
  count: number;
  proportion: number;
}

export interface DescriptiveStatistic {
  feature: string;
  column: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface FeatureProfile {
  feature: string;
  column: string;
  key: MeasurementKey;
  description: string;
  min: number;
  max: number;
  mean: number;
  std: number;
  class_means: Record<string, number>;
  between_class_range: number;
}

export interface ModelComparison {
  key: string;
  name: string;
  uses_scaling: boolean;
  hyperparameters: string;
  catalog_index: number;
  fit_seconds: number;
  selected: boolean;
  cv_macro_f1_mean: number;
  cv_macro_f1_std: number;
  cv_macro_f1_folds: number[];
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  cv_accuracy_folds: number[];
  cross_validation_seconds: number;
}

export interface ClassScore {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ClassificationReport {
  accuracy: number;
  macro_avg: ClassScore;
  weighted_avg: ClassScore;
  classes: Array<ClassScore & { name: string }>;
}

export interface FeatureImportanceRow {
  feature: string;
  column: string;
  importance: number;
  relative_importance: number;
  std?: number;
}

export interface PipelineStage {
  id: string;
  title: string;
  what: string;
  why: string;
  library: string;
}

export interface Analytics {
  project: string;
  seed: number;
  test_size: number;
  cv_folds: number;
  trained_at: string;
  versions: Record<string, string>;
  features: FeatureInfo[];
  class_names: string[];
  dataset: {
    rows: number;
    columns: number;
    feature_count: number;
    class_count: number;
    column_names: string[];
    source: string;
    missing_values: Record<string, number>;
    missing_total: number;
    duplicate_records: number;
    duplicate_note: string;
    descriptive_statistics: DescriptiveStatistic[];
    class_distribution: ClassDistribution[];
    correlation: { features: string[]; columns: string[]; matrix: number[][] };
    feature_profiles: FeatureProfile[];
    records: IrisRecord[];
  };
  split: {
    seed: number;
    test_size: number;
    stratified: boolean;
    train_count: number;
    test_count: number;
    train_class_counts: Record<string, number>;
    test_class_counts: Record<string, number>;
    training_class_centroids: Array<{
      species: string;
      count: number;
      means: Record<string, number>;
    }>;
  };
  preprocessing: {
    notes: string[];
    scaled_models: string[];
    unscaled_models: string[];
  };
  pipeline_stages: PipelineStage[];
  evaluation: {
    selected_model_key: string;
    selected_model_name: string;
    selected_model_uses_scaling: boolean;
    selected_model_hyperparameters: string;
    selection_rule: string;
    comparison: ModelComparison[];
    test_metrics: {
      accuracy: number;
      precision_macro: number;
      recall_macro: number;
      f1_macro: number;
      confusion_matrix: number[][];
      classification_report: ClassificationReport;
      inference_seconds: number;
      inference_per_sample_seconds: number;
      samples: number;
    };
    training_metrics: {
      accuracy: number;
      f1_macro: number;
      samples: number;
      note: string;
    };
    generalization_gap: { accuracy: number; f1_macro: number; note: string };
    confusion_matrix: number[][];
    class_names: string[];
    classification_report: ClassificationReport;
    feature_importance: {
      method: string;
      score_label: string;
      note: string;
      narrative: string;
      features: FeatureImportanceRow[];
    };
    timings: {
      selected_model_fit_seconds: number;
      selected_model_cross_validation_seconds: number;
      test_inference_seconds: number;
      test_inference_per_sample_seconds: number;
    };
  };
  limitations: string[];
}

export interface HealthStatus {
  status: string;
  model_available: boolean;
  model_name: string | null;
  version: string;
  message: string;
}

export interface ModelInfo {
  model_key: string;
  model_name: string;
  uses_scaling: boolean;
  hyperparameters: string;
  features: FeatureInfo[];
  class_names: string[];
  metrics: {
    accuracy: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
  };
  selection_rule: string;
  cv_macro_f1_mean: number;
  cv_accuracy_mean: number;
  seed: number;
  test_size: number;
  train_count: number;
  test_count: number;
  importance_method: string;
  trained_at: string;
  versions: Record<string, string>;
}

export interface BatchPrediction {
  count: number;
  predictions: Prediction[];
}

export interface Prediction {
  predicted_species: string;
  probabilities: Array<{ species: string; probability: number }>;
  highest_probability: number;
  summary: string;
  measurements: Record<MeasurementKey, number>;
  centroid_comparison: {
    nearest_species: string;
    distances: Array<{ species: string; distance: number }>;
    note: string;
  } | null;
}

export type Measurements = Record<MeasurementKey, number>;
