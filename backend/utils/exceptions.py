"""
Lumina Backend — Custom Exceptions & FastAPI Exception Handlers

All domain-specific exception types and the FastAPI handler registrations.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# ── Exception Classes ─────────────────────────────────────────────────────────


class LuminaBaseError(Exception):
    """Base exception for all Lumina errors."""

    def __init__(self, message: str = "An unexpected error occurred", status_code: int = 500) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class VideoProcessingError(LuminaBaseError):
    """Raised when video processing (download / transcode / cleanup) fails."""

    def __init__(self, message: str = "Video processing failed") -> None:
        super().__init__(message=message, status_code=500)


class GeminiAnalysisError(LuminaBaseError):
    """Raised when Gemini AI analysis fails."""

    def __init__(self, message: str = "AI analysis failed") -> None:
        super().__init__(message=message, status_code=502)


class YouTubeDownloadError(LuminaBaseError):
    """Raised when a YouTube download fails."""

    def __init__(self, message: str = "YouTube download failed") -> None:
        super().__init__(message=message, status_code=502)


class InvalidFileError(LuminaBaseError):
    """Raised when an uploaded file is invalid (wrong type, too large, etc.)."""

    def __init__(self, message: str = "Invalid file") -> None:
        super().__init__(message=message, status_code=400)


class JobNotFoundError(LuminaBaseError):
    """Raised when a job ID is not found in the store."""

    def __init__(self, job_id: str = "") -> None:
        super().__init__(message=f"Job not found: {job_id}", status_code=404)


# ── FastAPI Handler Registration ─────────────────────────────────────────────


def _build_error_body(message: str, status_code: int, detail: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"error": True, "message": message, "status_code": status_code}
    if detail is not None:
        body["detail"] = detail
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""

    @app.exception_handler(LuminaBaseError)
    async def lumina_error_handler(_request: Request, exc: LuminaBaseError) -> JSONResponse:
        logger.error("LuminaBaseError: %s", exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_body(exc.message, exc.status_code),
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("ValueError: %s", exc)
        return JSONResponse(
            status_code=400,
            content=_build_error_body(str(exc), 400),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception")
        return JSONResponse(
            status_code=500,
            content=_build_error_body("Internal server error", 500),
        )
