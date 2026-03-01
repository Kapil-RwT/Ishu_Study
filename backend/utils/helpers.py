"""
Lumina Backend — Utility Helpers

Pure utility functions with no side-effects (except generate_id).
"""

from __future__ import annotations

import re
import uuid


def generate_id(prefix: str = "job") -> str:
    """Generate a unique identifier with an optional prefix.

    Examples
    -------
    >>> generate_id("job")   # "job_a1b2c3d4"
    >>> generate_id("card")  # "card_e5f6a7b8"
    """
    short = uuid.uuid4().hex[:8]
    return f"{prefix}_{short}"


def sanitize_filename(filename: str) -> str:
    """Strip unsafe characters from a filename, keeping extensions intact.

    >>> sanitize_filename("My Lec!ture (2024).mp4")
    'My_Lecture_2024.mp4'
    """
    name_part, _, ext = filename.rpartition(".")
    if not name_part:
        name_part = filename
        ext = ""

    # Replace anything that isn't alphanumeric, dash, or underscore
    cleaned = re.sub(r"[^\w\-]", "_", name_part)
    # Collapse consecutive underscores
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")

    if ext:
        return f"{cleaned}.{ext}"
    return cleaned


def format_duration(seconds: float | int | None) -> str:
    """Convert seconds to a human-readable duration string.

    >>> format_duration(3661)
    '1h 1m 1s'
    >>> format_duration(45)
    '45s'
    >>> format_duration(None)
    'Unknown'
    """
    if seconds is None or seconds < 0:
        return "Unknown"

    total = int(seconds)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)

    parts: list[str] = []
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if secs or not parts:
        parts.append(f"{secs}s")

    return " ".join(parts)


def is_valid_youtube_url(url: str) -> bool:
    """Return True if *url* looks like a valid YouTube video URL.

    Supports:
    - https://www.youtube.com/watch?v=XXXXXXXXXXX
    - https://youtu.be/XXXXXXXXXXX
    - https://www.youtube.com/embed/XXXXXXXXXXX
    - https://www.youtube.com/v/XXXXXXXXXXX
    - https://www.youtube.com/shorts/XXXXXXXXXXX
    """
    pattern = re.compile(
        r"^(https?://)?(www\.)?"
        r"(youtube\.com/(watch\?v=|embed/|v/|shorts/)|youtu\.be/)"
        r"[\w\-]{11}"
    )
    return bool(pattern.search(url.strip()))
