"""Classify one flower with the saved model."""

from __future__ import annotations

import argparse
import json

from backend.app.model_service import ModelService
from ml.src.config import ARTIFACTS_DIR, FEATURE_KEYS


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify one Iris flower with the saved model.")
    parser.add_argument("--sepal-length", type=float, required=True)
    parser.add_argument("--sepal-width", type=float, required=True)
    parser.add_argument("--petal-length", type=float, required=True)
    parser.add_argument("--petal-width", type=float, required=True)
    parser.add_argument("--artifacts-dir", type=str, default=str(ARTIFACTS_DIR))
    args = parser.parse_args()

    service = ModelService(args.artifacts_dir)
    service.load()
    if not service.ready:
        raise SystemExit(service.error or "The trained model is not available. Run python -m ml.src.train.")

    result = service.predict_one(
        {
            "sepal_length_cm": args.sepal_length,
            "sepal_width_cm": args.sepal_width,
            "petal_length_cm": args.petal_length,
            "petal_width_cm": args.petal_width,
        }
    )
    if list(result["measurements"]) != FEATURE_KEYS:
        raise SystemExit("Prediction measurements were not returned in feature order.")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
