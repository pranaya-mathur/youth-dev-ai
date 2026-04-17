"""
Shared fixtures for the Youth Dev-AI backend test suite.

Design decisions
----------------
* SQLite is used for fast, zero-dependency in-memory testing.
* PostgreSQL JSONB is replaced with SQLAlchemy's generic JSON for SQLite
  compatibility — this is safe because the ORM layer reads/writes the same
  Python structures regardless of the underlying JSON column type.
* ALLOW_LLM_DEMO=true so AI endpoints return deterministic mock responses
  without any real API keys.
* Each DB-touching test gets a fully isolated engine+session so tests are
  completely independent from each other.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

import pytest
import pytest_asyncio

# ── Force test environment BEFORE any app module is imported ─────────────────
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ.setdefault("ALLOW_LLM_DEMO", "true")
os.environ["OPENAI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["CRISIS_WEBHOOK_URL"] = ""
os.environ["AUTH_SECRET"] = ""
os.environ["REDIS_URL"] = ""

# ── Patch JSONB → JSON and UUID for SQLite ──────────────────────────────────
# SQLite supports neither JSONB nor PostgreSQL's UUID type.
# We monkey-patch both before any model module is imported.
from sqlalchemy import JSON as _SA_JSON, String as _SA_String, text as _sa_text
from sqlalchemy.dialects import postgresql as _pg_dialect
from sqlalchemy.types import TypeDecorator, CHAR
import uuid as _uuid_mod

_pg_dialect.JSONB = _SA_JSON          # type: ignore[attr-defined]

# Replace the pg UUID type with a string-based UUID implementation
class _SQLiteUUID(TypeDecorator):
    """Store UUIDs as VARCHAR(36) in SQLite."""
    impl = _SA_String(36)
    cache_ok = True
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return _uuid_mod.UUID(value)

_pg_dialect.UUID = _SQLiteUUID  # type: ignore[attr-defined]

# Now safe to import app code
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text as _sa_text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base, GamificationRow  # noqa: E402
from app.policy_constants import POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS  # noqa: E402

# ── Patch PG-specific server_default for SQLite ───────────────────────────────
# GamificationRow.badges uses server_default=text("'[]'::jsonb") which is
# invalid SQLite DDL.  For SQLite tests:
#   1. Clear the server_default so the DDL CREATE TABLE doesn't error.
#   2. Add a Python-level `default` so INSERT supplies [] automatically.
_badges_col = GamificationRow.__table__.c.badges
_badges_col.server_default = None
_badges_col.default = None  # reset any existing default first
from sqlalchemy.sql.schema import ColumnDefault as _ColumnDefault  # noqa: E402
_badges_col.default = _ColumnDefault(list)  # supplies [] at insert


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_consent(age_band: str = "17-18") -> dict:
    """Return a valid ConsentIn-compatible dict for the given age band."""
    base = {
        "accepted_privacy": True,
        "accepted_terms": True,
        "accepted_ai_processing": True,
        "policy_version_privacy": POLICY_VERSION_PRIVACY,
        "policy_version_terms": POLICY_VERSION_TERMS,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "guardian_attested": False,
        "accepted_age_capacity": False,
    }
    if age_band in ("11-13", "14-16"):
        base["guardian_attested"] = True
    else:
        base["accepted_age_capacity"] = True
    return base


def make_answers(n: int = 3) -> list[dict]:
    return [{"question_id": f"q{i}", "mcq_id": f"opt_{i}_a"} for i in range(n)]


def make_user_id() -> uuid.UUID:
    return uuid.uuid4()


def make_auth_token(user_id: uuid.UUID, secret: str) -> str:
    return hmac.new(
        secret.encode(),
        str(user_id).encode(),
        hashlib.sha256,
    ).hexdigest()


# ── Per-test isolated SQLite engine ──────────────────────────────────────────

@pytest_asyncio.fixture()
async def db_engine():
    """Fresh in-memory SQLite engine per test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture()
async def session(db_engine) -> AsyncIterator[AsyncSession]:
    """Isolated async session bound to the per-test engine."""
    factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with factory() as s:
        yield s


# ── API client fixtures ───────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def _session_engine():
    """Session-scoped engine for the API integration tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Wire the app's session factory to our test engine
    import app.database as db_module
    factory = async_sessionmaker(engine, expire_on_commit=False)
    db_module._session_factory = factory
    db_module._engine = engine

    yield engine

    await engine.dispose()
    db_module._session_factory = None
    db_module._engine = None


@pytest_asyncio.fixture()
async def client(_session_engine) -> AsyncIterator[AsyncClient]:
    """Per-test async HTTP client bound to the FastAPI app with SQLite backend."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture()
def user_id() -> uuid.UUID:
    return make_user_id()


@pytest.fixture()
def consent_17() -> dict:
    return make_consent("17-18")


@pytest.fixture()
def consent_14() -> dict:
    return make_consent("14-16")


@pytest.fixture()
def answers() -> list[dict]:
    return make_answers()
