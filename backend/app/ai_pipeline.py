import hashlib
import json
import re
from typing import Any

import httpx

from app.config import settings
from app.schemas import AnswerIn, ProfileRequest, ProfileResponse

SYSTEM_PROMPT = """You are the unified engine for a youth wellbeing app (ages 11–18).
You ONLY output valid JSON matching the user's schema. No markdown, no extra keys.

Language (strict):
- Write every string value in clear, natural standard English only (neutral global register).
- Do not use Hindi, Hinglish, other languages, or mixed-language sentences—even if the user's notes might.

Rules:
- Strengths: exactly 4 or 5 single-word or short-phrase POSITIVE adjectives (power indicators), grounded in their answers.
- identity_name: exactly 2 or 3 words, symbolic and empowering (not clinical labels).
- narrative: 2 short paragraphs (under 180 words total), warm, specific to their scenarios, never preachy.
- micro_action: one tiny, doable action within 24 hours.
- reflection_prompt: one open question they can journal or think about.
- Age-adaptive tone: younger bands = simpler words; older = slightly more mature vocabulary.
- Never shame, diagnose, or use negative framing. No mention of disorders. If answers hint at crisis, still stay strengths-based and suggest talking to a trusted adult—briefly, once, inside narrative only if clearly relevant.
- Be specific: reference patterns from their answers (friendship, school, creativity, courage, etc.) without quoting long text.
"""


def _answers_blob(answers: list[AnswerIn]) -> str:
    lines = []
    for a in answers:
        parts = [f"id={a.question_id}"]
        if a.mcq_id:
            parts.append(f"choice={a.mcq_id}")
        if a.text and a.text.strip():
            parts.append(f"note={a.text.strip()[:400]}")
        lines.append(" | ".join(parts))
    return "\n".join(lines)


def _user_prompt(req: ProfileRequest) -> str:
    return (
        f"age_band: {req.age_band}\n"
        f"nickname: {req.nickname or 'not given'}\n\n"
        "answers:\n"
        f"{_answers_blob(req.answers)}\n\n"
        "Return JSON with keys: strengths (array of 4-5 strings), identity_name (string), "
        "narrative (string), micro_action (string), reflection_prompt (string)."
    )


def _mock_profile(req: ProfileRequest) -> ProfileResponse:
    h = int(hashlib.sha256(_answers_blob(req.answers).encode()).hexdigest()[:8], 16)
    pool = [
        "Curious",
        "Loyal",
        "Brave",
        "Kind",
        "Creative",
        "Thoughtful",
        "Resilient",
        "Hopeful",
        "Playful",
        "Steady",
        "Bright",
        "Warm",
    ]
    strengths = [pool[(h + i) % len(pool)] for i in range(5)]
    identities = [
        "Quiet Starlight",
        "River of Courage",
        "Open Sky Heart",
        "Small Step Hero",
        "Story Spark Mind",
    ]
    name = req.nickname or "friend"
    identity = identities[h % len(identities)]
    narrative = (
        f"Hey {name}, the way you move through everyday moments shows real depth. "
        f"Your answers paint someone who notices others and keeps trying—even when things feel fuzzy.\n\n"
        "That mix of care and courage is rare. You do not have to have everything figured out; "
        "what matters is that you are building a kind relationship with yourself as you grow."
    )
    micro = "Send one honest compliment to someone you trust—or write three things you handled okay this week."
    reflection = "When did you last feel proud of yourself for something small that no one else saw?"
    return ProfileResponse(
        strengths=strengths,
        identity_name=identity,
        narrative=narrative,
        micro_action=micro,
        reflection_prompt=reflection,
        demo_mode=True,
    )


def _extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("Model did not return parseable JSON")
    return json.loads(m.group(0))


def _profile_response_from_obj(obj: dict[str, Any]) -> ProfileResponse:
    strengths = obj.get("strengths") or []
    if not isinstance(strengths, list):
        raise ValueError("Invalid strengths")
    strengths = [str(s).strip() for s in strengths if str(s).strip()]
    if len(strengths) < 4:
        strengths = (strengths + ["Hopeful", "Brave", "Kind", "Curious"])[:5]
    strengths = strengths[:5]
    return ProfileResponse(
        strengths=strengths[:5],
        identity_name=str(obj.get("identity_name", "Growing Light")).strip()[:80],
        narrative=str(obj.get("narrative", "")).strip(),
        micro_action=str(obj.get("micro_action", "")).strip(),
        reflection_prompt=str(obj.get("reflection_prompt", "")).strip(),
        demo_mode=False,
    )


async def _generate_openai_http(req: ProfileRequest) -> ProfileResponse:
    if not settings.openai_api_key:
        if settings.allow_llm_demo:
            return _mock_profile(req)
        raise ValueError("OPENAI_API_KEY is not set. Add a key or set ALLOW_LLM_DEMO=true for offline demo only.")

    user_content = _user_prompt(req)
    payload = {
        "model": settings.openai_model,
        "temperature": 0.85,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
        )
    if r.status_code >= 400:
        raise ValueError(f"OpenAI error: {r.status_code} {r.text[:500]}")
    data = r.json()
    content = data["choices"][0]["message"]["content"]
    obj = _extract_json_object(content)
    return _profile_response_from_obj(obj)


async def _generate_groq_langchain(req: ProfileRequest) -> ProfileResponse:
    """Groq via LangChain `ChatGroq` (OpenAI-compatible JSON mode when supported)."""
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_groq import ChatGroq

    if not settings.groq_api_key:
        if settings.allow_llm_demo:
            return _mock_profile(req)
        raise ValueError("GROQ_API_KEY is not set. Add a key or set ALLOW_LLM_DEMO=true for offline demo only.")

    user_content = _user_prompt(req)

    async def _ainvoke(with_json: bool) -> str:
        kwargs: dict[str, Any] = {
            "api_key": settings.groq_api_key,
            "model": settings.groq_model,
            "temperature": 0.85,
        }
        if with_json:
            kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
        llm = ChatGroq(**kwargs)
        msg = await llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_content),
            ]
        )
        content = msg.content
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(str(block.get("text", "")))
                else:
                    parts.append(str(block))
            return "".join(parts)
        return str(content)

    try:
        text = await _ainvoke(with_json=True)
    except Exception:
        text = await _ainvoke(with_json=False)

    obj = _extract_json_object(text)
    return _profile_response_from_obj(obj)


async def generate_profile(req: ProfileRequest) -> ProfileResponse:
    provider = settings.effective_llm_provider()
    if provider is None:
        if not settings.allow_llm_demo:
            raise ValueError(
                "No LLM configured. Set GROQ_API_KEY or OPENAI_API_KEY in backend/.env "
                "(or ALLOW_LLM_DEMO=true only for local mock responses)."
            )
        return _mock_profile(req)
    if provider == "groq":
        return await _generate_groq_langchain(req)
    return await _generate_openai_http(req)
