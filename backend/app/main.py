"""Iris Flower Classification API."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.analytics_service import AnalyticsService
from backend.app.config import Settings, get_settings
from backend.app.model_service import ModelNotAvailableError, ModelService
from backend.app.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    FlowerInput,
    HealthResponse,
    ModelInfoResponse,
    PredictionResponse,
)

logger = logging.getLogger("iris.api")


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        force=True,
    )


def _clean_validation_message(message: str) -> str:
    cleaned = message.removeprefix("Value error, ")
    return cleaned


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        configure_logging(app.state.settings.log_level)
        app.state.model_service.load()
        if app.state.model_service.ready:
            logger.info("Model ready: %s", app.state.model_service.model_name)
        else:
            logger.warning("Model unavailable: %s", app.state.model_service.error)
        yield

    app = FastAPI(
        title=active_settings.app_name,
        version=active_settings.version,
        lifespan=lifespan,
        description=(
            "Classify Iris flowers from sepal and petal measurements. "
            "Metrics come from the local training run."
        ),
    )
    app.state.settings = active_settings
    app.state.model_service = ModelService(active_settings.artifacts_dir)
    app.state.analytics_service = AnalyticsService(app.state.model_service)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for error in exc.errors():
            location = [str(part) for part in error.get("loc", []) if part != "body"]
            errors.append(
                {
                    "field": ".".join(location) if location else "request",
                    "message": _clean_validation_message(str(error.get("msg", "Invalid value"))),
                }
            )
        return JSONResponse(
            status_code=422,
            content={
                "detail": "The request contains invalid measurements.",
                "code": "validation_error",
                "errors": errors,
            },
        )

    @app.exception_handler(HTTPException)
    async def handle_http(_: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code == 503:
            code = "model_unavailable"
        elif exc.status_code == 404:
            code = "not_found"
        else:
            code = "error"
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "code": code})

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "The server could not complete the request.", "code": "internal_error"},
        )

    def services(request: Request) -> tuple[ModelService, AnalyticsService]:
        return request.app.state.model_service, request.app.state.analytics_service

    def unavailable(exc: ModelNotAvailableError) -> HTTPException:
        return HTTPException(status_code=503, detail=str(exc))

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "service": active_settings.app_name,
            "health": "/api/health",
            "docs": "/docs",
        }

    @app.get("/api/health", response_model=HealthResponse)
    def health(request: Request) -> dict:
        service, _ = services(request)
        return {
            "status": "ok" if service.ready else "degraded",
            "model_available": service.ready,
            "model_name": service.model_name,
            "version": request.app.state.settings.version,
            "message": "Model loaded." if service.ready else (service.error or "Model is not loaded."),
        }

    @app.get("/api/model-info", response_model=ModelInfoResponse)
    def model_info(request: Request) -> dict:
        service, analytics = services(request)
        try:
            return analytics.model_info()
        except ModelNotAvailableError as exc:
            raise unavailable(exc) from exc

    @app.get("/api/analytics")
    def analytics(request: Request) -> dict:
        service, analytics_service = services(request)
        try:
            return analytics_service.analytics()
        except ModelNotAvailableError as exc:
            raise unavailable(exc) from exc

    @app.post("/api/predict", response_model=PredictionResponse)
    def predict(payload: FlowerInput, request: Request) -> dict:
        service, _ = services(request)
        try:
            return service.predict_one(payload.model_dump())
        except ModelNotAvailableError as exc:
            raise unavailable(exc) from exc

    @app.post("/api/predict/batch", response_model=BatchPredictionResponse)
    def predict_batch(payload: BatchPredictionRequest, request: Request) -> dict:
        service, _ = services(request)
        try:
            samples = [sample.model_dump() for sample in payload.samples]
            return service.predict_batch(samples)
        except ModelNotAvailableError as exc:
            raise unavailable(exc) from exc

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    runtime = get_settings()
    uvicorn.run(
        "backend.app.main:app",
        host=runtime.host,
        port=runtime.port,
        reload=False,
    )
