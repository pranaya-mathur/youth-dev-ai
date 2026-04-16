"""In-app assistant: Youth Dev product help, no consent or age required."""

import hashlib
from typing import Any

import httpx

from app.config import settings
from app.schemas import CoachChatMessage, CoachResponse

APP_HELP_SYSTEM = """You are the built-in assistant for Youth Dev, a strengths-first web experience for young people (about 11–18) and facilitators.

What you do:
- Answer questions about the app itself: Home, onboarding, Play hub (XP, badges, streaks), scenarios/assessment, AI profile results, check-in journal, coach chat, floating “Coach” button, Privacy / Terms / Data & rights, and how things connect.
- Give short, practical steps (tap here, go to this page). English only. Calm, respectful tone.
- You are not a therapist and not for emergencies—if someone seems in crisis, say clearly they should talk to a trusted adult or local emergency services, once briefly.
- Do not invent legal promises; if unsure about a policy detail, say to read the in-app Privacy Policy or Terms.
- Encourage safe, age-appropriate use. Do not ask for unnecessary personal details.

What you do not do:
- No medical or mental-health diagnosis, no instructions for self-harm, no sexual content, no hate.
"""


def _mock_app_help(messages: list[CoachChatMessage]) -> str:
    last = ""
    for m in reversed(messages):
        if m.role == "user":
            last = m.content.strip().lower()
            break
    h = int(hashlib.sha256(last.encode()).hexdigest()[:8], 16)
    lines = [
        "Youth Dev has a **Home** screen, then **Begin the journey** for age + consent before the full story scenarios. The pink **Coach** button opens help and chat from any page.",
        "**Play hub** shows XP, badges, and streaks from finishing profiles and saving check-ins. Open **Check-in** from the footer or nav for the journal.",
        "Use **Data & rights** in the footer for export and delete options where the pilot supports them. For legal wording, open **Privacy** and **Terms** from the footer.",
        "The **Coach** drawer answers questions about the app anytime. For a personalised strengths reflection, complete the story scenarios once so the AI profile can run.",
    ]
    return lines[h % len(lines)]


def _langchain_app_help(messages: list[CoachChatMessage]):
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    out: list[Any] = [SystemMessage(content=APP_HELP_SYSTEM)]
    for m in messages[-18:]:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content))
    return out


async def _groq_app_help(messages: list[CoachChatMessage]) -> str:
    from langchain_groq import ChatGroq

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.55,
    )
    msg = await llm.ainvoke(_langchain_app_help(messages))
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


async def _openai_app_help(messages: list[CoachChatMessage]) -> str:
    if not settings.openai_api_key:
        if settings.allow_llm_demo:
            return _mock_app_help(messages)
        raise ValueError("OPENAI_API_KEY is not set.")

    msgs: list[dict[str, str]] = [{"role": "system", "content": APP_HELP_SYSTEM}]
    for m in messages[-18:]:
        if m.role in ("user", "assistant"):
            msgs.append({"role": m.role, "content": m.content[:4000]})

    payload = {"model": settings.openai_model, "temperature": 0.55, "messages": msgs}
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


async def generate_app_help(messages: list[CoachChatMessage]) -> CoachResponse:
    provider = settings.effective_llm_provider()
    if provider is None:
        if not settings.allow_llm_demo:
            raise ValueError(
                "No LLM configured. Set GROQ_API_KEY or OPENAI_API_KEY in backend/.env "
                "(or ALLOW_LLM_DEMO=true for local canned replies)."
            )
        return CoachResponse(reply=_mock_app_help(messages), demo_mode=True)
    if provider == "groq":
        text = await _groq_app_help(messages)
        if text and text.strip():
            return CoachResponse(reply=text.strip(), demo_mode=False)
        if settings.allow_llm_demo:
            return CoachResponse(reply=_mock_app_help(messages), demo_mode=True)
        raise ValueError("Groq returned an empty reply.")
    text = await _openai_app_help(messages)
    if text and text.strip():
        return CoachResponse(reply=text.strip(), demo_mode=False)
    if settings.allow_llm_demo:
        return CoachResponse(reply=_mock_app_help(messages), demo_mode=True)
    raise ValueError("OpenAI returned an empty reply.")


def validate_app_help_messages(messages: list[CoachChatMessage]) -> None:
    if not messages:
        raise ValueError("Send at least one message.")
    if messages[-1].role != "user":
        raise ValueError("The last message must be from the user.")
