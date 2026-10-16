"""Request and response models for the classification API."""

from __future__ import annotations

import math

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

MAX_MEASUREMENT_CM = 30.0

FIELD_LABELS = {
    "sepal_length_cm": "Sepal length",
    "sepal_width_cm": "Sepal width",
    "petal_length_cm": "Petal length",
    "petal_width_cm": "Petal width",
}


class FlowerInput(BaseModel):
    """Four Iris measurements in centimeters."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "sepal_length_cm": 5.1,
                "sepal_width_cm": 3.5,
                "petal_length_cm": 1.4,
                "petal_width_cm": 0.2,
            }
        },
    )

    sepal_length_cm: float = Field(..., description="Sepal length in centimeters.")
    sepal_width_cm: float = Field(..., description="Sepal width in centimeters.")
    petal_length_cm: float = Field(..., description="Petal length in centimeters.")
    petal_width_cm: float = Field(..., description="Petal width in centimeters.")

    @field_validator(
        "sepal_length_cm",
        "sepal_width_cm",
        "petal_length_cm",
        "petal_width_cm",
    )
    @classmethod
    def validate_measurement(cls, value: float, info: ValidationInfo) -> float:
        label = FIELD_LABELS.get(info.field_name or "", "Measurement")
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{label} must be a finite number")
        number = float(value)
        if not math.isfinite(number):
            raise ValueError(f"{label} must be a finite number")
        if number <= 0 or number > MAX_MEASUREMENT_CM:
            raise ValueError(
                f"{label} must be greater than 0 and at most {MAX_MEASUREMENT_CM:g} centimeters"
            )
        return number


class BatchPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    samples: list[FlowerInput] = Field(..., min_length=1, max_length=100)


class ProbabilityScore(BaseModel):
    species: str
    probability: float


class CentroidDistance(BaseModel):
    species: str
    distance: float


class CentroidComparison(BaseModel):
    nearest_species: str
    distances: list[CentroidDistance]
    note: str


class PredictionResponse(BaseModel):
    predicted_species: str
    probabilities: list[ProbabilityScore]
    highest_probability: float
    summary: str
    measurements: dict[str, float]
    centroid_comparison: CentroidComparison | None = None


class BatchPredictionResponse(BaseModel):
    count: int
    predictions: list[PredictionResponse]


class HealthResponse(BaseModel):
    status: str
    model_available: bool
    model_name: str | None
    version: str
    message: str


class FeatureInfo(BaseModel):
    key: str
    column: str
    label: str
    unit: str
    description: str


class ScoreSummary(BaseModel):
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float


class ModelInfoResponse(BaseModel):
    model_key: str
    model_name: str
    uses_scaling: bool
    hyperparameters: str
    features: list[FeatureInfo]
    class_names: list[str]
    metrics: ScoreSummary
    selection_rule: str
    cv_macro_f1_mean: float
    cv_accuracy_mean: float
    seed: int
    test_size: float
    train_count: int
    test_count: int
    importance_method: str
    trained_at: str
    versions: dict[str, str]
