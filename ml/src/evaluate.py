"""Metrics, model selection, and feature-importance helpers."""

from __future__ import annotations

import time
from typing import Any

import numpy as np
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate

from ml.src.config import CV_FOLDS, FEATURES, SEED


def _score_block(precision: float, recall: float, f1: float, support: int) -> dict[str, float | int]:
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "support": support,
    }


def classification_scores(
    model: Any,
    features: np.ndarray,
    target: np.ndarray,
    class_names: list[str],
) -> dict[str, Any]:
    """Score a fitted model and time a single predict call."""
    started = time.perf_counter()
    predictions = model.predict(features)
    inference_seconds = time.perf_counter() - started
    labels = list(range(len(class_names)))
    report = classification_report(
        target,
        predictions,
        labels=labels,
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    per_class = []
    for name in class_names:
        row = report[name]
        per_class.append(
            {
                "name": name,
                "precision": float(row["precision"]),
                "recall": float(row["recall"]),
                "f1": float(row["f1-score"]),
                "support": int(row["support"]),
            }
        )
    matrix = confusion_matrix(target, predictions, labels=labels)
    return {
        "accuracy": float(accuracy_score(target, predictions)),
        "precision_macro": float(
            precision_score(target, predictions, average="macro", labels=labels, zero_division=0)
        ),
        "recall_macro": float(
            recall_score(target, predictions, average="macro", labels=labels, zero_division=0)
        ),
        "f1_macro": float(f1_score(target, predictions, average="macro", labels=labels, zero_division=0)),
        "confusion_matrix": matrix.astype(int).tolist(),
        "classification_report": {
            "accuracy": float(report["accuracy"]),
            "macro_avg": _score_block(
                float(report["macro avg"]["precision"]),
                float(report["macro avg"]["recall"]),
                float(report["macro avg"]["f1-score"]),
                int(report["macro avg"]["support"]),
            ),
            "weighted_avg": _score_block(
                float(report["weighted avg"]["precision"]),
                float(report["weighted avg"]["recall"]),
                float(report["weighted avg"]["f1-score"]),
                int(report["weighted avg"]["support"]),
            ),
            "classes": per_class,
        },
        "inference_seconds": float(inference_seconds),
        "inference_per_sample_seconds": float(inference_seconds / max(len(target), 1)),
        "samples": int(len(target)),
    }


def cross_validate_model(estimator: Any, features: np.ndarray, target: np.ndarray) -> dict[str, Any]:
    """Compare models with stratified training-set folds only."""
    splitter = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)
    started = time.perf_counter()
    scores = cross_validate(
        estimator,
        features,
        target,
        cv=splitter,
        scoring={"macro_f1": "f1_macro", "accuracy": "accuracy"},
        n_jobs=1,
    )
    elapsed = time.perf_counter() - started
    macro_f1 = scores["test_macro_f1"]
    accuracy = scores["test_accuracy"]
    return {
        "cv_macro_f1_mean": float(macro_f1.mean()),
        "cv_macro_f1_std": float(macro_f1.std(ddof=1)),
        "cv_macro_f1_folds": [float(value) for value in macro_f1],
        "cv_accuracy_mean": float(accuracy.mean()),
        "cv_accuracy_std": float(accuracy.std(ddof=1)),
        "cv_accuracy_folds": [float(value) for value in accuracy],
        "cross_validation_seconds": float(elapsed),
    }


def select_model(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Pick the best cross-validated model. Test scores are not an input."""

    def sort_key(row: dict[str, Any]) -> tuple[float, float, int]:
        return (-float(row["cv_macro_f1_mean"]), -float(row["cv_accuracy_mean"]), int(row["catalog_index"]))

    return sorted(rows, key=sort_key)[0]


def compute_feature_importance(
    model: Any,
    model_key: str,
    features: np.ndarray,
    target: np.ndarray,
) -> dict[str, Any]:
    """Use native tree importances, or permutation importance for every other model."""
    labels = [feature["label"] for feature in FEATURES]
    columns = [feature["column"] for feature in FEATURES]
    stds: list[float | None]
    if model_key in {"decision_tree", "random_forest"}:
        estimator = model
        if hasattr(model, "named_steps") and "clf" in model.named_steps:
            estimator = model.named_steps["clf"]
        values = np.asarray(estimator.feature_importances_, dtype=float)
        stds = [None for _ in values]
        method = "native_feature_importance"
        score_label = "Impurity importance"
        note = (
            "These are native impurity-based feature importances from the fitted tree model. "
            "A larger value means the measurement was used more often to separate species inside this model. "
            "The score is not a causal effect, and it was not used to choose the model."
        )
    else:
        result = permutation_importance(
            model,
            features,
            target,
            n_repeats=30,
            random_state=SEED,
            scoring="f1_macro",
            n_jobs=1,
        )
        values = np.asarray(result.importances_mean, dtype=float)
        stds = [float(value) for value in result.importances_std]
        method = "permutation_importance"
        score_label = "Held-out macro-F1 drop when shuffled"
        note = (
            "Permutation importance is the drop in held-out macro-F1 after a measurement is shuffled. "
            "It was computed on the test set after model selection, so it explains the chosen model and did not decide the winner. "
            "A larger score means the model relied more on that measurement in this evaluation. "
            "A near-zero or negative score means shuffling it did not hurt. This is not a causal claim."
        )

    absolute_total = float(np.abs(values).sum())
    rows = []
    for index, label in enumerate(labels):
        importance = float(values[index])
        entry: dict[str, Any] = {
            "feature": label,
            "column": columns[index],
            "importance": importance,
            "relative_importance": float(abs(importance) / absolute_total) if absolute_total else 0.0,
        }
        if stds[index] is not None:
            entry["std"] = stds[index]
        rows.append(entry)
    rows.sort(key=lambda item: item["importance"], reverse=True)
    narrative = _importance_narrative(rows)
    return {
        "method": method,
        "score_label": score_label,
        "note": note,
        "narrative": narrative,
        "features": rows,
    }


def _importance_narrative(rows: list[dict[str, Any]]) -> str:
    ranking = ", ".join(
        f"{row['feature']} ({row['relative_importance'] * 100:.1f}% of the absolute score)"
        for row in rows
    )
    petal_share = sum(row["relative_importance"] for row in rows if str(row["feature"]).startswith("Petal"))
    sepal_share = sum(row["relative_importance"] for row in rows if str(row["feature"]).startswith("Sepal"))
    top = rows[0]["feature"] if rows else "none"
    return (
        f"For the selected model, the importance ranking is {ranking}. "
        f"The highest-ranked measurement is {top}. "
        f"Petal measurements account for {petal_share * 100:.1f}% of the absolute importance, "
        f"and sepal measurements account for {sepal_share * 100:.1f}%. "
        "Compare this ranking with the gaps between species averages in the dataset explorer. "
        "Both views describe separation in this sample. Neither one shows that a measurement causes the species."
    )
