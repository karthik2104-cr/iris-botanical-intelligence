"""Load and split the Iris dataset."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

from ml.src.config import FEATURE_COLUMNS, SEED, TEST_SIZE


def display_species(name: str) -> str:
    """Format a scikit-learn target name as a common species label."""
    cleaned = name.strip().replace("_", " ")
    if cleaned.lower().startswith("iris "):
        species = cleaned.split(" ", 1)[1]
    else:
        species = cleaned
    return f"Iris {species.lower()}"


def load_iris_dataframe() -> pd.DataFrame:
    """Return the canonical Iris table with a readable species column."""
    bunch = load_iris(as_frame=True)
    frame = bunch.frame.copy()
    frame["species"] = frame["target"].map(lambda code: display_species(bunch.target_names[int(code)]))
    return frame


def class_names_from_frame(frame: pd.DataFrame) -> list[str]:
    """Species labels in scikit-learn target order."""
    ordered = (
        frame[["target", "species"]]
        .drop_duplicates()
        .sort_values("target")["species"]
        .tolist()
    )
    return [str(name) for name in ordered]


def split_features_target(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Separate the four measurements from the integer species code."""
    features = frame.loc[:, FEATURE_COLUMNS].to_numpy(dtype=float)
    target = frame["target"].to_numpy(dtype=int)
    return features, target


def split_train_test(
    features: np.ndarray,
    target: np.ndarray,
    *,
    test_size: float = TEST_SIZE,
    seed: int = SEED,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Stratified, reproducible train-test split."""
    return train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=seed,
        stratify=target,
    )
