"""
Lumina Backend — Health Check Route
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["health"])

_START_TIME = time.time()


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "lumina-backend",
        "uptime_seconds": round(time.time() - _START_TIME, 1),
    }
