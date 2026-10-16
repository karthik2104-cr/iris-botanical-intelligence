"""Load the saved classifier once and serve predictions."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np

logger = logging.getLogger("iris.model")


class ModelNotAvailableError(RuntimeError):
    """Raised when a request needs a model that did not load."""


def build_summary(species: str, probabilities: list[dict[str, Any]], model_name: str) -> str:
    """Describe a prediction without inventing a biological reason."""
    rendered = [f"{item['species']} {item['probability'] * 100:.1f}%" for item in probabilities]
    if len(rendered) > 1:
        probability_text = ", ".join(rendered[:-1]) + f", and {rendered[-1]}"
    else:
        probability_text = rendered[0] if rendered else "unavailable"
    return (
        f"The selected {model_name} model classifies this flower as {species}. "
        f"Estimated probabilities: {probability_text}. "
        "These scores rank the three species for the measurements you entered. "
        "They are not a botanical certainty, and they do not identify a biological cause."
    )


class ModelService:
    """In-memory model and metadata loaded at application startup."""

    def __init__(self, artifacts_dir: Path | str):
        self.artifacts_dir = Path(artifacts_dir)
        self.model: Any = None
        self.metadata: dict[str, Any] | None = None
        self.error: str | None = None

    @property
    def ready(self) -> bool:
        return self.model is not None and self.metadata is not None

    @property
    def model_name(self) -> str | None:
        if not self.metadata:
            return None
        return str(self.metadata["evaluation"]["selected_model_name"])

    def load(self) -> None:
        model_path = self.artifacts_dir / "model.joblib"
        metadata_path = self.artifacts_dir / "metadata.json"
        try:
            missing = [str(path) for path in (model_path, metadata_path) if not path.exists()]
            if missing:
                raise FileNotFoundError("Missing artifact files: " + ", ".join(missing))
            model = joblib.load(model_path)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            required = ["evaluation", "dataset", "features", "class_names", "split"]
            absent = [key for key in required if key not in metadata]
            if absent:
                raise ValueError("Metadata is missing keys: " + ", ".join(absent))
            self.model = model
            self.metadata = metadata
            self.error = None
            logger.info("Loaded %s from %s", self.model_name, model_path)
        except Exception as exc:
            self.model = None
            self.metadata = None
            self.error = str(exc)
            logger.warning("Model artifacts could not be loaded: %s", exc)

    def require(self) -> None:
        if not self.ready:
            detail = self.error or "The trained model is not available. Run the training script and restart the API."
            raise ModelNotAvailableError(detail)

    def predict_one(self, measurements: dict[str, float]) -> dict[str, Any]:
        self.require()
        assert self.model is not None
        assert self.metadata is not None
        features = self.metadata["features"]
        keys = [feature["key"] for feature in features]
        columns = [feature["column"] for feature in features]
        row = np.array([[float(measurements[key]) for key in keys]], dtype=float)
        predicted_index = int(self.model.predict(row)[0])
        class_names = [str(name) for name in self.metadata["class_names"]]
        predicted_species = class_names[predicted_index]

        probabilities = self._probabilities(row, class_names)
        highest = max(item["probability"] for item in probabilities)
        result = {
            "predicted_species": predicted_species,
            "probabilities": probabilities,
            "highest_probability": float(highest),
            "summary": build_summary(predicted_species, probabilities, self.model_name or "model"),
            "measurements": {key: float(measurements[key]) for key in keys},
            "centroid_comparison": self._centroid_comparison(row[0], columns),
        }
        logger.info("Predicted %s with probability %.3f", predicted_species, highest)
        return result

    def predict_batch(self, samples: list[dict[str, float]]) -> dict[str, Any]:
        predictions = [self.predict_one(sample) for sample in samples]
        return {"count": len(predictions), "predictions": predictions}

    def _probabilities(self, row: np.ndarray, class_names: list[str]) -> list[dict[str, float | str]]:
        assert self.model is not None
        if hasattr(self.model, "predict_proba"):
            scores = self.model.predict_proba(row)[0]
            by_index = {int(label): float(score) for label, score in zip(self.model.classes_, scores)}
            return [
                {"species": name, "probability": by_index.get(index, 0.0)}
                for index, name in enumerate(class_names)
            ]
        predicted = int(self.model.predict(row)[0])
        return [
            {"species": name, "probability": 1.0 if index == predicted else 0.0}
            for index, name in enumerate(class_names)
        ]

    def _centroid_comparison(self, row: np.ndarray, columns: list[str]) -> dict[str, Any] | None:
        assert self.metadata is not None
        centroids = self.metadata.get("split", {}).get("training_class_centroids", [])
        if not centroids:
            return None
        distances = []
        for centroid in centroids:
            means = np.array([float(centroid["means"][column]) for column in columns], dtype=float)
            distances.append(
                {
                    "species": centroid["species"],
                    "distance": float(np.linalg.norm(row - means)),
                }
            )
        nearest = min(distances, key=lambda item: item["distance"])
        return {
            "nearest_species": nearest["species"],
            "distances": distances,
            "note": (
                "This compares the entered measurements with the average of each species in the training set, "
                "using Euclidean distance in centimeters. It is a descriptive reference, not the model's "
                "internal reasoning, and it is not a causal explanation."
            ),
        }
