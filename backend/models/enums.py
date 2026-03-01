"""
Lumina Backend — Enumeration Types
"""

from __future__ import annotations

from enum import Enum


class ProcessingStatus(str, Enum):
    """Status of a video-processing job."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class CardCategory(str, Enum):
    """Category of a flashcard."""

    DEFINITION = "definition"
    EXAMPLE = "example"
    COMPARISON = "comparison"
    APPLICATION = "application"
    MNEMONIC = "mnemonic"
