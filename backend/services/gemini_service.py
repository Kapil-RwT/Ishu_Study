"""
Lumina Backend — Gemini AI Service

Integrates with the Google Gemini 2.0 Flash model for video / transcript
analysis.  Handles file upload, polling, mega-prompt construction, and
robust JSON parsing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any, Optional

import google.generativeai as genai

from config import get_settings
from utils.exceptions import GeminiAnalysisError

logger = logging.getLogger(__name__)

# ── Prompt ────────────────────────────────────────────────────────────────────

ANALYSIS_PROMPT = """You are an expert educational content analyzer. Analyze the provided lecture video and generate a comprehensive, structured study module in JSON format.

IMPORTANT: Return ONLY a valid JSON object. Do not include any markdown formatting, code fences, or explanatory text outside the JSON.

The JSON object must have these exact keys (use camelCase as shown):

{
  "title": "A concise, engaging course title",
  "videoTitle": "Original video title",
  "learningObjectives": ["objective 1", "objective 2", "..."],
  "concepts": [
    {
      "id": "c1",
      "title": "Concept Title",
      "description": "Clear, thorough explanation of this concept (2-3 sentences)",
      "depth": 0,
      "parentId": null,
      "keyPoints": ["point 1", "point 2", "point 3"],
      "timestamps": ["0:00 - 2:30"],
      "flashcardCount": 3,
      "quizCount": 2
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "conceptId": "c1",
      "front": "Question or term on the front of the card",
      "back": "Detailed answer or definition on the back",
      "difficulty": 3,
      "category": "definition"
    }
  ],
  "quizQuestions": [
    {
      "id": "q1",
      "conceptId": "c1",
      "question": "Clear, specific question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Clear explanation of why this answer is correct",
      "difficulty": "Medium",
      "hint": "Optional helpful hint"
    }
  ]
}

RULES:
1. Generate 6-10 concepts organized in a hierarchical tree:
   - Depth 0: 1-2 root/overarching themes
   - Depth 1: 2-4 main topics (parentId = a depth-0 concept id)
   - Depth 2: 2-4 sub-topics (parentId = a depth-1 concept id)
2. Generate 12-18 flashcards distributed across concepts
   - Categories MUST be one of: definition, example, comparison, application, mnemonic
   - Difficulty 1-5 (1 = basic recall, 5 = deep synthesis)
3. Generate 8-12 quiz questions with exactly 4 options each
   - correctAnswer is an integer 0-3 (index of the correct option)
   - difficulty MUST be one of: "Easy", "Medium", "Hard", "Expert"
   - Include helpful hints for harder questions
4. Each concept must list the timestamps (as "M:SS - M:SS" strings) where it appears in the video
5. Each concept must include flashcardCount and quizCount showing how many flashcards/quiz questions are linked to it
6. All parentId references must use valid concept IDs from the list
7. Make flashcards genuinely useful for studying — not trivial or vague
8. Quiz questions should test real understanding, not just memorization
9. Use short concept IDs like "c1", "c2", flashcard IDs like "f1", "f2", quiz IDs like "q1", "q2"
10. BE CONCISE - focus on quality over quantity for faster generation

Analyze the content thoroughly and generate the study module now."""


# ── Public API ────────────────────────────────────────────────────────────────


def _configure_client() -> None:
    """Configure the Gemini SDK with the API key."""
    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)


async def analyze_video_file(file_path: str) -> dict[str, Any]:
    """Upload a video file to Gemini, analyze it, and return parsed JSON.

    Steps
    -----
    1. Upload the file via ``genai.upload_file``.
    2. Poll until the file state is ``ACTIVE``.
    3. Send the file + mega-prompt to Gemini 2.0 Flash.
    4. Parse the response as JSON.
    5. Delete the uploaded file from Gemini.
    """
    _configure_client()

    video_file = Path(file_path)
    if not video_file.exists():
        raise GeminiAnalysisError(f"Video file not found: {file_path}")

    logger.info("Uploading %s (%.1f MB) to Gemini...", video_file.name, video_file.stat().st_size / 1024 / 1024)

    # ① Upload
    try:
        uploaded = genai.upload_file(str(video_file), mime_type=_guess_mime(video_file))
    except Exception as exc:
        raise GeminiAnalysisError(f"File upload failed: {exc}") from exc

    # ② Poll for ACTIVE
    try:
        uploaded = await _wait_for_active(uploaded)
    except Exception as exc:
        _safe_delete(uploaded)
        raise GeminiAnalysisError(f"File processing failed: {exc}") from exc

    # ③ Analyze
    try:
        result = await _send_analysis_request(uploaded)
    except Exception as exc:
        _safe_delete(uploaded)
        raise GeminiAnalysisError(f"Analysis request failed: {exc}") from exc

    # ④ Parse
    parsed = _parse_json_response(result)

    # ⑤ Cleanup
    _safe_delete(uploaded)

    return parsed


async def analyze_with_transcript(transcript: str, video_info: dict[str, Any]) -> dict[str, Any]:
    """Fallback: analyze a lecture using only its transcript text.

    Used when the video file is too large for direct upload.
    """
    _configure_client()

    context_header = (
        f"VIDEO TITLE: {video_info.get('title', 'Unknown')}\n"
        f"DURATION: {video_info.get('duration', 'Unknown')} seconds\n"
        f"CHANNEL: {video_info.get('channel', 'Unknown')}\n\n"
        f"TRANSCRIPT:\n{transcript}\n\n"
    )

    full_prompt = context_header + ANALYSIS_PROMPT

    model = genai.GenerativeModel("gemini-3.1-flash-lite")

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=16384,
                ),
                request_options={"timeout": 600}  # 10 minute timeout
            )
        )
    except Exception as exc:
        raise GeminiAnalysisError(f"Transcript analysis failed: {exc}") from exc

    if not response or not response.text:
        raise GeminiAnalysisError("Gemini returned an empty response for transcript analysis")

    return _parse_json_response(response.text)


# ── Internal Helpers ──────────────────────────────────────────────────────────


def _guess_mime(path: Path) -> str:
    """Return MIME type based on file extension."""
    mapping = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
        ".mpeg": "video/mpeg",
        ".mpg": "video/mpeg",
    }
    return mapping.get(path.suffix.lower(), "video/mp4")


async def _wait_for_active(uploaded_file: Any, timeout: int = 300, poll_interval: int = 3) -> Any:
    """Poll the uploaded file until its state is ACTIVE or timeout."""
    import time
    start = time.time()
    while True:
        # Run blocking genai.get_file in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        file_info = await loop.run_in_executor(None, genai.get_file, uploaded_file.name)
        state = str(file_info.state).upper()

        if "ACTIVE" in state:
            logger.info("File %s is ACTIVE", uploaded_file.name)
            return file_info

        if "FAILED" in state:
            raise GeminiAnalysisError(f"File processing failed with state: {state}")

        elapsed = time.time() - start
        if elapsed > timeout:
            raise GeminiAnalysisError(f"File processing timed out after {timeout}s (state={state})")

        logger.debug("File state: %s — waiting %ds...", state, poll_interval)
        await asyncio.sleep(poll_interval)


async def _send_analysis_request(uploaded_file: Any) -> str:
    """Send the uploaded file and prompt to Gemini, return the raw response text."""
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Run blocking generate_content in thread pool
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: model.generate_content(
            [uploaded_file, ANALYSIS_PROMPT],
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=16384,
            ),
            request_options={"timeout": 600}  # 10 minute timeout
        )
    )

    if not response or not response.text:
        raise GeminiAnalysisError("Gemini returned an empty response")

    return response.text


def _parse_json_response(raw_text: str) -> dict[str, Any]:
    """Robustly parse JSON from Gemini's response.

    Strategies (tried in order):
    1. Direct ``json.loads``.
    2. Strip markdown code fences and retry.
    3. Regex extraction of the first ``{...}`` block.
    """
    logger.debug("Parsing JSON response (length: %d chars)", len(raw_text))
    
    # Strategy 1: direct parse
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.debug("Strategy 1 failed: %s", e)

    # Strategy 2: strip markdown code fences (including ```json, ```javascript, etc.)
    stripped = raw_text.strip()
    if stripped.startswith("```"):
        logger.debug("Found code fence, stripping...")
        lines = stripped.splitlines()
        # Remove first line if it's a code fence (with or without language tag)
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # Remove last line if it's a closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
        logger.debug("Stripped text (first 200 chars): %s", stripped[:200])
        try:
            result = json.loads(stripped)
            logger.info("Successfully parsed JSON after stripping code fences")
            return result
        except json.JSONDecodeError as e:
            logger.debug("Strategy 2 failed: %s", e)

    # Strategy 3: regex — grab the outermost { ... }
    match = re.search(r"\{[\s\S]*\}", raw_text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Strategy 4: try to repair truncated JSON
    logger.debug("Attempting truncated JSON repair...")
    json_text = raw_text.strip()
    # Strip code fences if present
    if json_text.startswith("```"):
        lines = json_text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        json_text = "\n".join(lines).strip()
    
    # Find the start of JSON
    brace_idx = json_text.find("{")
    if brace_idx >= 0:
        json_text = json_text[brace_idx:]
        # Try to repair by closing open brackets/braces
        repaired = _repair_truncated_json(json_text)
        if repaired:
            try:
                result = json.loads(repaired)
                logger.info("Successfully parsed repaired truncated JSON")
                return result
            except json.JSONDecodeError as e:
                logger.debug("Repair attempt failed: %s", e)

    # Strategy 5: try to find JSON array for partial rescue
    match_arr = re.search(r"\[[\s\S]*\]", raw_text)
    if match_arr:
        try:
            data = json.loads(match_arr.group(0))
            return {"concepts": data}
        except json.JSONDecodeError:
            pass

    raise GeminiAnalysisError(
        f"Failed to parse JSON from Gemini response. First 300 chars: {raw_text[:300]}"
    )


def _repair_truncated_json(text: str) -> Optional[str]:
    """Attempt to repair truncated JSON by closing open brackets and braces."""
    # Track open brackets/braces (ignoring those inside strings)
    in_string = False
    escape_next = False
    open_stack: list[str] = []
    
    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            open_stack.append(ch)
        elif ch == '}':
            if open_stack and open_stack[-1] == '{':
                open_stack.pop()
        elif ch == ']':
            if open_stack and open_stack[-1] == '[':
                open_stack.pop()
    
    if not open_stack:
        return text  # Already balanced
    
    # Remove any trailing partial value (e.g. truncated string or number)
    # Find the last complete value separator
    trimmed = text.rstrip()
    # Remove trailing incomplete string
    if trimmed and trimmed[-1] not in ('}', ']', '"', 'e', 'l', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'):
        # Find last comma, colon, or bracket
        for i in range(len(trimmed) - 1, -1, -1):
            if trimmed[i] in (',', ':', '{', '[', '}', ']', '"'):
                trimmed = trimmed[:i + 1]
                break
    
    # Remove trailing comma if present
    trimmed = trimmed.rstrip().rstrip(',')
    
    # Close all open brackets/braces in reverse order
    closing = {'[': ']', '{': '}'}
    for bracket in reversed(open_stack):
        trimmed += closing.get(bracket, '')
    
    return trimmed


def _safe_delete(uploaded_file: Any) -> None:
    """Delete the uploaded file from Gemini, ignoring errors."""
    try:
        genai.delete_file(uploaded_file.name)
        logger.info("Deleted uploaded file: %s", uploaded_file.name)
    except Exception as exc:
        logger.warning("Failed to delete uploaded file %s: %s", uploaded_file.name, exc)
