"""Tests for dataset loading, splitting, and the training pipeline."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ml.src.config import FEATURE_COLUMNS, SEED
from ml.src.data import load_iris_dataframe, split_features_target, split_train_test
from ml.src.models import build_models
from ml.src.evaluate import select_model
from ml.src.train import run_training


def test_dataset_shape_and_quality() -> None:
    frame = load_iris_dataframe()
    assert frame.shape == (150, 6)
    assert list(frame.columns[:4]) == FEATURE_COLUMNS
    assert int(frame[FEATURE_COLUMNS + ["target"]].isna().sum().sum()) == 0
    assert set(frame["species"]) == {"Iris setosa", "Iris versicolor", "Iris virginica"}
    assert frame["species"].value_counts().tolist() == [50, 50, 50]


def test_split_is_stratified_and_reproducible() -> None:
    frame = load_iris_dataframe()
    features, target = split_features_target(frame)
    first = split_train_test(features, target)
    second = split_train_test(features, target)
    for left, right in zip(first, second):
        np.testing.assert_array_equal(left, right)

    x_train, x_test, y_train, y_test = first
    assert len(x_train) == 120
    assert len(x_test) == 30
    assert sorted(pd.Series(y_train).value_counts().tolist()) == [40, 40, 40]
    assert sorted(pd.Series(y_test).value_counts().tolist()) == [10, 10, 10]

    shifted = split_train_test(features, target, seed=SEED + 1)
    assert not np.array_equal(x_train, shifted[0])


def test_scaler_is_fit_on_the_training_split_only() -> None:
    frame = load_iris_dataframe()
    features, target = split_features_target(frame)
    x_train, _, y_train, _ = split_train_test(features, target)
    model = next(spec.factory() for spec in build_models() if spec.key == "logistic_regression")
    model.fit(x_train, y_train)
    training_mean = x_train.mean(axis=0)
    full_mean = features.mean(axis=0)
    np.testing.assert_allclose(model.named_steps["scaler"].mean_, training_mean)
    assert not np.allclose(model.named_steps["scaler"].mean_, full_mean)


def test_training_selects_best_cross_validated_model_and_saves_artifacts(tmp_path) -> None:
    artifacts = tmp_path / "artifacts"
    reports = tmp_path / "reports"
    metadata = run_training(artifacts, reports)

    assert (artifacts / "model.joblib").exists()
    assert (artifacts / "metadata.json").exists()
    assert (reports / "evaluation_summary.md").exists()
    assert (reports / "figures" / "confusion_matrix.png").exists()
    assert len(metadata["evaluation"]["comparison"]) == 6
    assert metadata["dataset"]["rows"] == 150
    assert metadata["dataset"]["columns"] == 6
    assert metadata["dataset"]["missing_total"] == 0

    selected = [row for row in metadata["evaluation"]["comparison"] if row["selected"]]
    assert len(selected) == 1
    assert selected[0]["key"] == select_model(metadata["evaluation"]["comparison"])["key"]
    test_metrics = metadata["evaluation"]["test_metrics"]
    for score in ("accuracy", "precision_macro", "recall_macro", "f1_macro"):
        assert 0.0 <= test_metrics[score] <= 1.0
    assert len(metadata["evaluation"]["feature_importance"]["features"]) == 4
    importance_rows = metadata["evaluation"]["feature_importance"]["features"]
    relative = sum(item["relative_importance"] for item in importance_rows)
    if any(item["importance"] != 0 for item in importance_rows):
        assert relative == pytest.approx(1.0)
    else:
        assert relative == 0
