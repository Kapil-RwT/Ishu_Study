"""
Lumina Backend — Pydantic v2 Schemas

Every request / response / internal data model lives here.
All models serialize to camelCase to match the Next.js frontend.
"""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from models.enums import CardCategory, ProcessingStatus


def _to_camel(name: str) -> str:
    """Convert a snake_case string to camelCase."""
    parts = name.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CamelModel(BaseModel):
    """Base model that serializes field names to camelCase."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=_to_camel,
    )


# ── Request Models ────────────────────────────────────────────────────────────


class YouTubeRequest(CamelModel):
    """Incoming request to process a YouTube video."""

    url: str = Field(..., description="YouTube video URL")

    @field_validator("url")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        pattern = re.compile(
            r"^(https?://)?(m\.|www\.)?"
            r"(youtube\.com/(watch\?v=|embed/|v/|shorts/|live/)|youtu\.be/)"
            r"[\w\-]{11}"
        )
        if not pattern.search(v.strip()):
            raise ValueError("Invalid YouTube URL")
        return v.strip()


class FileUploadResponse(CamelModel):
    """Response after a successful file upload."""

    job_id: str
    filename: str
    size_bytes: int
    message: str = "File uploaded successfully. Processing started."


# ── Content Models ────────────────────────────────────────────────────────────


class ConceptNode(CamelModel):
    """A single concept in the knowledge skill tree.

    Shape matches the frontend ``Concept`` interface.
    """

    id: str
    title: str
    description: str
    depth: int = Field(..., ge=0, le=3, description="Tree depth 0-3")
    parent_id: Optional[str] = None
    key_points: list[str] = Field(default_factory=list)
    timestamps: list[str] = Field(default_factory=list)
    flashcard_count: int = Field(default=0)
    quiz_count: int = Field(default=0)


class Flashcard(CamelModel):
    """A single flashcard linked to a concept."""

    id: str
    concept_id: str
    front: str
    back: str
    difficulty: int = Field(..., ge=1, le=5)
    category: CardCategory


class QuizQuestion(CamelModel):
    """A quiz question with four options."""

    id: str
    concept_id: str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_answer: int = Field(..., ge=0, le=3)
    explanation: str
    difficulty: str = Field(..., description="Easy, Medium, Hard, or Expert")
    hint: Optional[str] = None


# ── Course Model ──────────────────────────────────────────────────────────────


class CourseModule(CamelModel):
    """The fully generated course module — the main output of the pipeline."""

    id: str
    title: str
    video_title: str
    video_url: Optional[str] = None
    concepts: list[ConceptNode] = Field(default_factory=list)
    flashcards: list[Flashcard] = Field(default_factory=list)
    quiz_questions: list[QuizQuestion] = Field(default_factory=list)
    learning_objectives: list[str] = Field(default_factory=list)


# ── API Response Models ───────────────────────────────────────────────────────


class ProcessingResponse(CamelModel):
    """Returned immediately after a processing job is queued."""

    job_id: str
    status: ProcessingStatus
    message: str = "Processing started"
    progress: int = Field(default=0, ge=0, le=100)


class CourseResponse(CamelModel):
    """Full course result for a completed (or in-progress) job."""

    job_id: str
    status: ProcessingStatus
    course: Optional[CourseModule] = None
    error: Optional[str] = None


class ProgressResponse(CamelModel):
    """Detailed progress information for a running job."""

    job_id: str
    status: ProcessingStatus
    progress: int = Field(default=0, ge=0, le=100)
    message: str = ""
    video_title: Optional[str] = None
    current_step: str = ""
    steps_completed: int = 0
    total_steps: int = 5
