"""
Lumina Backend — Processing Routes

POST /api/process/youtube   — Queue a YouTube video for processing
POST /api/process/upload    — Upload a video file for processing
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Request, UploadFile, File
from fastapi.responses import JSONResponse

from config import get_settings
from models.enums import ProcessingStatus
from models.schemas import ProcessingResponse, YouTubeRequest
from utils.exceptions import InvalidFileError
from utils.helpers import generate_id, is_valid_youtube_url, sanitize_filename
from workers.processor import process_youtube_video, process_uploaded_video

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/process", tags=["processing"])

ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mpeg", ".mkv"}


def _get_jobs(request: Request) -> dict[str, Any]:
    """Retrieve the shared jobs store from app state."""
    return request.app.state.jobs


# ── YouTube endpoint ──────────────────────────────────────────────────────────


@router.post("/youtube")
async def process_youtube(
    body: YouTubeRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> JSONResponse:
    """Accept a YouTube URL, validate it, and launch background processing."""
    url = body.url.strip()

    if not is_valid_youtube_url(url):
        raise InvalidFileError("Invalid YouTube URL. Please provide a valid YouTube video link.")

    job_id = generate_id("yt")
    jobs = _get_jobs(request)

    jobs[job_id] = {
        "status": ProcessingStatus.PENDING,
        "progress": 0,
        "message": "Job queued — starting soon...",
        "video_title": None,
        "current_step": "Queued",
        "steps_completed": 0,
        "course": None,
        "error": None,
    }

    # Initial DB persistence
    try:
        from database import async_session
        from models.db import JobRecord
        async with async_session() as session:
            db_job = JobRecord(
                job_id=job_id,
                status=ProcessingStatus.PENDING,
                progress=0,
                message="Job queued — starting soon...",
                current_step="Queued",
                steps_completed=0,
            )
            session.add(db_job)
            await session.commit()
    except Exception as exc:
        logger.error("[%s] Failed to create initial job DB record: %s", job_id, exc)

    background_tasks.add_task(process_youtube_video, job_id, url, jobs)

    logger.info("YouTube job created: %s for %s", job_id, url)

    return JSONResponse(content={
        "jobId": job_id,
        "status": ProcessingStatus.PENDING,
        "message": "Processing started. Use the job ID to track progress.",
        "progress": 0,
    })


# ── File upload endpoint ──────────────────────────────────────────────────────


@router.post("/upload")
async def process_upload(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
) -> JSONResponse:
    """Accept a video file upload, validate it, save to disk, and launch processing."""
    settings = get_settings()

    # ── Validate filename / extension ─────────────────────────────────────
    if not file.filename:
        raise InvalidFileError("No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError(
            f"Unsupported file type: {ext}. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # ── Validate content type ─────────────────────────────────────────────
    content_type = file.content_type or ""
    if not content_type.startswith("video/"):
        logger.warning("Content-Type is '%s', expected video/*. Proceeding anyway.", content_type)

    # ── Read into memory (checks size) ────────────────────────────────────
    contents = await file.read()
    size_bytes = len(contents)
    size_mb = size_bytes / (1024 * 1024)

    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise InvalidFileError(
            f"File too large: {size_mb:.1f} MB. Maximum allowed: {settings.MAX_FILE_SIZE_MB} MB."
        )

    # ── Save to disk ──────────────────────────────────────────────────────
    job_id = generate_id("up")
    safe_name = sanitize_filename(file.filename)
    job_dir = settings.upload_path / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    save_path = job_dir / safe_name

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    logger.info("Uploaded file saved: %s (%.1f MB)", save_path, size_mb)

    # ── Create job ────────────────────────────────────────────────────────
    jobs = _get_jobs(request)

    jobs[job_id] = {
        "status": ProcessingStatus.PENDING,
        "progress": 0,
        "message": "File uploaded. Processing will begin shortly...",
        "video_title": file.filename,
        "current_step": "Queued",
        "steps_completed": 0,
        "course": None,
        "error": None,
    }

    # Initial DB persistence
    try:
        from database import async_session
        from models.db import JobRecord
        async with async_session() as session:
            db_job = JobRecord(
                job_id=job_id,
                status=ProcessingStatus.PENDING,
                progress=0,
                message="File uploaded. Processing will begin shortly...",
                video_title=file.filename,
                current_step="Queued",
                steps_completed=0,
            )
            session.add(db_job)
            await session.commit()
    except Exception as exc:
        logger.error("[%s] Failed to create initial job DB record: %s", job_id, exc)

    background_tasks.add_task(
        process_uploaded_video,
        job_id,
        str(save_path),
        file.filename,
        jobs,
    )

    logger.info("Upload job created: %s for %s", job_id, file.filename)

    return JSONResponse(content={
        "jobId": job_id,
        "status": ProcessingStatus.PENDING,
        "message": "File uploaded successfully. Processing started.",
        "progress": 0,
    })
