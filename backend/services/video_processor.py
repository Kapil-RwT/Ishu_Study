"""
Lumina Backend — Video Processor

FFmpeg audio extraction, file management, and cleanup utilities.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
from pathlib import Path
from typing import Optional

from config import get_settings

logger = logging.getLogger(__name__)


async def extract_audio(video_path: str, output_format: str = "mp3") -> Optional[str]:
    """Extract the audio track from a video file using FFmpeg.

    Parameters
    ----------
    video_path:
        Absolute path to the source video file.
    output_format:
        Target audio format (default ``mp3``).

    Returns
    -------
    Path to the extracted audio file, or None on failure.
    """
    src = Path(video_path)
    if not src.exists():
        logger.error("Video file not found: %s", video_path)
        return None

    audio_path = src.with_suffix(f".{output_format}")

    cmd = [
        "ffmpeg",
        "-i", str(src),
        "-vn",                 # no video
        "-acodec", "libmp3lame" if output_format == "mp3" else "aac",
        "-ab", "128k",
        "-ar", "44100",
        "-y",                  # overwrite
        str(audio_path),
    ]

    logger.info("Extracting audio: %s → %s", src.name, audio_path.name)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        _stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        logger.error("FFmpeg timed out for %s", video_path)
        return None

    if proc.returncode != 0:
        err = stderr.decode("utf-8", errors="replace") if stderr else ""
        logger.error("FFmpeg failed (rc=%d): %s", proc.returncode, err[:500])
        return None

    if not audio_path.exists():
        logger.error("Audio extraction produced no output file")
        return None

    logger.info("Audio extracted: %s (%.1f MB)", audio_path.name, audio_path.stat().st_size / 1024 / 1024)
    return str(audio_path)


def get_file_size_mb(file_path: str) -> float:
    """Return the file size in megabytes."""
    try:
        return os.path.getsize(file_path) / (1024 * 1024)
    except OSError:
        return 0.0


def cleanup_job_files(job_id: str) -> None:
    """Remove all files associated with a processing job."""
    settings = get_settings()
    job_dir = settings.upload_path / job_id

    if job_dir.exists():
        try:
            shutil.rmtree(job_dir)
            logger.info("Cleaned up job directory: %s", job_dir)
        except OSError as exc:
            logger.warning("Failed to clean up %s: %s", job_dir, exc)


def cleanup_file(file_path: str) -> None:
    """Remove a single file if it exists."""
    try:
        p = Path(file_path)
        if p.exists():
            p.unlink()
            logger.debug("Cleaned up file: %s", file_path)
    except OSError as exc:
        logger.warning("Failed to remove file %s: %s", file_path, exc)


async def get_video_duration_ffprobe(video_path: str) -> Optional[float]:
    """Use ffprobe to get video duration in seconds.

    Returns None if ffprobe is not available or fails.
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        if proc.returncode == 0 and stdout:
            return float(stdout.decode().strip())
    except (asyncio.TimeoutError, ValueError, FileNotFoundError):
        pass

    return None


def ensure_upload_dir() -> Path:
    """Ensure the upload directory exists and return its path."""
    settings = get_settings()
    path = settings.upload_path
    path.mkdir(parents=True, exist_ok=True)
    return path
