"""Save evaluation and exploratory figures."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

SPECIES_COLORS = {
    "Iris setosa": "#c65b48",
    "Iris versicolor": "#2c8a76",
    "Iris virginica": "#6a4c86",
}


def _style() -> None:
    sns.set_theme(style="whitegrid", font_scale=0.95)
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "figure.facecolor": "#fffdf8",
            "axes.facecolor": "#fffdf8",
            "axes.edgecolor": "#e3dacd",
            "axes.labelcolor": "#1d1915",
            "xtick.color": "#6d655c",
            "ytick.color": "#6d655c",
            "text.color": "#1d1915",
            "figure.dpi": 140,
            "savefig.dpi": 140,
        }
    )


def _save(figure: plt.Figure, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(path, bbox_inches="tight")
    plt.close(figure)
    return str(path)


def save_figures(
    frame: pd.DataFrame,
    feature_columns: list[str],
    class_names: list[str],
    comparison: list[dict],
    confusion: list[list[int]],
    importance: dict,
    figures_dir: Path,
) -> list[str]:
    """Write the report figures and return their paths."""
    _style()
    figures_dir.mkdir(parents=True, exist_ok=True)
    palette = {name: SPECIES_COLORS.get(name, "#2f6d56") for name in class_names}
    saved = [
        _pairplot(frame, feature_columns, palette, figures_dir / "pairplot.png"),
        _distributions(frame, feature_columns, class_names, palette, figures_dir / "feature_distributions.png"),
        _correlation(frame, feature_columns, figures_dir / "correlation_heatmap.png"),
        _comparison_chart(comparison, figures_dir / "model_comparison.png"),
        _confusion_chart(confusion, class_names, figures_dir / "confusion_matrix.png"),
        _importance_chart(importance, figures_dir / "feature_importance.png"),
    ]
    plt.close("all")
    return saved


def _pairplot(frame: pd.DataFrame, feature_columns: list[str], palette: dict[str, str], path: Path) -> str:
    grid = sns.pairplot(
        frame,
        vars=feature_columns,
        hue="species",
        palette=palette,
        diag_kind="kde",
        height=2.15,
        plot_kws={"alpha": 0.86, "s": 28, "edgecolor": "none"},
    )
    grid.fig.suptitle("Pairwise relationships among Iris measurements", y=1.02)
    path.parent.mkdir(parents=True, exist_ok=True)
    grid.fig.savefig(path, bbox_inches="tight")
    plt.close(grid.fig)
    return str(path)


def _distributions(
    frame: pd.DataFrame,
    feature_columns: list[str],
    class_names: list[str],
    palette: dict[str, str],
    path: Path,
) -> str:
    figure, axes = plt.subplots(2, 2, figsize=(10.5, 8))
    for axis, column in zip(axes.ravel(), feature_columns):
        sns.violinplot(
            data=frame,
            x="species",
            y=column,
            hue="species",
            order=class_names,
            hue_order=class_names,
            palette=palette,
            legend=False,
            inner="quartile",
            cut=0,
            ax=axis,
        )
        axis.set_xlabel("")
        axis.set_title(column)
        axis.tick_params(axis="x", rotation=15)
    figure.suptitle("Feature distributions by species")
    figure.tight_layout()
    return _save(figure, path)


def _correlation(frame: pd.DataFrame, feature_columns: list[str], path: Path) -> str:
    labels = [column.replace(" (cm)", "") for column in feature_columns]
    matrix = frame[feature_columns].corr(method="pearson")
    figure, axis = plt.subplots(figsize=(7.2, 6))
    sns.heatmap(
        matrix,
        annot=True,
        fmt=".2f",
        cmap="vlag",
        vmin=-1,
        vmax=1,
        square=True,
        xticklabels=labels,
        yticklabels=labels,
        ax=axis,
    )
    axis.set_title("Pearson correlation of the four measurements")
    figure.tight_layout()
    return _save(figure, path)


def _comparison_chart(comparison: list[dict], path: Path) -> str:
    names = [row["name"] for row in comparison]
    positions = np.arange(len(names))
    width = 0.38
    figure, axis = plt.subplots(figsize=(10.5, 5.2))
    axis.bar(
        positions - width / 2,
        [row["cv_macro_f1_mean"] for row in comparison],
        width,
        yerr=[row["cv_macro_f1_std"] for row in comparison],
        capsize=3,
        label="CV macro-F1",
        color="#2f6d56",
    )
    axis.bar(
        positions + width / 2,
        [row["cv_accuracy_mean"] for row in comparison],
        width,
        yerr=[row["cv_accuracy_std"] for row in comparison],
        capsize=3,
        label="CV accuracy",
        color="#6a4c86",
    )
    axis.set_ylabel("Cross-validated score")
    axis.set_ylim(0, 1.08)
    axis.set_xticks(positions, names, rotation=18, ha="right")
    axis.set_title("Model comparison on the training set")
    axis.legend(frameon=False)
    figure.tight_layout()
    return _save(figure, path)


def _confusion_chart(confusion: list[list[int]], class_names: list[str], path: Path) -> str:
    labels = [name.replace("Iris ", "") for name in class_names]
    figure, axis = plt.subplots(figsize=(6.4, 5.4))
    sns.heatmap(
        np.asarray(confusion),
        annot=True,
        fmt="d",
        cmap="BuPu",
        xticklabels=labels,
        yticklabels=labels,
        ax=axis,
    )
    axis.set_xlabel("Predicted species")
    axis.set_ylabel("Actual species")
    axis.set_title("Held-out confusion matrix")
    figure.tight_layout()
    return _save(figure, path)


def _importance_chart(importance: dict, path: Path) -> str:
    rows = list(reversed(importance["features"]))
    figure, axis = plt.subplots(figsize=(8, 4.6))
    axis.barh(
        [row["feature"] for row in rows],
        [row["importance"] for row in rows],
        color="#2f6d56",
    )
    axis.set_xlabel(importance["score_label"])
    axis.set_title("Feature importance for the selected model")
    figure.tight_layout()
    return _save(figure, path)
