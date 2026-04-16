import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.schemas import AnswerIn

# Conservative local guardrails when the Moderations API is unavailable (demo / no key).
_LOCAL_BLOCK_PATTERNS = [
    r"\bkill\s+myself\b",
    r"\bkms\b",
    r"\bsuicid\w*\b",
    r"\bend\s+it\s+all\b",
    r"\bself[- ]harm\b",
    r"\bcut\s+myself\b",
    r"\bchild\s+porn\b",
    r"\bcp\b",  # risky false positive; only used with other signals—skip standalone \bcp\b
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
    except Exception as e:
        # Silent failure for webhook to avoid blocking user flow
        print(f"Crisis webhook failed: {e}")


def _local_screen(text: str) -> str | None:
    lowered = text.lower()
    if "child porn" in lowered or "childporn" in lowered:
        return "This content cannot be processed. If you or someone else is unsafe, contact local emergency services or a trusted adult."
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
