"""
Lumina Backend — FastAPI Application Entry Point

Creates the FastAPI app with:
  • Lifespan context manager (startup / shutdown)
  • CORS middleware
  • Request-logging middleware
  • Global exception handlers
  • All route routers mounted under /api
  • In-memory jobs dict on app.state
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import configure_logging, get_settings
from routes.course import router as course_router
from routes.health import router as health_router
from routes.processing import router as processing_router
from utils.exceptions import register_exception_handlers

logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────


from database import engine, Base
from models.db import JobRecord # ensure models are imported

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — runs on startup and shutdown."""
    settings = get_settings()
    configure_logging(settings.LOG_LEVEL)

    logger.info("🚀 Lumina backend starting up...")
    logger.info("   Upload dir : %s", settings.upload_path)
    logger.info("   Max upload : %d MB", settings.MAX_FILE_SIZE_MB)
    logger.info("   CORS       : %s", settings.cors_origin_list)
    logger.info("   Log level  : %s", settings.LOG_LEVEL)

    # Ensure the upload directory exists
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    
    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialise the in-memory jobs store
    app.state.jobs: dict[str, Any] = {}

    yield  # ── app runs ──

    # Shutdown
    logger.info("🛑 Lumina backend shutting down...")
    job_count = len(app.state.jobs)
    if job_count:
        logger.info("   %d job(s) were still in memory", job_count)


# ── App Factory ───────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application."""

    app = FastAPI(
        title="Lumina API",
        description="AI-powered platform that transforms lecture videos into interactive, gamified study modules.",
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request-logging middleware ─────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d (%.1f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

    # ── Exception handlers ────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(health_router, prefix="/api")
    app.include_router(processing_router, prefix="/api")
    app.include_router(course_router, prefix="/api")

    # ── Root redirect ─────────────────────────────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "service": "lumina-backend",
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


# ── Module-level app instance (for ``uvicorn main:app``) ─────────────────────

app = create_app()
