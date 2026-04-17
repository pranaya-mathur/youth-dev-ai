import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.schemas import AnswerIn

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Local guardrail patterns
# ---------------------------------------------------------------------------
# All patterns are tested with re.search(pat, text, re.I) — one consistent
# strategy throughout.
#
# NOTE: \bcp\b was removed — it causes unacceptable false positives
# (e.g. "cp command", "Capricorn", copy-paste abbreviations) and the
# OpenAI Moderations API handles CSAM detection reliably when a key is
# present. The explicit "child porn" / "childporn" substring check below
# covers the clearest plaintext form without regex.
# ---------------------------------------------------------------------------
_LOCAL_BLOCK_PATTERNS: list[str] = [
    r"\bkill\s+myself\b",
    r"\bkms\b",
    r"\bsuicid\w*\b",
    r"\bend\s+it\s+all\b",
    r"\bself[- ]harm\b",
    r"\bcut\s+myself\b",
    r"\bchild\s+porn\b",
    r"\bcsam\b",
]

_COMBINED_MAX = 8000


def _concat_user_text(nickname: str | None, answers: list[AnswerIn]) -> str:
    parts: list[str] = []
    if nickname and nickname.strip():
        parts.append(nickname.strip())
    for a in answers:
        if a.text and a.text.strip():
            parts.append(a.text.strip())
    return "\n".join(parts)[:_COMBINED_MAX]


async def trigger_crisis_webhook(
    user_id: uuid.UUID | None,
    signal_type: str,
    route: str,
    nickname_present: bool,
) -> None:
    """
    Sends a minimal, PII-free crisis notification to the configured webhook.
    """
    if not settings.crisis_webhook_url:
        return

    payload = {
        "event_type": "crisis_signal_detected",
        "user_id": str(user_id) if user_id else "anonymous",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "route": route,
        "signal_type": signal_type,
        "nickname_present": nickname_present,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(settings.crisis_webhook_url, json=payload)
    except Exception as exc:
        # Silent failure for webhook to avoid blocking user flow
        logger.warning("Crisis webhook failed: %s", exc)


def _local_screen(text: str) -> str | None:
    """Return a user-safe refusal message if local patterns match, else None."""
    lowered = text.lower()

    # Explicit CSAM plaintext check (no regex needed for these fixed strings)
    if "child porn" in lowered or "childporn" in lowered:
        return (
            "This content cannot be processed. "
            "If you or someone else is unsafe, contact local emergency services or a trusted adult."
        )

    # Single consistent strategy: re.search with IGNORECASE
    for pat in _LOCAL_BLOCK_PATTERNS:
        if re.search(pat, lowered, re.I):
            return (
                "Some words suggest you may be going through something heavy. "
                "This space is not for crisis support. Please talk to a trusted adult "
                "or a local helpline. You can continue without sharing that kind of detail in optional notes."
            )

    return None


async def moderate_user_text(
    nickname: str | None,
    answers: list[AnswerIn],
    user_id: uuid.UUID | None = None,
    route: str = "unknown",
) -> None:
    """
    Raises ValueError with a user-safe message if content should not be sent to the model.
    Triggers silent crisis webhook for self-harm signals.
    """
    blob = _concat_user_text(nickname, answers)
    if not blob.strip():
        return

    nickname_present = bool(nickname and nickname.strip())

    if local := _local_screen(blob):
        # Trigger crisis webhook for local patterns
        await trigger_crisis_webhook(
            user_id,
            signal_type="local_pattern_match",
            route=route,
            nickname_present=nickname_present,
        )
        raise ValueError(local)

    if not settings.openai_api_key:
        return

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {"input": blob}
    if settings.openai_moderation_model:
        payload["model"] = settings.openai_moderation_model

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/moderations",
            headers=headers,
            json=payload,
        )
    if r.status_code >= 400:
        raise ValueError("Safety check is temporarily unavailable. Please try again shortly.")

    data = r.json()
    results = data.get("results") or []
    if not results:
        return

    cat = results[0].get("categories") or {}
    self_harm = cat.get("self-harm") or cat.get("self_harm")
    sexual = cat.get("sexual")
    violence = cat.get("violence") or cat.get("violence/graphic")

    if self_harm:
        await trigger_crisis_webhook(
            user_id,
            signal_type="openai_self_harm",
            route=route,
            nickname_present=nickname_present,
        )

    if self_harm or sexual or violence:
        raise ValueError(
            "We cannot process part of what was shared. Please remove detailed "
            "descriptions of harm, sexual content, or graphic violence from optional "
            "notes and try again. If you need help right now, contact a trusted adult or local emergency services."
        )
