"""API tests against the trained artifacts and a missing-model fallback."""

from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app.config import get_settings
from backend.app.main import create_app
from ml.src.config import ARTIFACTS_DIR
from ml.src.train import run_training


VALID = {
    "sepal_length_cm": 5.1,
    "sepal_width_cm": 3.5,
    "petal_length_cm": 1.4,
    "petal_width_cm": 0.2,
}

SECOND = {
    "sepal_length_cm": 6.3,
    "sepal_width_cm": 3.3,
    "petal_length_cm": 6.0,
    "petal_width_cm": 2.5,
}


@pytest.fixture(scope="session")
def trained_artifacts():
    if not (ARTIFACTS_DIR / "model.joblib").exists() or not (ARTIFACTS_DIR / "metadata.json").exists():
        run_training()
    return ARTIFACTS_DIR


@pytest.fixture(scope="session")
def client(trained_artifacts):
    settings = get_settings()
    settings.artifacts_dir = trained_artifacts
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_available"] is True
    assert body["model_name"]
    assert body["version"] == "1.0.0"


def test_cors_header(client: TestClient) -> None:
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_model_info(client: TestClient) -> None:
    response = client.get("/api/model-info")
    assert response.status_code == 200
    body = response.json()
    assert len(body["features"]) == 4
    assert body["class_names"] == ["Iris setosa", "Iris versicolor", "Iris virginica"]
    for score in body["metrics"].values():
        assert 0.0 <= score <= 1.0
    assert body["train_count"] == 120
    assert body["test_count"] == 30


def test_analytics(client: TestClient) -> None:
    response = client.get("/api/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["dataset"]["rows"] == 150
    assert body["dataset"]["columns"] == 6
    assert len(body["dataset"]["records"]) == 150
    assert sum(item["count"] for item in body["dataset"]["class_distribution"]) == 150
    matrix = body["dataset"]["correlation"]["matrix"]
    assert len(matrix) == 4
    for index, row in enumerate(matrix):
        assert row[index] == pytest.approx(1.0)
        for column, value in enumerate(row):
            assert value == pytest.approx(matrix[column][index])
    assert len(body["evaluation"]["comparison"]) == 6
    assert sum(1 for row in body["evaluation"]["comparison"] if row["selected"]) == 1


def test_prediction_matches_saved_model(client: TestClient) -> None:
    response = client.post("/api/predict", json=VALID)
    assert response.status_code == 200
    body = response.json()
    service_model = client.app.state.model_service
    expected_index = int(service_model.model.predict(np.array([[5.1, 3.5, 1.4, 0.2]]))[0])
    expected_name = service_model.metadata["class_names"][expected_index]
    assert body["predicted_species"] == expected_name
    assert body["measurements"] == VALID
    probabilities = [item["probability"] for item in body["probabilities"]]
    assert len(probabilities) == 3
    assert sum(probabilities) == pytest.approx(1.0, abs=1e-4)
    assert all(0.0 <= score <= 1.0 for score in probabilities)
    assert body["highest_probability"] == pytest.approx(max(probabilities))
    assert expected_name in body["summary"]
    assert body["centroid_comparison"]["nearest_species"] in service_model.metadata["class_names"]


def test_batch_prediction_preserves_order(client: TestClient) -> None:
    response = client.post("/api/predict/batch", json={"samples": [VALID, SECOND]})
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert body["predictions"][0]["measurements"] == VALID
    assert body["predictions"][1]["measurements"] == SECOND
    for prediction in body["predictions"]:
        total = sum(item["probability"] for item in prediction["probabilities"])
        assert total == pytest.approx(1.0, abs=1e-4)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"sepal_length_cm": 5.1, "sepal_width_cm": 3.5, "petal_length_cm": 1.4},
        {**VALID, "petal_width_cm": -0.2},
        {**VALID, "sepal_length_cm": 45},
        {**VALID, "extra": 1},
        {**VALID, "sepal_width_cm": "wide"},
    ],
)
def test_invalid_prediction_inputs(client: TestClient, payload: dict) -> None:
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["errors"]


def test_empty_batch_is_rejected(client: TestClient) -> None:
    response = client.post("/api/predict/batch", json={"samples": []})
    assert response.status_code == 422


def test_missing_artifacts(tmp_path) -> None:
    settings = get_settings()
    settings.artifacts_dir = tmp_path
    app = create_app(settings)
    with TestClient(app) as test_client:
        health = test_client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["model_available"] is False
        assert health.json()["status"] == "degraded"
        prediction = test_client.post("/api/predict", json=VALID)
        assert prediction.status_code == 503
        assert prediction.json()["code"] == "model_unavailable"
        analytics = test_client.get("/api/analytics")
        assert analytics.status_code == 503
        info = test_client.get("/api/model-info")
        assert info.status_code == 503
