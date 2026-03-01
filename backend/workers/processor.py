"""
Lumina Backend — Background Task Processor

Orchestrates the full pipeline for both YouTube and uploaded videos:
  1. Fetch metadata / validate file
  2. Download video (YouTube) or prepare file (upload)
  3. Analyze via Gemini (direct upload or transcript fallback)
  4. Generate structured course module
  5. Mark complete

Each step updates the shared ``jobs_store`` dict with progress and status.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from models.enums import ProcessingStatus
from services.course_generator import generate_course
from services.gemini_service import analyze_video_file, analyze_with_transcript
from services.transcript_service import extract_transcript, format_transcript_for_analysis
from services.video_processor import cleanup_file, cleanup_job_files, get_file_size_mb
from services.youtube_service import download_video, get_video_info
from utils.helpers import format_duration

logger = logging.getLogger(__name__)

# Maximum file size (in MB) for direct Gemini video upload
GEMINI_UPLOAD_LIMIT_MB = 200.0


# ── Job-store helpers ─────────────────────────────────────────────────────────


from database import async_session
from models.db import JobRecord

async def _update_job(
    jobs: dict[str, Any],
    job_id: str,
    *,
    status: ProcessingStatus | None = None,
    progress: int | None = None,
    message: str | None = None,
    video_title: str | None = None,
    current_step: str | None = None,
    steps_completed: int | None = None,
    course: Any = None,
    error: str | None = None,
) -> None:
    """Merge updates into the job record and persist to DB."""
    # Update memory
    job = jobs.setdefault(job_id, {})
    if status is not None: job["status"] = status
    if progress is not None: job["progress"] = progress
    if message is not None: job["message"] = message
    if video_title is not None: job["video_title"] = video_title
    if current_step is not None: job["current_step"] = current_step
    if steps_completed is not None: job["steps_completed"] = steps_completed
    if course is not None: job["course"] = course
    if error is not None: job["error"] = error

    # Async DB persistence
    try:
        async with async_session() as session:
            db_job = await session.get(JobRecord, job_id)
            if not db_job:
                # Create if it doesn't exist yet
                db_job = JobRecord(job_id=job_id)
                session.add(db_job)

            if status is not None: db_job.status = status
            if progress is not None: db_job.progress = progress
            if message is not None: db_job.message = message
            if video_title is not None: db_job.video_title = video_title
            if current_step is not None: db_job.current_step = current_step
            if steps_completed is not None: db_job.steps_completed = steps_completed
            if course is not None: db_job.course_data = course
            if error is not None: db_job.error = error

            await session.commit()
    except Exception as exc:
        logger.error("[%s] Failed to persist job update to DB: %s", job_id, exc)


# ── YouTube Pipeline ──────────────────────────────────────────────────────────


async def process_youtube_video(
    job_id: str,
    url: str,
    jobs_store: dict[str, Any],
) -> None:
    """Full pipeline for processing a YouTube video.

    Steps
    -----
    1. Get video info             (10 %)
    2. Download video             (30 %)
    3. Gemini analysis / fallback (60 %)
    4. Generate course            (80 %)
    5. Complete                   (100 %)
    """
    file_path: str | None = None

    try:
        # ── Step 1: Video info ────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.DOWNLOADING,
            progress=5,
            message="Fetching video information...",
            current_step="Fetching video info",
            steps_completed=0,
        )

        video_info = await get_video_info(url)
        video_title = video_info.get("title", "Untitled Video")
        video_duration = video_info.get("duration")
        thumbnail = video_info.get("thumbnail", "")

        await _update_job(
            jobs_store, job_id,
            progress=10,
            message=f"Video found: {video_title}",
            video_title=video_title,
            current_step="Video info fetched",
            steps_completed=1,
        )

        logger.info("[%s] Step 1 complete — %s (%s)", job_id, video_title, format_duration(video_duration))

        # ── Step 2: Download ──────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            progress=15,
            message=f"Downloading: {video_title}...",
            current_step="Downloading video",
        )

        download_result = await download_video(url, job_id)
        file_path = download_result["file_path"]
        file_size_mb = get_file_size_mb(file_path)

        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.PROCESSING,
            progress=30,
            message=f"Downloaded ({file_size_mb:.1f} MB). Preparing for analysis...",
            current_step="Download complete",
            steps_completed=2,
        )

        logger.info("[%s] Step 2 complete — %.1f MB at %s", job_id, file_size_mb, file_path)

        # ── Step 3: Gemini analysis ───────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.ANALYZING,
            progress=35,
            message="Analyzing content with AI...",
            current_step="AI analysis",
        )

        if file_size_mb <= GEMINI_UPLOAD_LIMIT_MB:
            # Direct video upload
            logger.info("[%s] Using direct video upload (%.1f MB)", job_id, file_size_mb)
            await _update_job(
                jobs_store, job_id,
                progress=40,
                message="Uploading video to AI for analysis...",
            )
            analysis = await analyze_video_file(file_path)
        else:
            # Transcript fallback
            logger.info("[%s] File too large (%.1f MB) — using transcript fallback", job_id, file_size_mb)
            await _update_job(
                jobs_store, job_id,
                progress=40,
                message="Video too large for direct upload. Extracting transcript...",
                current_step="Extracting transcript (fallback)",
            )

            transcript = await extract_transcript(url)
            if not transcript:
                raise RuntimeError("No transcript available and file too large for direct upload")

            formatted = format_transcript_for_analysis(transcript, video_info)
            analysis = await analyze_with_transcript(formatted, video_info)

        await _update_job(
            jobs_store, job_id,
            progress=60,
            message="AI analysis complete. Generating course...",
            current_step="Analysis complete",
            steps_completed=3,
        )

        logger.info("[%s] Step 3 complete — analysis returned %d keys", job_id, len(analysis))

        # ── Step 4: Generate course ───────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.GENERATING,
            progress=70,
            message="Building interactive study module...",
            current_step="Generating course structure",
        )

        course = generate_course(
            analysis=analysis,
            video_title=video_title,
            duration=video_duration,
            thumbnail_url=thumbnail,
        )
        course.video_url = url

        await _update_job(
            jobs_store, job_id,
            progress=80,
            message="Course structure generated. Finalizing...",
            current_step="Course generated",
            steps_completed=4,
        )

        logger.info("[%s] Step 4 complete — %d concepts, %d flashcards, %d quiz",
                     job_id, len(course.concepts), len(course.flashcards), len(course.quiz_questions))

        # ── Step 5: Complete ──────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.COMPLETED,
            progress=100,
            message="Course ready!",
            current_step="Complete",
            steps_completed=5,
            course=course.model_dump(by_alias=True),
        )

        logger.info("[%s] ✅ Pipeline complete", job_id)

    except Exception as exc:
        logger.exception("[%s] Pipeline failed: %s", job_id, exc)
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.FAILED,
            progress=0,
            message=str(exc),
            current_step="Failed",
            error=str(exc),
        )

    finally:
        # Cleanup downloaded files
        if file_path:
            cleanup_file(file_path)
        cleanup_job_files(job_id)


# ── Upload Pipeline ───────────────────────────────────────────────────────────


async def process_uploaded_video(
    job_id: str,
    file_path: str,
    filename: str,
    jobs_store: dict[str, Any],
) -> None:
    """Full pipeline for processing an uploaded video file.

    Steps
    -----
    1. Validate file               (10 %)
    2. Prepare for analysis        (30 %)
    3. Gemini analysis / fallback  (60 %)
    4. Generate course             (80 %)
    5. Complete                    (100 %)
    """
    try:
        # ── Step 1: Validate ──────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.PROCESSING,
            progress=5,
            message="Validating uploaded file...",
            video_title=filename,
            current_step="Validating file",
            steps_completed=0,
        )

        if not Path(file_path).exists():
            raise FileNotFoundError(f"Uploaded file not found: {file_path}")

        file_size_mb = get_file_size_mb(file_path)

        await _update_job(
            jobs_store, job_id,
            progress=10,
            message=f"File validated ({file_size_mb:.1f} MB). Preparing for analysis...",
            current_step="File validated",
            steps_completed=1,
        )

        logger.info("[%s] Step 1 complete — %s (%.1f MB)", job_id, filename, file_size_mb)

        # ── Step 2: Prepare ───────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            progress=30,
            message="Preparing video for AI analysis...",
            current_step="Preparing for analysis",
            steps_completed=2,
        )

        # ── Step 3: Gemini analysis ───────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.ANALYZING,
            progress=35,
            message="Analyzing content with AI...",
            current_step="AI analysis",
        )

        if file_size_mb <= GEMINI_UPLOAD_LIMIT_MB:
            logger.info("[%s] Direct upload (%.1f MB)", job_id, file_size_mb)
            await _update_job(
                jobs_store, job_id,
                progress=40,
                message="Uploading video to AI for analysis...",
            )
            analysis = await analyze_video_file(file_path)
        else:
            logger.warning("[%s] File too large for upload (%.1f MB). No transcript fallback for uploads.", job_id, file_size_mb)
            raise RuntimeError(
                f"Uploaded file is too large ({file_size_mb:.0f} MB). "
                f"Maximum for direct analysis is {GEMINI_UPLOAD_LIMIT_MB:.0f} MB. "
                "Please upload a smaller file or use a YouTube URL instead."
            )

        await _update_job(
            jobs_store, job_id,
            progress=60,
            message="AI analysis complete. Generating course...",
            current_step="Analysis complete",
            steps_completed=3,
        )

        logger.info("[%s] Step 3 complete — analysis keys: %s", job_id, list(analysis.keys()))

        # ── Step 4: Generate course ───────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.GENERATING,
            progress=70,
            message="Building interactive study module...",
            current_step="Generating course structure",
        )

        course = generate_course(
            analysis=analysis,
            video_title=filename,
            duration=None,
            thumbnail_url=None,
        )

        await _update_job(
            jobs_store, job_id,
            progress=80,
            message="Course structure generated. Finalizing...",
            current_step="Course generated",
            steps_completed=4,
        )

        # ── Step 5: Complete ──────────────────────────────────────────────
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.COMPLETED,
            progress=100,
            message="Course ready!",
            current_step="Complete",
            steps_completed=5,
            course=course.model_dump(by_alias=True),
        )

        logger.info("[%s] ✅ Upload pipeline complete", job_id)

    except Exception as exc:
        logger.exception("[%s] Upload pipeline failed: %s", job_id, exc)
        await _update_job(
            jobs_store, job_id,
            status=ProcessingStatus.FAILED,
            progress=0,
            message=str(exc),
            current_step="Failed",
            error=str(exc),
        )

    finally:
        # Cleanup the uploaded file
        cleanup_file(file_path)
