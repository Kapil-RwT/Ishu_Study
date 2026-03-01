"""
Lumina Backend — YouTube Service

Download videos, extract metadata, and pull transcripts using yt-dlp
via async subprocesses to avoid blocking the event loop.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Optional

from config import get_settings
from utils.exceptions import YouTubeDownloadError
from utils.helpers import sanitize_filename

logger = logging.getLogger(__name__)


async def _run_ytdlp(args: list[str], timeout: int = 600) -> tuple[str, str, int]:
    """Run a yt-dlp command as an async subprocess.

    Returns (stdout, stderr, returncode).
    """
    cmd = [sys.executable, "-m", "yt_dlp", *args]
    logger.info("Running: %s", " ".join(cmd))

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        raise YouTubeDownloadError("yt-dlp command timed out")

    stdout = stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""
    stderr = stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
    return stdout, stderr, proc.returncode or 0


async def get_video_info(url: str) -> dict[str, Any]:
    """Fetch metadata for a YouTube video without downloading it.

    Returns a dict with keys: title, duration, description, thumbnail,
    upload_date, view_count, channel.
    """
    args = [
        "--dump-json",
        "--no-download",
        "--no-warnings",
        url,
    ]
    stdout, stderr, rc = await _run_ytdlp(args, timeout=60)
    if rc != 0:
        raise YouTubeDownloadError(f"Failed to get video info: {stderr.strip()}")

    try:
        info = json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise YouTubeDownloadError(f"Failed to parse video info JSON: {exc}") from exc

    return {
        "title": info.get("title", "Untitled"),
        "duration": info.get("duration"),
        "description": info.get("description", ""),
        "thumbnail": info.get("thumbnail", ""),
        "upload_date": info.get("upload_date", ""),
        "view_count": info.get("view_count"),
        "channel": info.get("channel", ""),
    }


async def download_video(url: str, job_id: str) -> dict[str, Any]:
    """Download a YouTube video at low quality (smallest MP4) for AI processing.

    Returns a dict with: file_path, title, duration, description, thumbnail.
    """
    settings = get_settings()
    output_dir = settings.upload_path / job_id
    output_dir.mkdir(parents=True, exist_ok=True)

    output_template = str(output_dir / "%(title)s.%(ext)s")

    args = [
        "-f", "worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worstvideo+worstaudio/worst/b",
        "--merge-output-format", "mp4",
        "-o", output_template,
        "--no-playlist",
        "--no-warnings",
        "--restrict-filenames",
        url,
    ]

    stdout, stderr, rc = await _run_ytdlp(args, timeout=600)
    if rc != 0:
        raise YouTubeDownloadError(f"Download failed: {stderr.strip()}")

    # Find the downloaded file
    downloaded_files = list(output_dir.glob("*.mp4"))
    if not downloaded_files:
        # Try any video file
        downloaded_files = list(output_dir.glob("*.*"))
        downloaded_files = [f for f in downloaded_files if f.suffix.lower() in {".mp4", ".webm", ".mkv", ".mov"}]

    if not downloaded_files:
        raise YouTubeDownloadError("Download appeared to succeed but no video file found")

    file_path = downloaded_files[0]

    # Fetch metadata
    info = await get_video_info(url)

    return {
        "file_path": str(file_path),
        "title": info.get("title", file_path.stem),
        "duration": info.get("duration"),
        "description": info.get("description", ""),
        "thumbnail": info.get("thumbnail", ""),
    }


async def get_transcript(url: str) -> Optional[str]:
    """Extract subtitles / auto-captions for a YouTube video.

    Returns the transcript as plain text, or None if unavailable.
    """
    settings = get_settings()
    output_dir = settings.upload_path / "transcripts"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_template = str(output_dir / "transcript")

    args = [
        "--write-auto-sub",
        "--write-sub",
        "--sub-lang", "en",
        "--sub-format", "vtt",
        "--skip-download",
        "-o", output_template,
        "--no-warnings",
        url,
    ]

    stdout, stderr, rc = await _run_ytdlp(args, timeout=120)

    # Look for subtitle files
    sub_files = list(output_dir.glob("transcript*.vtt")) + list(output_dir.glob("transcript*.srt"))
    if not sub_files:
        logger.warning("No transcript found for %s", url)
        return None

    sub_file = sub_files[0]
    raw_text = sub_file.read_text(encoding="utf-8", errors="replace")

    # Clean up the file after reading
    for f in sub_files:
        try:
            f.unlink()
        except OSError:
            pass

    # Parse VTT / SRT → plain text with timestamps
    return _parse_subtitle_text(raw_text)


def _parse_subtitle_text(raw: str) -> str:
    """Convert VTT/SRT subtitle content to clean timestamped text."""
    lines = raw.strip().splitlines()
    result_lines: list[str] = []
    current_timestamp = ""
    seen_text: set[str] = set()

    for line in lines:
        line = line.strip()

        # Skip VTT header and blank lines
        if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue

        # Detect timestamp lines (e.g. "00:00:01.000 --> 00:00:04.000")
        if "-->" in line:
            current_timestamp = line.split("-->")[0].strip()
            continue

        # Skip numeric-only lines (SRT sequence numbers)
        if line.isdigit():
            continue

        # Remove HTML-like tags
        import re
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if not clean:
            continue

        # Deduplicate (VTT often repeats lines)
        if clean in seen_text:
            continue
        seen_text.add(clean)

        if current_timestamp:
            result_lines.append(f"[{current_timestamp}] {clean}")
        else:
            result_lines.append(clean)

    return "\n".join(result_lines)
