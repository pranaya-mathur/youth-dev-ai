import hashlib
from typing import Any

import httpx

from app.config import settings
from app.schemas import CoachChatMessage, CoachRequest, CoachResponse

COACH_SYSTEM = """You are a short, warm strengths-coach chatbot for adolescents (11–18).
Rules:
- Write only in clear, natural standard English (neutral global register). Do not use Hindi, Hinglish, or other languages—even if the user writes in another language; reply in English only.
- Replies under 140 words unless the user explicitly asks for a longer list.
- Strength-based, hopeful, never clinical labels, never diagnosis.
- No sexual content, no instructions for harm, no hate. If the user seems in crisis, gently suggest talking to a trusted adult or local emergency help—once, briefly.
- Ask at most one follow-up question when it helps.
- Keep language age-appropriate: simpler for younger teens, slightly more mature for 17–18.
"""


def _mock_reply(req: CoachRequest) -> str:
    last = ""
    for m in reversed(req.messages):
        if m.role == "user":
            last = m.content.strip().lower()
            break
    h = int(hashlib.sha256(last.encode()).hexdigest()[:8], 16)
    lines = [
        "I hear you. One strength I notice is that you are still trying—that counts more than you think. What is one tiny win from today you could name out loud?",
        "That sounds heavy, and also brave to share. You are not alone in figuring things out. Who is one person you could lean on for five minutes this week?",
        "Thanks for trusting this space with that. You are allowed to grow slowly. What is one kind thing your body or mind needs tonight?",
        "I love that you are thinking about this. Curiosity like yours is a real superpower. What is one next step that would feel almost too easy?",
    ]
    return lines[h % len(lines)]


def _langchain_messages(req: CoachRequest):
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    out: list[Any] = [
        SystemMessage(
            content=COACH_SYSTEM + f"\nUser age band: {req.age_band}. Display name: {req.nickname or 'friend'}."
        )
    ]
    for m in req.messages[-18:]:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content))
    return out


async def _groq_coach(req: CoachRequest) -> str:
    from langchain_groq import ChatGroq

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.75,
    )
    msg = await llm.ainvoke(_langchain_messages(req))
    content = msg.content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            else:
                parts.append(str(block))
        return "".join(parts).strip()
    return str(content).strip()


async def _openai_coach(req: CoachRequest) -> str:
    if not settings.openai_api_key:
        if settings.allow_llm_demo:
            return _mock_reply(req)
        raise ValueError("OPENAI_API_KEY is not set.")

    msgs: list[dict[str, str]] = [
        {
            "role": "system",
            "content": COACH_SYSTEM
            + f"\nUser age band: {req.age_band}. Display name: {req.nickname or 'not given'}.",
        }
    ]
    for m in req.messages[-18:]:
        if m.role in ("user", "assistant"):
            msgs.append({"role": m.role, "content": m.content[:4000]})

    payload = {
        "model": settings.openai_model,
        "temperature": 0.75,
        "messages": msgs,
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
    return str(data["choices"][0]["message"]["content"]).strip()


async def generate_coach_reply(req: CoachRequest) -> CoachResponse:
    provider = settings.effective_llm_provider()
    if provider is None:
        if not settings.allow_llm_demo:
            raise ValueError(
                "No LLM configured. Set GROQ_API_KEY or OPENAI_API_KEY (or ALLOW_LLM_DEMO=true for local mock only)."
            )
        return CoachResponse(reply=_mock_reply(req), demo_mode=True)
    if provider == "groq":
        text = await _groq_coach(req)
        if text and text.strip():
            return CoachResponse(reply=text.strip(), demo_mode=False)
        if settings.allow_llm_demo:
            return CoachResponse(reply=_mock_reply(req), demo_mode=True)
        raise ValueError("Groq returned an empty coach reply.")
    text = await _openai_coach(req)
    if text and text.strip():
        return CoachResponse(reply=text.strip(), demo_mode=False)
    if settings.allow_llm_demo:
        return CoachResponse(reply=_mock_reply(req), demo_mode=True)
    raise ValueError("OpenAI returned an empty coach reply.")


def validate_coach_messages(messages: list[CoachChatMessage]) -> None:
    if not messages:
        raise ValueError("Send at least one chat message.")
    if messages[-1].role != "user":
        raise ValueError("The last message must be from the user.")
