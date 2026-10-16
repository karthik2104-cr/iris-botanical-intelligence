"""Schema validation that does not require a trained model."""

from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from backend.app.schemas import BatchPredictionRequest, FlowerInput


VALID = {
    "sepal_length_cm": 5.1,
    "sepal_width_cm": 3.5,
    "petal_length_cm": 1.4,
    "petal_width_cm": 0.2,
}


def test_accepts_integer_measurements() -> None:
    flower = FlowerInput.model_validate(
        {
            "sepal_length_cm": 5,
            "sepal_width_cm": 3,
            "petal_length_cm": 1,
            "petal_width_cm": 1,
        }
    )
    assert flower.sepal_length_cm == 5.0


@pytest.mark.parametrize(
    "field, value",
    [
        ("sepal_length_cm", math.nan),
        ("sepal_width_cm", math.inf),
        ("petal_length_cm", -math.inf),
        ("petal_width_cm", 0),
        ("sepal_length_cm", -1),
        ("petal_width_cm", 30.1),
    ],
)
def test_rejects_non_finite_and_out_of_range_values(field: str, value: float) -> None:
    payload = dict(VALID)
    payload[field] = value
    with pytest.raises(ValidationError):
        FlowerInput.model_validate(payload)


def test_rejects_missing_and_extra_fields() -> None:
    incomplete = dict(VALID)
    del incomplete["petal_width_cm"]
    with pytest.raises(ValidationError):
        FlowerInput.model_validate(incomplete)
    with pytest.raises(ValidationError):
        FlowerInput.model_validate({**VALID, "color": "purple"})


def test_rejects_empty_batch() -> None:
    with pytest.raises(ValidationError):
        BatchPredictionRequest.model_validate({"samples": []})
