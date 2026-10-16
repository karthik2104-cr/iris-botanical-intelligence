"""Shape saved training metadata for the public API."""

from __future__ import annotations

from typing import Any

from backend.app.model_service import ModelService


class AnalyticsService:
    """Read-only view over the metadata produced by training."""

    def __init__(self, model_service: ModelService):
        self.model_service = model_service

    def analytics(self) -> dict[str, Any]:
        self.model_service.require()
        assert self.model_service.metadata is not None
        return self.model_service.metadata

    def model_info(self) -> dict[str, Any]:
        self.model_service.require()
        assert self.model_service.metadata is not None
        metadata = self.model_service.metadata
        evaluation = metadata["evaluation"]
        selected = next(row for row in evaluation["comparison"] if row["selected"])
        test_metrics = evaluation["test_metrics"]
        return {
            "model_key": evaluation["selected_model_key"],
            "model_name": evaluation["selected_model_name"],
            "uses_scaling": evaluation["selected_model_uses_scaling"],
            "hyperparameters": evaluation["selected_model_hyperparameters"],
            "features": metadata["features"],
            "class_names": metadata["class_names"],
            "metrics": {
                "accuracy": test_metrics["accuracy"],
                "precision_macro": test_metrics["precision_macro"],
                "recall_macro": test_metrics["recall_macro"],
                "f1_macro": test_metrics["f1_macro"],
            },
            "selection_rule": evaluation["selection_rule"],
            "cv_macro_f1_mean": selected["cv_macro_f1_mean"],
            "cv_accuracy_mean": selected["cv_accuracy_mean"],
            "seed": metadata["seed"],
            "test_size": metadata["test_size"],
            "train_count": metadata["split"]["train_count"],
            "test_count": metadata["split"]["test_count"],
            "importance_method": evaluation["feature_importance"]["method"],
            "trained_at": metadata["trained_at"],
            "versions": metadata["versions"],
        }
