"""
Lumina Backend — Course Routes

GET /api/status/{job_id}                   — Full job status + course data
GET /api/progress/{job_id}                 — Lightweight progress polling
GET /api/course/{job_id}/flashcards        — Filtered flashcards
GET /api/course/{job_id}/quiz              — Filtered quiz questions
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Query, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db_session
from models.db import JobRecord
from models.enums import ProcessingStatus
from utils.exceptions import JobNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["course"])


async def _require_job(session: AsyncSession, job_id: str) -> dict[str, Any]:
    """Return the job dict from DB or raise 404."""
    job = await session.get(JobRecord, job_id)
    if job is None:
        raise JobNotFoundError(job_id)
    return job.to_dict()


# ── /api/jobs ─────────────────────────────────────────────────────────────────


@router.get("/jobs")
async def list_jobs(session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
    """List all persisted jobs, sorted newest first."""
    stmt = select(JobRecord).order_by(JobRecord.created_at.desc())
    result = await session.execute(stmt)
    records = result.scalars().all()
    
    return JSONResponse(content={
        "jobs": [
            {
                "jobId": r.job_id,
                "status": r.status,
                "progress": r.progress,
                "videoTitle": r.video_title,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
                "course": r.course_data,
            }
            for r in records
        ]
    })


# ── /api/status/{job_id} ─────────────────────────────────────────────────────


@router.get("/status/{job_id}")
async def get_status(job_id: str, session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
    """Return the full status of a job, including the course if complete."""
    job = await _require_job(session, job_id)

    return JSONResponse(content={
        "jobId": job_id,
        "status": job.get("status", ProcessingStatus.PENDING),
        "course": job.get("course"),
        "error": job.get("error"),
    })


# ── /api/progress/{job_id} ───────────────────────────────────────────────────


@router.get("/progress/{job_id}")
async def get_progress(job_id: str, session: AsyncSession = Depends(get_db_session)) -> JSONResponse:
    """Return lightweight progress info for status polling."""
    job = await _require_job(session, job_id)

    return JSONResponse(content={
        "jobId": job_id,
        "status": job.get("status", ProcessingStatus.PENDING),
        "progress": job.get("progress", 0),
        "message": job.get("message", ""),
        "videoTitle": job.get("video_title"),
        "currentStep": job.get("current_step", ""),
        "stepsCompleted": job.get("steps_completed", 0),
        "totalSteps": 5,
    })


# ── /api/course/{job_id}/flashcards ──────────────────────────────────────────


@router.get("/course/{job_id}/flashcards")
async def get_flashcards(
    job_id: str,
    session: AsyncSession = Depends(get_db_session),
    concept_id: Optional[str] = Query(None, alias="conceptId", description="Filter by concept ID"),
) -> JSONResponse:
    """Return flashcards for a completed job, optionally filtered by concept."""
    job = await _require_job(session, job_id)

    course_data = job.get("course")
    if not course_data:
        return JSONResponse(content={
            "jobId": job_id,
            "status": job.get("status", ProcessingStatus.PENDING),
            "flashcards": [],
            "message": "Course is not yet ready.",
        })

    flashcards = course_data.get("flashcards", [])

    if concept_id:
        flashcards = [f for f in flashcards if f.get("conceptId") == concept_id]

    return JSONResponse(content={
        "jobId": job_id,
        "status": job.get("status"),
        "total": len(flashcards),
        "flashcards": flashcards,
    })


# ── /api/course/{job_id}/quiz ────────────────────────────────────────────────


@router.get("/course/{job_id}/quiz")
async def get_quiz(
    job_id: str,
    session: AsyncSession = Depends(get_db_session),
    concept_id: Optional[str] = Query(None, alias="conceptId", description="Filter by concept ID"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty (Easy/Medium/Hard/Expert)"),
) -> JSONResponse:
    """Return quiz questions for a completed job, with optional filters."""
    job = await _require_job(session, job_id)

    course_data = job.get("course")
    if not course_data:
        return JSONResponse(content={
            "jobId": job_id,
            "status": job.get("status", ProcessingStatus.PENDING),
            "quizQuestions": [],
            "message": "Course is not yet ready.",
        })

    questions = course_data.get("quizQuestions", [])

    if concept_id:
        questions = [q for q in questions if q.get("conceptId") == concept_id]
    if difficulty:
        questions = [q for q in questions if q.get("difficulty") == difficulty]

    return JSONResponse(content={
        "jobId": job_id,
        "status": job.get("status"),
        "total": len(questions),
        "quizQuestions": questions,
    })
