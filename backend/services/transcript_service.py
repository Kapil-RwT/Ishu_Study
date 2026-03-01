"""
Lumina Backend — Transcript Service

Fallback service for when video files are too large (>200 MB) for direct
Gemini upload.  Extracts and formats transcripts for AI analysis.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from services.youtube_service import get_transcript as yt_get_transcript

logger = logging.getLogger(__name__)


async def extract_transcript(url: str) -> Optional[str]:
    """Extract a transcript from a YouTube video URL.

    Tries auto-generated captions first, then manual captions.
    Returns formatted text or None.
    """
    logger.info("Extracting transcript for %s", url)
    transcript = await yt_get_transcript(url)

    if transcript:
        logger.info("Transcript extracted (%d chars)", len(transcript))
    else:
        logger.warning("No transcript available for %s", url)

    return transcript


def format_transcript_for_analysis(
    transcript: str,
    video_info: dict[str, Any],
) -> str:
    """Build a prompt-ready string with metadata + transcript.

    Parameters
    ----------
    transcript:
        The raw timestamped transcript text.
    video_info:
        Metadata dict (title, duration, description, channel, ...).

    Returns
    -------
    A nicely formatted string suitable for the Gemini analysis prompt.
    """
    title = video_info.get("title", "Unknown")
    duration = video_info.get("duration")
    description = video_info.get("description", "")
    channel = video_info.get("channel", "")

    duration_str = _seconds_to_hms(duration) if duration else "Unknown"

    parts = [
        "=== VIDEO INFORMATION ===",
        f"Title: {title}",
        f"Channel: {channel}",
        f"Duration: {duration_str}",
    ]

    if description:
        # Limit description length to avoid prompt bloat
        desc_trimmed = description[:1500]
        if len(description) > 1500:
            desc_trimmed += "..."
        parts.append(f"Description: {desc_trimmed}")

    parts.append("")
    parts.append("=== TRANSCRIPT ===")
    parts.append(transcript)

    return "\n".join(parts)


def _seconds_to_hms(seconds: float | int | None) -> str:
    """Convert seconds to HH:MM:SS string."""
    if seconds is None:
        return "Unknown"
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"
