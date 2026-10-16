"""Runtime configuration loaded from the environment and an optional .env file."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"


def load_env_file(path: Path) -> None:
    """Load KEY=VALUE pairs without overriding variables that are already set."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass
class Settings:
    artifacts_dir: Path
    cors_origins: list[str]
    log_level: str
    host: str
    port: int
    app_name: str = "Iris Flower Classification API"
    version: str = "1.0.0"


def get_settings() -> Settings:
    load_env_file(PROJECT_ROOT / ".env")
    raw_artifacts = os.getenv("ARTIFACTS_DIR", "").strip()
    artifacts_dir = Path(raw_artifacts) if raw_artifacts else DEFAULT_ARTIFACTS_DIR
    if not artifacts_dir.is_absolute():
        artifacts_dir = PROJECT_ROOT / artifacts_dir
    origins = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]
    return Settings(
        artifacts_dir=artifacts_dir,
        cors_origins=origins,
        log_level=os.getenv("LOG_LEVEL", "INFO").strip() or "INFO",
        host=os.getenv("BACKEND_HOST", "127.0.0.1").strip() or "127.0.0.1",
        port=int(os.getenv("BACKEND_PORT", "8002")),
    )
