"""
Lumina Backend — Course Generator

Transforms raw Gemini AI output into a fully structured ``CourseModule``
that matches the frontend TypeScript types exactly.
"""

from __future__ import annotations

import logging
from typing import Any

from models.enums import CardCategory
from models.schemas import (
    ConceptNode,
    CourseModule,
    Flashcard,
    QuizQuestion,
)
from utils.helpers import generate_id

logger = logging.getLogger(__name__)

# Valid difficulty labels for quiz questions (must match frontend type)
VALID_DIFFICULTIES = {"Easy", "Medium", "Hard", "Expert"}


# ── Public API ────────────────────────────────────────────────────────────────


def generate_course(
    analysis: dict[str, Any],
    video_title: str,
    duration: float | int | None = None,
    thumbnail_url: str | None = None,
) -> CourseModule:
    """Build a ``CourseModule`` from the parsed Gemini analysis dict.

    Parameters
    ----------
    analysis:
        Parsed JSON from the Gemini service (keys are camelCase).
    video_title:
        Title of the original video.
    duration:
        Video duration in seconds (may be None).
    thumbnail_url:
        Optional thumbnail URL.

    Returns
    -------
    A complete ``CourseModule`` ready for API serialization.
    """
    course_id = generate_id("course")

    # ── Concepts ──────────────────────────────────────────────────────────
    raw_concepts = analysis.get("concepts", [])
    concepts = _build_concepts(raw_concepts)

    # ── Flashcards ────────────────────────────────────────────────────────
    raw_flashcards = analysis.get("flashcards", [])
    flashcards = _build_flashcards(raw_flashcards)

    # ── Quiz questions ────────────────────────────────────────────────────
    raw_quiz = analysis.get("quizQuestions", analysis.get("quiz_questions", []))
    quiz_questions = _build_quiz_questions(raw_quiz)

    # ── Backfill counts on concepts ───────────────────────────────────────
    concepts = _backfill_counts(concepts, flashcards, quiz_questions)

    # ── Metadata ──────────────────────────────────────────────────────────
    title = analysis.get("title", video_title)
    learning_objectives = analysis.get("learningObjectives", analysis.get("learning_objectives", []))

    course = CourseModule(
        id=course_id,
        title=title,
        video_title=analysis.get("videoTitle", video_title),
        concepts=concepts,
        flashcards=flashcards,
        quiz_questions=quiz_questions,
        learning_objectives=learning_objectives,
    )

    logger.info(
        "Course generated: %s — %d concepts, %d flashcards, %d quiz questions",
        course.id,
        len(concepts),
        len(flashcards),
        len(quiz_questions),
    )

    return course


# ── Concept Builder ───────────────────────────────────────────────────────────


def _build_concepts(raw: list[dict[str, Any]]) -> list[ConceptNode]:
    """Validate and convert raw concept dicts to ``ConceptNode`` models."""
    concepts: list[ConceptNode] = []
    for idx, item in enumerate(raw):
        try:
            concept = ConceptNode(
                id=item.get("id", f"c{idx + 1}"),
                title=item.get("title", f"Concept {idx + 1}"),
                description=item.get("description", ""),
                depth=_clamp(item.get("depth", 0), 0, 3),
                parent_id=item.get("parentId", item.get("parent_id")),
                key_points=item.get("keyPoints", item.get("key_points", [])),
                timestamps=item.get("timestamps", []),
                flashcard_count=item.get("flashcardCount", item.get("flashcard_count", 0)),
                quiz_count=item.get("quizCount", item.get("quiz_count", 0)),
            )
            concepts.append(concept)
        except Exception as exc:
            logger.warning("Skipping invalid concept at index %d: %s", idx, exc)

    return concepts


# ── Flashcard Builder ─────────────────────────────────────────────────────────


def _build_flashcards(raw: list[dict[str, Any]]) -> list[Flashcard]:
    """Validate and convert raw flashcard dicts."""
    cards: list[Flashcard] = []
    for idx, item in enumerate(raw):
        try:
            category_raw = item.get("category", "definition")
            try:
                category = CardCategory(category_raw)
            except ValueError:
                category = CardCategory.DEFINITION

            card = Flashcard(
                id=item.get("id", f"f{idx + 1}"),
                concept_id=item.get("conceptId", item.get("concept_id", "c1")),
                front=item.get("front", ""),
                back=item.get("back", ""),
                difficulty=_clamp(item.get("difficulty", 3), 1, 5),
                category=category,
            )

            if card.front and card.back:
                cards.append(card)
        except Exception as exc:
            logger.warning("Skipping invalid flashcard at index %d: %s", idx, exc)

    return cards


# ── Quiz Builder ──────────────────────────────────────────────────────────────


def _build_quiz_questions(raw: list[dict[str, Any]]) -> list[QuizQuestion]:
    """Validate and convert raw quiz question dicts."""
    questions: list[QuizQuestion] = []
    for idx, item in enumerate(raw):
        try:
            options = item.get("options", [])
            if len(options) != 4:
                continue  # must have exactly 4 options

            correct = item.get("correctAnswer", item.get("correct_answer", 0))
            if not isinstance(correct, int) or correct < 0 or correct > 3:
                correct = 0

            # Normalize difficulty to a valid string label
            raw_diff = item.get("difficulty", "Medium")
            difficulty = _normalize_difficulty(raw_diff)

            q = QuizQuestion(
                id=item.get("id", f"q{idx + 1}"),
                concept_id=item.get("conceptId", item.get("concept_id", "c1")),
                question=item.get("question", ""),
                options=options,
                correct_answer=correct,
                explanation=item.get("explanation", ""),
                difficulty=difficulty,
                hint=item.get("hint"),
            )

            if q.question:
                questions.append(q)
        except Exception as exc:
            logger.warning("Skipping invalid quiz question at index %d: %s", idx, exc)

    return questions


# ── Backfill Helpers ──────────────────────────────────────────────────────────


def _backfill_counts(
    concepts: list[ConceptNode],
    flashcards: list[Flashcard],
    quiz_questions: list[QuizQuestion],
) -> list[ConceptNode]:
    """Ensure each concept has accurate flashcardCount and quizCount."""
    flash_counts: dict[str, int] = {}
    quiz_counts: dict[str, int] = {}

    for f in flashcards:
        flash_counts[f.concept_id] = flash_counts.get(f.concept_id, 0) + 1
    for q in quiz_questions:
        quiz_counts[q.concept_id] = quiz_counts.get(q.concept_id, 0) + 1

    for c in concepts:
        c.flashcard_count = flash_counts.get(c.id, 0)
        c.quiz_count = quiz_counts.get(c.id, 0)

    return concepts


def _normalize_difficulty(raw: Any) -> str:
    """Convert a raw difficulty value to one of 'Easy', 'Medium', 'Hard', 'Expert'.

    Accepts strings (case-insensitive) or integers (1-5).
    """
    if isinstance(raw, str):
        # Try direct match
        cap = raw.strip().capitalize()
        if cap in VALID_DIFFICULTIES:
            return cap
        # Fallback
        return "Medium"

    if isinstance(raw, (int, float)):
        v = int(raw)
        if v <= 1:
            return "Easy"
        if v <= 2:
            return "Medium"
        if v <= 3:
            return "Hard"
        return "Expert"

    return "Medium"


# ── Misc Helpers ──────────────────────────────────────────────────────────────


def _clamp(value: Any, lo: int, hi: int) -> int:
    """Clamp an integer value to [lo, hi]."""
    try:
        v = int(value)
    except (TypeError, ValueError):
        return lo
    return max(lo, min(hi, v))
