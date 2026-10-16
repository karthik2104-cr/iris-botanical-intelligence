"""Classifier catalog used for comparison and selection."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

from ml.src.config import SEED


@dataclass(frozen=True)
class ModelSpec:
    """A named estimator factory and the preprocessing choice that goes with it."""

    key: str
    name: str
    uses_scaling: bool
    hyperparameters: str
    factory: Callable[[], Any]


def build_models() -> list[ModelSpec]:
    """Return the six classifiers in the documented catalog order."""
    return [
        ModelSpec(
            key="logistic_regression",
            name="Logistic Regression",
            uses_scaling=True,
            hyperparameters="StandardScaler + LogisticRegression(max_iter=2000, random_state=42)",
            factory=lambda: Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("clf", LogisticRegression(max_iter=2000, random_state=SEED)),
                ]
            ),
        ),
        ModelSpec(
            key="knn",
            name="K-Nearest Neighbors",
            uses_scaling=True,
            hyperparameters="StandardScaler + KNeighborsClassifier(n_neighbors=5, weights='uniform')",
            factory=lambda: Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("clf", KNeighborsClassifier(n_neighbors=5, weights="uniform")),
                ]
            ),
        ),
        ModelSpec(
            key="decision_tree",
            name="Decision Tree",
            uses_scaling=False,
            hyperparameters="DecisionTreeClassifier(random_state=42)",
            factory=lambda: DecisionTreeClassifier(random_state=SEED),
        ),
        ModelSpec(
            key="random_forest",
            name="Random Forest",
            uses_scaling=False,
            hyperparameters="RandomForestClassifier(n_estimators=200, random_state=42)",
            factory=lambda: RandomForestClassifier(n_estimators=200, random_state=SEED),
        ),
        ModelSpec(
            key="svm",
            name="Support Vector Machine",
            uses_scaling=True,
            hyperparameters=(
                "StandardScaler + CalibratedClassifierCV(SVC(kernel='rbf'), method='sigmoid', ensemble=False). "
                "Calibration uses a stratified inner split so the model can return probabilities."
            ),
            factory=lambda: Pipeline(
                [
                    ("scaler", StandardScaler()),
                    (
                        "clf",
                        CalibratedClassifierCV(
                            estimator=SVC(kernel="rbf", random_state=SEED),
                            method="sigmoid",
                            cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED),
                            ensemble=False,
                        ),
                    ),
                ]
            ),
        ),
        ModelSpec(
            key="gaussian_nb",
            name="Gaussian Naive Bayes",
            uses_scaling=False,
            hyperparameters="GaussianNB()",
            factory=GaussianNB,
        ),
    ]


def model_by_key(key: str) -> ModelSpec:
    for spec in build_models():
        if spec.key == key:
            return spec
    raise KeyError(key)
