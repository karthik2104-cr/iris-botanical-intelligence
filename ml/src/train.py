"""Train, compare, evaluate, and save the Iris classifiers."""

from __future__ import annotations

import argparse
import json
import logging
import platform
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import accuracy_score, f1_score

from ml.src.config import (
    ARTIFACTS_DIR,
    FEATURES,
    FEATURE_COLUMNS,
    FIGURES_DIR,
    LIMITATIONS,
    PIPELINE_STAGES,
    PREPROCESSING_NOTES,
    PROJECT_ROOT,
    REPORTS_DIR,
    SEED,
    TEST_SIZE,
)
from ml.src.data import (
    class_names_from_frame,
    load_iris_dataframe,
    split_features_target,
    split_train_test,
)
from ml.src.evaluate import (
    classification_scores,
    compute_feature_importance,
    cross_validate_model,
    select_model,
)
from ml.src.models import build_models
from ml.src.visualize import save_figures

logger = logging.getLogger("iris.train")

SELECTION_RULE = (
    "Highest mean stratified cross-validated macro-F1 on the training set. "
    "Mean cross-validated accuracy breaks a tie. "
    "If both match, the earlier model in the fixed catalog is kept. "
    "The held-out test set is not used for selection."
)


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        force=True,
    )


def _class_counts(target: np.ndarray, class_names: list[str]) -> dict[str, int]:
    return {class_names[index]: int(np.sum(target == index)) for index in range(len(class_names))}


def _dataset_profile(frame: pd.DataFrame, class_names: list[str]) -> dict[str, Any]:
    missing = {column: int(frame[column].isna().sum()) for column in frame.columns}
    duplicate_records = int(frame.duplicated(subset=FEATURE_COLUMNS + ["target"]).sum())
    statistics = []
    described = frame[FEATURE_COLUMNS].describe()
    for feature in FEATURES:
        column = feature["column"]
        statistics.append(
            {
                "feature": feature["label"],
                "column": column,
                "count": int(described.loc["count", column]),
                "mean": float(described.loc["mean", column]),
                "std": float(described.loc["std", column]),
                "min": float(described.loc["min", column]),
                "q1": float(described.loc["25%", column]),
                "median": float(described.loc["50%", column]),
                "q3": float(described.loc["75%", column]),
                "max": float(described.loc["max", column]),
            }
        )

    distribution = []
    for name in class_names:
        count = int((frame["species"] == name).sum())
        distribution.append(
            {
                "species": name,
                "count": count,
                "proportion": float(count / len(frame)),
            }
        )

    grouped = frame.groupby("species", sort=False)
    profiles = []
    for feature in FEATURES:
        column = feature["column"]
        class_means = {name: float(grouped.get_group(name)[column].mean()) for name in class_names}
        profiles.append(
            {
                "feature": feature["label"],
                "column": column,
                "key": feature["key"],
                "description": feature["description"],
                "min": float(frame[column].min()),
                "max": float(frame[column].max()),
                "mean": float(frame[column].mean()),
                "std": float(frame[column].std(ddof=1)),
                "class_means": class_means,
                "between_class_range": float(max(class_means.values()) - min(class_means.values())),
            }
        )
    profiles.sort(key=lambda item: item["between_class_range"], reverse=True)

    correlation = frame[FEATURE_COLUMNS].corr(method="pearson")
    records = []
    for raw in frame[FEATURE_COLUMNS + ["species"]].to_dict(orient="records"):
        record = {feature["key"]: float(raw[feature["column"]]) for feature in FEATURES}
        record["species"] = str(raw["species"])
        records.append(record)

    if duplicate_records == 0:
        duplicate_note = "No duplicate measurement-and-species rows were found."
    elif duplicate_records == 1:
        duplicate_note = (
            "1 duplicate measurement-and-species row was found. "
            "It is retained because it belongs to the canonical Iris table. "
            "An identical row can land in both splits, which can make the test score slightly optimistic."
        )
    else:
        duplicate_note = (
            f"{duplicate_records} duplicate measurement-and-species rows were found. "
            "They are retained because they belong to the canonical Iris table. "
            "An identical row can land in both splits, which can make the test score slightly optimistic."
        )

    return {
        "rows": int(frame.shape[0]),
        "columns": int(frame.shape[1]),
        "feature_count": len(FEATURES),
        "class_count": len(class_names),
        "column_names": [str(column) for column in frame.columns],
        "source": "sklearn.datasets.load_iris",
        "missing_values": missing,
        "missing_total": int(sum(missing.values())),
        "duplicate_records": duplicate_records,
        "duplicate_note": duplicate_note,
        "descriptive_statistics": statistics,
        "class_distribution": distribution,
        "correlation": {
            "features": [feature["label"] for feature in FEATURES],
            "columns": FEATURE_COLUMNS,
            "matrix": correlation.to_numpy(dtype=float).round(10).tolist(),
        },
        "feature_profiles": profiles,
        "records": records,
    }


def _training_centroids(
    features: np.ndarray,
    target: np.ndarray,
    class_names: list[str],
) -> list[dict[str, Any]]:
    centroids = []
    for index, name in enumerate(class_names):
        group = features[target == index]
        means = {
            column: float(group[:, feature_index].mean())
            for feature_index, column in enumerate(FEATURE_COLUMNS)
        }
        centroids.append({"species": name, "count": int(len(group)), "means": means})
    return centroids


def _write_report(metadata: dict[str, Any], reports_dir: Path) -> Path:
    evaluation = metadata["evaluation"]
    test_metrics = evaluation["test_metrics"]
    lines = [
        "# Evaluation summary",
        "",
        "Generated by `python -m ml.src.train`. These numbers come from that run.",
        "",
        f"- Selected model: {evaluation['selected_model_name']}",
        f"- Selection rule: {evaluation['selection_rule']}",
        f"- Training samples: {metadata['split']['train_count']}",
        f"- Test samples: {metadata['split']['test_count']}",
        f"- Test accuracy: {test_metrics['accuracy']:.6f}",
        f"- Test precision (macro): {test_metrics['precision_macro']:.6f}",
        f"- Test recall (macro): {test_metrics['recall_macro']:.6f}",
        f"- Test macro-F1: {test_metrics['f1_macro']:.6f}",
        f"- Training accuracy: {evaluation['training_metrics']['accuracy']:.6f}",
        f"- Training macro-F1: {evaluation['training_metrics']['f1_macro']:.6f}",
        "",
        "## Cross-validation",
        "",
        "| Model | CV macro-F1 | CV accuracy | Scaled | Selected |",
        "| --- | ---: | ---: | --- | --- |",
    ]
    for row in evaluation["comparison"]:
        lines.append(
            f"| {row['name']} | {row['cv_macro_f1_mean']:.4f} ± {row['cv_macro_f1_std']:.4f} | "
            f"{row['cv_accuracy_mean']:.4f} ± {row['cv_accuracy_std']:.4f} | "
            f"{'yes' if row['uses_scaling'] else 'no'} | {'yes' if row['selected'] else 'no'} |"
        )
    lines.extend(
        [
            "",
            "## Feature importance",
            "",
            evaluation["feature_importance"]["narrative"],
            "",
            "## Dataset",
            "",
            f"- Rows: {metadata['dataset']['rows']}",
            f"- Columns in the working table: {metadata['dataset']['columns']}",
            f"- Missing values: {metadata['dataset']['missing_total']}",
            f"- Duplicate records: {metadata['dataset']['duplicate_records']}",
            "",
            metadata["dataset"]["duplicate_note"],
            "",
        ]
    )
    path = reports_dir / "evaluation_summary.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _portable_path(path: str | Path) -> str:
    resolved = Path(path).resolve()
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return str(resolved)


def run_training(
    artifacts_dir: Path | None = None,
    reports_dir: Path | None = None,
) -> dict[str, Any]:
    """Run the full comparison and save the selected model plus metadata."""
    _configure_logging()
    artifacts = Path(artifacts_dir) if artifacts_dir else ARTIFACTS_DIR
    reports = Path(reports_dir) if reports_dir else REPORTS_DIR
    figures = reports / "figures" if reports_dir else FIGURES_DIR
    artifacts.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)

    frame = load_iris_dataframe()
    class_names = class_names_from_frame(frame)
    dataset = _dataset_profile(frame, class_names)
    logger.info(
        "Loaded Iris table with %s rows and %s columns. Missing values: %s. Duplicate rows: %s.",
        dataset["rows"],
        dataset["columns"],
        dataset["missing_total"],
        dataset["duplicate_records"],
    )
    if dataset["missing_total"]:
        raise ValueError("Training stopped because missing values were found. No imputer is configured.")

    features, target = split_features_target(frame)
    x_train, x_test, y_train, y_test = split_train_test(features, target)
    logger.info(
        "Split %s training rows and %s test rows with seed %s.",
        len(y_train),
        len(y_test),
        SEED,
    )

    comparison: list[dict[str, Any]] = []
    fitted: dict[str, Any] = {}
    catalog = build_models()
    for index, spec in enumerate(catalog):
        cv_scores = cross_validate_model(spec.factory(), x_train, y_train)
        model = spec.factory()
        started = time.perf_counter()
        model.fit(x_train, y_train)
        fit_seconds = time.perf_counter() - started
        fitted[spec.key] = model
        row = {
            "key": spec.key,
            "name": spec.name,
            "uses_scaling": spec.uses_scaling,
            "hyperparameters": spec.hyperparameters,
            "catalog_index": index,
            "fit_seconds": float(fit_seconds),
            "selected": False,
            **cv_scores,
        }
        comparison.append(row)
        logger.info(
            "%s CV macro-F1 %.4f +/- %.4f, CV accuracy %.4f +/- %.4f, fit %.4fs.",
            spec.name,
            row["cv_macro_f1_mean"],
            row["cv_macro_f1_std"],
            row["cv_accuracy_mean"],
            row["cv_accuracy_std"],
            row["fit_seconds"],
        )

    winner = select_model(comparison)
    for row in comparison:
        row["selected"] = row["key"] == winner["key"]
    selected_model = fitted[winner["key"]]
    test_metrics = classification_scores(selected_model, x_test, y_test, class_names)
    training_predictions = selected_model.predict(x_train)
    training_metrics = {
        "accuracy": float(accuracy_score(y_train, training_predictions)),
        "f1_macro": float(f1_score(y_train, training_predictions, average="macro")),
        "samples": int(len(y_train)),
        "note": (
            "Training-set scores describe fit on rows the model has already seen. "
            "They are not used to select the model."
        ),
    }
    importance = compute_feature_importance(selected_model, winner["key"], x_test, y_test)
    figure_paths = [
        _portable_path(path)
        for path in save_figures(
            frame,
            FEATURE_COLUMNS,
            class_names,
            comparison,
            test_metrics["confusion_matrix"],
            importance,
            figures,
        )
    ]

    accuracy_gap = float(training_metrics["accuracy"] - test_metrics["accuracy"])
    f1_gap = float(training_metrics["f1_macro"] - test_metrics["f1_macro"])
    metadata = {
        "project": "Iris Flower Classification",
        "seed": SEED,
        "test_size": TEST_SIZE,
        "cv_folds": 5,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        },
        "features": FEATURES,
        "class_names": class_names,
        "dataset": dataset,
        "split": {
            "seed": SEED,
            "test_size": TEST_SIZE,
            "stratified": True,
            "train_count": int(len(y_train)),
            "test_count": int(len(y_test)),
            "train_class_counts": _class_counts(y_train, class_names),
            "test_class_counts": _class_counts(y_test, class_names),
            "training_class_centroids": _training_centroids(x_train, y_train, class_names),
        },
        "preprocessing": {
            "notes": PREPROCESSING_NOTES,
            "scaled_models": [spec.name for spec in catalog if spec.uses_scaling],
            "unscaled_models": [spec.name for spec in catalog if not spec.uses_scaling],
        },
        "pipeline_stages": PIPELINE_STAGES,
        "evaluation": {
            "selected_model_key": winner["key"],
            "selected_model_name": winner["name"],
            "selected_model_uses_scaling": winner["uses_scaling"],
            "selected_model_hyperparameters": winner["hyperparameters"],
            "selection_rule": SELECTION_RULE,
            "comparison": comparison,
            "test_metrics": test_metrics,
            "training_metrics": training_metrics,
            "generalization_gap": {
                "accuracy": accuracy_gap,
                "f1_macro": f1_gap,
                "note": (
                    "A positive gap means the training score is higher than the held-out test score. "
                    "Some difference is normal. A large gap can indicate overfitting. "
                    "This gap was not used to choose the model."
                ),
            },
            "confusion_matrix": test_metrics["confusion_matrix"],
            "class_names": class_names,
            "classification_report": test_metrics["classification_report"],
            "feature_importance": importance,
            "timings": {
                "selected_model_fit_seconds": float(winner["fit_seconds"]),
                "selected_model_cross_validation_seconds": float(winner["cross_validation_seconds"]),
                "test_inference_seconds": float(test_metrics["inference_seconds"]),
                "test_inference_per_sample_seconds": float(test_metrics["inference_per_sample_seconds"]),
            },
        },
        "figures": figure_paths,
        "limitations": LIMITATIONS,
    }

    model_path = artifacts / "model.joblib"
    metadata_path = artifacts / "metadata.json"
    joblib.dump(selected_model, model_path)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    report_path = _write_report(metadata, reports)
    logger.info(
        "Selected %s. Test accuracy %.4f. Test macro-F1 %.4f. Saved %s.",
        winner["name"],
        test_metrics["accuracy"],
        test_metrics["f1_macro"],
        model_path,
    )
    logger.info("Wrote %s and %s.", metadata_path, report_path)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate Iris classifiers.")
    parser.add_argument("--artifacts-dir", type=Path, default=None)
    parser.add_argument("--reports-dir", type=Path, default=None)
    args = parser.parse_args()
    run_training(args.artifacts_dir, args.reports_dir)


if __name__ == "__main__":
    main()
