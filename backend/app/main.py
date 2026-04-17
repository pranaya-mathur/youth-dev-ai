import hashlib
import hmac
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import uuid
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import audit_log
from app.ai_pipeline import generate_profile
from app.app_help_pipeline import generate_app_help, validate_app_help_messages
from app.coach_pipeline import generate_coach_reply, validate_coach_messages
from app.config import settings
from app.consent_validate import validate_consent
from app.database import create_tables, database_enabled, dispose_engine, get_session_optional, init_database
from app import persistence_service
from app.moderation import moderate_user_text
from app.rate_limit import enforce_rate_limit
from app.schemas import (
    AnswerIn,
    AppHelpRequest,
    CoachRequest,
    CoachResponse,
    JournalRequest,
    MeResponse,
    MicroActionResponse,
    ProfileRequest,
    ProfileResponse,
    PurgeMaintenanceRequest,
    PurgeMaintenanceResponse,
    ServerDataDeleteRequest,
    ServerDataDeleteResponse,
    TrendsResponse,
)


logger = logging.getLogger(__name__)


def _parse_youth_user_id(x: str | None = Header(default=None, alias="X-Youth-User-Id")) -> uuid.UUID | None:
    if x is None or not str(x).strip():
        return None
    try:
        return uuid.UUID(str(x).strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id must be a valid UUID") from e


def _verify_user_token(
    x_user_id: str | None = Header(default=None, alias="X-Youth-User-Id"),
    x_token: str | None = Header(default=None, alias="X-Youth-Auth-Token"),
) -> uuid.UUID | None:
    """When AUTH_SECRET is configured, verify the HMAC-SHA256 token.

    Token format expected from clients:
        HMAC-SHA256(key=AUTH_SECRET, msg=user_id_as_string)

    When AUTH_SECRET is not set the app runs in *unsigned device-id mode* —
    any UUID is accepted without verification. Suitable for local dev only.
    """
    if x_user_id is None or not x_user_id.strip():
        return None
    try:
        uid = uuid.UUID(x_user_id.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id must be a valid UUID") from e

    auth_secret = settings.auth_secret
    if auth_secret:
        if not x_token:
            raise HTTPException(
                status_code=401,
                detail="X-Youth-Auth-Token header is required when the server has AUTH_SECRET configured.",
            )
        expected = hmac.new(
            auth_secret.encode(),
            x_user_id.strip().encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_token.strip()):
            raise HTTPException(status_code=401, detail="Invalid auth token.")

    return uid


YouthUserIdDep = Annotated[uuid.UUID | None, Depends(_verify_user_token)]
SessionDep = Annotated[AsyncSession | None, Depends(get_session_optional)]


async def _rate_limit_me_export(request: Request) -> None:
    await enforce_rate_limit(request, key_suffix="me_export", max_requests=40, window_sec=3600)


async def _rate_limit_me_delete(request: Request) -> None:
    await enforce_rate_limit(request, key_suffix="me_delete", max_requests=12, window_sec=3600)


async def _rate_limit_purge(request: Request) -> None:
    await enforce_rate_limit(request, key_suffix="purge_inactive", max_requests=8, window_sec=3600)


async def _rate_limit_profile(request: Request) -> None:
    await enforce_rate_limit(request, key_suffix="profile_gen", max_requests=10, window_sec=3600)


async def _rate_limit_coach(request: Request) -> None:
    await enforce_rate_limit(request, key_suffix="coach_chat", max_requests=10, window_sec=3600)


async def _server_delete(session: AsyncSession | None, user_id: uuid.UUID) -> ServerDataDeleteResponse:
    had = await persistence_service.delete_all_user_data(session, user_id)
    audit_log.log_server_delete(user_id, had)
    return ServerDataDeleteResponse(ok=True, had_server_rows=had)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    await create_tables()
    yield
    await dispose_engine()


app = FastAPI(title="Youth Dev AI", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
if not _origins:
    _origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    llm = settings.effective_llm_provider()
    routing = (settings.llm_provider or "").strip().lower()
    hint = None
    if llm == "groq" and settings.openai_api_key and routing not in ("groq", "openai"):
        hint = (
            "Using Groq because GROQ_API_KEY is set. To use OpenAI only, set LLM_PROVIDER=openai "
            "or remove/clear GROQ_API_KEY in backend/.env."
        )
    return {
        "ok": True,
        "llm_provider": llm or "mock",
        "demo_mode": llm is None,
        "allow_llm_demo": settings.allow_llm_demo,
        "openai_key_present": bool(settings.openai_api_key),
        "groq_key_present": bool(settings.groq_api_key),
        "llm_routing_hint": hint,
        "openai_moderation_configured": bool(settings.openai_api_key),
        "database_configured": database_enabled(),
        "auth_mode": "hmac_token" if settings.auth_secret else "unsigned_device_id",
        "retention_maintenance_configured": bool(
            settings.maintenance_secret
            and settings.data_retention_days is not None
            and settings.data_retention_days >= 1
        ),
    }


@app.get("/api/me", response_model=MeResponse)
async def me(session: SessionDep, user_id: YouthUserIdDep):
    payload = await persistence_service.fetch_me_payload(session, user_id)
    return MeResponse.model_validate(payload)


@app.get("/api/me/trends", response_model=TrendsResponse)
async def me_trends(session: SessionDep, user_id: YouthUserIdDep):
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    payload = await persistence_service.fetch_trends_payload(session, user_id)
    return TrendsResponse.model_validate(payload)


@app.post("/api/me/micro-action", response_model=MicroActionResponse)
async def micro_action_done(session: SessionDep, user_id: YouthUserIdDep):
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    res = await persistence_service.mark_micro_action_done(session, user_id)
    if res is None:
        raise HTTPException(status_code=404, detail="No pending micro-action found")
    return MicroActionResponse.model_validate(res)


@app.get("/api/me/export")
async def export_me(
    session: SessionDep,
    user_id: YouthUserIdDep,
    _: None = Depends(_rate_limit_me_export),
):
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    payload = await persistence_service.fetch_full_export_payload(session, user_id)
    audit_log.log_export(user_id)
    fname = f"youth-dev-export-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@app.post("/api/me/delete", response_model=ServerDataDeleteResponse)
async def delete_me_post(
    body: ServerDataDeleteRequest,
    session: SessionDep,
    user_id: YouthUserIdDep,
    _: None = Depends(_rate_limit_me_delete),
):
    if body.confirm != "delete_my_server_data":
        raise HTTPException(status_code=400, detail="confirm must equal 'delete_my_server_data'")
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    return await _server_delete(session, user_id)


@app.delete("/api/me", response_model=ServerDataDeleteResponse)
async def delete_me(
    session: SessionDep,
    user_id: YouthUserIdDep,
    _: None = Depends(_rate_limit_me_delete),
):
    """Legacy: prefer POST /api/me/delete with JSON body confirm=delete_my_server_data."""
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    return await _server_delete(session, user_id)


@app.post("/api/internal/maintenance/purge-inactive-users", response_model=PurgeMaintenanceResponse)
async def purge_inactive_users(
    body: PurgeMaintenanceRequest,
    session: SessionDep,
    x_maintenance_secret: str | None = Header(default=None, alias="X-Maintenance-Secret"),
    _: None = Depends(_rate_limit_purge),
):
    if body.confirm != "purge_inactive_users":
        raise HTTPException(status_code=400, detail="confirm must equal 'purge_inactive_users'")
    if not settings.maintenance_secret or settings.data_retention_days is None:
        raise HTTPException(status_code=404, detail="Not found")
    if settings.data_retention_days < 1:
        raise HTTPException(status_code=404, detail="Not found")
    if x_maintenance_secret != settings.maintenance_secret:
        raise HTTPException(status_code=401, detail="Invalid maintenance secret")
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    n = await persistence_service.purge_users_inactive_older_than(session, settings.data_retention_days)
    audit_log.log_purge(n)
    return PurgeMaintenanceResponse(ok=True, deleted_user_rows=n)


@app.post("/api/journal")
async def journal(body: JournalRequest, session: SessionDep, user_id: YouthUserIdDep):
    if session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    if user_id is None:
        raise HTTPException(status_code=400, detail="X-Youth-User-Id header is required")
    try:
        validate_consent(body.age_band, body.consent)
        await moderate_user_text(
            None,
            [AnswerIn(question_id="journal", text=body.text)],
            user_id=user_id,
            route="/api/journal",
        )
        await persistence_service.add_journal(session, user_id, body.prompt_id, body.text)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/app-help", response_model=CoachResponse)
async def app_help(body: AppHelpRequest):
    """Youth Dev in-app assistant — no consent required; not persisted as coach chat."""
    try:
        validate_app_help_messages(body.messages)
        last_user = body.messages[-1].content
        await moderate_user_text(
            None,
            [AnswerIn(question_id="app_help", text=last_user)],
            user_id=None,
            route="/api/app-help",
        )
        return await generate_app_help(body.messages)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e!s}") from e


@app.post("/api/coach", response_model=CoachResponse)
async def coach(
    body: CoachRequest,
    session: SessionDep,
    user_id: YouthUserIdDep,
    _: None = Depends(_rate_limit_coach),
):
    try:
        validate_consent(body.age_band, body.consent)
        validate_coach_messages(body.messages)
        last_user = body.messages[-1].content
        await moderate_user_text(
            body.nickname,
            [AnswerIn(question_id="coach_chat", text=last_user)],
            user_id=user_id,
            route="/api/coach",
        )
        out = await generate_coach_reply(body)
        if session is not None and user_id is not None:
            await persistence_service.append_coach_exchange(session, user_id, last_user, out.reply)
        return out
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e!s}") from e


@app.post("/api/profile", response_model=ProfileResponse)
async def profile(
    body: ProfileRequest,
    session: SessionDep,
    user_id: YouthUserIdDep,
    _: None = Depends(_rate_limit_profile),
):
    try:
        validate_consent(body.age_band, body.consent)
        await moderate_user_text(
            body.nickname,
            body.answers,
            user_id=user_id,
            route="/api/profile",
        )
        if database_enabled() and user_id is None:
            raise HTTPException(
                status_code=400,
                detail="X-Youth-User-Id header (UUID) is required when DATABASE_URL is configured.",
            )
        resp = await generate_profile(body)
        if session is not None and user_id is not None:
            await persistence_service.save_profile_run_if_new(session, user_id, body, resp)
        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e!s}") from e
