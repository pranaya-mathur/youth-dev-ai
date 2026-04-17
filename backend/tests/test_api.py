"""
Integration tests that hit the actual FastAPI HTTP layer.

Covers:
- Issue #2: HMAC auth token enforcement
- Issue #8: confirm field validation in delete / purge
- /health endpoint structure
- /api/profile (demo mode, consent validation, moderation block)
- /api/journal
- /api/me (no ghost rows)
- /api/me/export
- /api/me/delete (with + without confirm)
- /api/coach (demo mode)
- /api/app-help
- Rate limiting: 429 after threshold

All tests use the `client` fixture (AsyncClient + in-memory SQLite).
No real API keys required — ALLOW_LLM_DEMO=true is set in conftest.
"""

from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import MagicMock, patch

from app.policy_constants import POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _consent(age_band: str = "17-18") -> dict:
    base = dict(
        accepted_privacy=True,
        accepted_terms=True,
        accepted_ai_processing=True,
        guardian_attested=False,
        accepted_age_capacity=False,
        policy_version_privacy=POLICY_VERSION_PRIVACY,
        policy_version_terms=POLICY_VERSION_TERMS,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )
    if age_band in ("11-13", "14-16"):
        base["guardian_attested"] = True
    else:
        base["accepted_age_capacity"] = True
    return base


def _answers(n: int = 3) -> list[dict]:
    return [{"question_id": f"q{i}", "mcq_id": f"opt_{i}"} for i in range(n)]


def _uid() -> str:
    return str(uuid.uuid4())


def _make_auth_token(user_id: str, secret: str) -> str:
    return hmac.new(secret.encode(), user_id.encode(), hashlib.sha256).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Health endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client: AsyncClient):
        r = await client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True

    @pytest.mark.asyncio
    async def test_health_exposes_auth_mode(self, client: AsyncClient):
        r = await client.get("/health")
        body = r.json()
        assert "auth_mode" in body
        assert body["auth_mode"] in ("hmac_token", "unsigned_device_id")

    @pytest.mark.asyncio
    async def test_health_exposes_database_flag(self, client: AsyncClient):
        r = await client.get("/health")
        body = r.json()
        assert "database_configured" in body


# ─────────────────────────────────────────────────────────────────────────────
# 2. Auth enforcement (Issue #2)
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthEnforcement:
    @pytest.mark.asyncio
    async def test_no_auth_secret_accepts_bare_uuid(self, client: AsyncClient):
        """Without AUTH_SECRET, any valid UUID is accepted (dev mode)."""
        from app.config import settings
        original = settings.auth_secret
        settings.__dict__["auth_secret"] = None

        uid = _uid()
        r = await client.get("/api/me", headers={"X-Youth-User-Id": uid})
        # 200 or graceful (not 401)
        assert r.status_code != 401

        settings.__dict__["auth_secret"] = original

    @pytest.mark.asyncio
    async def test_with_auth_secret_no_token_returns_401(self, client: AsyncClient):
        """With AUTH_SECRET set, missing token must return 401."""
        from app.config import settings
        settings.__dict__["auth_secret"] = "super-strong-test-secret-xyz-12345"

        uid = _uid()
        r = await client.get("/api/me", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 401
        assert "token" in r.json()["detail"].lower()

        settings.__dict__["auth_secret"] = None

    @pytest.mark.asyncio
    async def test_with_auth_secret_wrong_token_returns_401(self, client: AsyncClient):
        from app.config import settings
        settings.__dict__["auth_secret"] = "super-strong-test-secret-xyz-12345"

        uid = _uid()
        r = await client.get(
            "/api/me",
            headers={
                "X-Youth-User-Id": uid,
                "X-Youth-Auth-Token": "wrong-token-value",
            },
        )
        assert r.status_code == 401

        settings.__dict__["auth_secret"] = None

    @pytest.mark.asyncio
    async def test_with_auth_secret_correct_token_succeeds(self, client: AsyncClient):
        from app.config import settings
        secret = "super-strong-test-secret-xyz-12345"
        settings.__dict__["auth_secret"] = secret

        uid = _uid()
        token = _make_auth_token(uid, secret)
        r = await client.get(
            "/api/me",
            headers={
                "X-Youth-User-Id": uid,
                "X-Youth-Auth-Token": token,
            },
        )
        assert r.status_code == 200

        settings.__dict__["auth_secret"] = None

    @pytest.mark.asyncio
    async def test_invalid_uuid_returns_400(self, client: AsyncClient):
        r = await client.get("/api/me", headers={"X-Youth-User-Id": "not-a-uuid"})
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 3. /api/profile (demo mode active, consent required)
# ─────────────────────────────────────────────────────────────────────────────

class TestProfileEndpoint:
    @pytest.mark.asyncio
    async def test_profile_returns_200_in_demo_mode(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "nickname": "Tester",
            "answers": _answers(),
            "consent": _consent("17-18"),
        }
        r = await client.post(
            "/api/profile",
            json=payload,
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code == 200
        body = r.json()
        assert "identity_name" in body
        assert "strengths" in body
        assert isinstance(body["strengths"], list)

    @pytest.mark.asyncio
    async def test_profile_requires_consent(self, client: AsyncClient):
        uid = _uid()
        bad_consent = _consent("17-18")
        bad_consent["accepted_privacy"] = False
        payload = {
            "age_band": "17-18",
            "answers": _answers(),
            "consent": bad_consent,
        }
        r = await client.post(
            "/api/profile",
            json=payload,
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_profile_blocked_for_crisis_text(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "nickname": "Sad User",
            "answers": [{"question_id": "q1", "mcq_id": "a1", "text": "I want to kill myself"}],
            "consent": _consent("17-18"),
        }
        r = await client.post(
            "/api/profile",
            json=payload,
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code == 400
        assert "trusted adult" in r.json()["detail"].lower() or "heavy" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_profile_guardian_required_for_under_17(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "14-16",
            "answers": _answers(),
            "consent": _consent("17-18"),  # wrong consent (no guardian)
        }
        r = await client.post(
            "/api/profile",
            json=payload,
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 4. /api/me — no ghost rows (Issue #4)
# ─────────────────────────────────────────────────────────────────────────────

class TestMeEndpoint:
    @pytest.mark.asyncio
    async def test_me_returns_empty_for_new_user(self, client: AsyncClient):
        uid = _uid()
        r = await client.get("/api/me", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert body["snapshots"] == []
        assert body["journal"] == []

    @pytest.mark.asyncio
    async def test_me_no_user_id_still_responds(self, client: AsyncClient):
        # Without user_id header, should return something (no DB, no crash)
        r = await client.get("/api/me")
        # May return 200 with empty or a meaningful response — not 500
        assert r.status_code < 500

    @pytest.mark.asyncio
    async def test_me_reflects_saved_profile(self, client: AsyncClient):
        uid = _uid()
        # First create a profile run
        payload = {
            "age_band": "17-18",
            "nickname": "Alex",
            "answers": _answers(),
            "consent": _consent("17-18"),
        }
        await client.post("/api/profile", json=payload, headers={"X-Youth-User-Id": uid})
        # Now /api/me should have a snapshot
        r = await client.get("/api/me", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert len(body["snapshots"]) >= 1


# ─────────────────────────────────────────────────────────────────────────────
# 5. /api/journal
# ─────────────────────────────────────────────────────────────────────────────

class TestJournalEndpoint:
    @pytest.mark.asyncio
    async def test_journal_saves_entry(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "prompt_id": "reflection_1",
            "text": "Today I felt confident when I spoke up.",
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/journal", json=payload, headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @pytest.mark.asyncio
    async def test_journal_blocks_crisis_content(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "prompt_id": "reflection_1",
            "text": "I have been doing self-harm and feeling suicidal",
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/journal", json=payload, headers={"X-Youth-User-Id": uid})
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_journal_requires_user_id(self, client: AsyncClient):
        payload = {
            "age_band": "17-18",
            "prompt_id": "reflection_1",
            "text": "Some text.",
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/journal", json=payload)
        # No user_id → 400
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 6. /api/me/delete — confirm validation (Issue #8)
# ─────────────────────────────────────────────────────────────────────────────

class TestDeleteEndpoint:
    @pytest.mark.asyncio
    async def test_delete_requires_correct_confirm(self, client: AsyncClient):
        uid = _uid()
        # Wrong confirm value → 422 (Literal validation) or 400
        r = await client.post(
            "/api/me/delete",
            json={"confirm": "yes_delete_me"},
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_delete_with_correct_confirm_returns_ok(self, client: AsyncClient):
        uid = _uid()
        r = await client.post(
            "/api/me/delete",
            json={"confirm": "delete_my_server_data"},
            headers={"X-Youth-User-Id": uid},
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

    @pytest.mark.asyncio
    async def test_delete_legacy_endpoint(self, client: AsyncClient):
        uid = _uid()
        r = await client.delete("/api/me", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_requires_user_id(self, client: AsyncClient):
        r = await client.post("/api/me/delete", json={"confirm": "delete_my_server_data"})
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 7. /api/me/export
# ─────────────────────────────────────────────────────────────────────────────

class TestExportEndpoint:
    @pytest.mark.asyncio
    async def test_export_returns_json(self, client: AsyncClient):
        uid = _uid()
        r = await client.get("/api/me/export", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert "export_schema" in body
        assert body["user_id"] == uid

    @pytest.mark.asyncio
    async def test_export_requires_user_id(self, client: AsyncClient):
        r = await client.get("/api/me/export")
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 8. /api/coach (demo mode)
# ─────────────────────────────────────────────────────────────────────────────

class TestCoachEndpoint:
    @pytest.mark.asyncio
    async def test_coach_returns_reply_in_demo_mode(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "nickname": "Rio",
            "messages": [{"role": "user", "content": "I feel nervous about school tomorrow."}],
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/coach", json=payload, headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert "reply" in body
        assert len(body["reply"]) > 0

    @pytest.mark.asyncio
    async def test_coach_last_message_must_be_user(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/coach", json=payload, headers={"X-Youth-User-Id": uid})
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_coach_blocks_crisis_text(self, client: AsyncClient):
        uid = _uid()
        payload = {
            "age_band": "17-18",
            "messages": [{"role": "user", "content": "I want to end it all"}],
            "consent": _consent("17-18"),
        }
        r = await client.post("/api/coach", json=payload, headers={"X-Youth-User-Id": uid})
        assert r.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# 9. /api/app-help (no consent required)
# ─────────────────────────────────────────────────────────────────────────────

class TestAppHelpEndpoint:
    @pytest.mark.asyncio
    async def test_app_help_returns_reply(self, client: AsyncClient):
        payload = {
            "messages": [{"role": "user", "content": "How do I view my profile?"}]
        }
        r = await client.post("/api/app-help", json=payload)
        assert r.status_code == 200
        assert "reply" in r.json()

    @pytest.mark.asyncio
    async def test_app_help_empty_messages_rejected(self, client: AsyncClient):
        r = await client.post("/api/app-help", json={"messages": []})
        assert r.status_code in (400, 422)


# ─────────────────────────────────────────────────────────────────────────────
# 10. /api/me/trends
# ─────────────────────────────────────────────────────────────────────────────

class TestTrendsEndpoint:
    @pytest.mark.asyncio
    async def test_trends_requires_user_id(self, client: AsyncClient):
        r = await client.get("/api/me/trends")
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_trends_returns_structure(self, client: AsyncClient):
        uid = _uid()
        # Create a profile first
        await client.post(
            "/api/profile",
            json={
                "age_band": "17-18",
                "nickname": "Sam",
                "answers": _answers(),
                "consent": _consent("17-18"),
            },
            headers={"X-Youth-User-Id": uid},
        )
        r = await client.get("/api/me/trends", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert "top_strengths" in body
        assert "identity_history" in body
        assert "xp_progression" in body


# ─────────────────────────────────────────────────────────────────────────────
# 11. /api/me/micro-action
# ─────────────────────────────────────────────────────────────────────────────

class TestMicroActionEndpoint:
    @pytest.mark.asyncio
    async def test_micro_action_requires_user_id(self, client: AsyncClient):
        r = await client.post("/api/me/micro-action")
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_micro_action_404_when_no_profile(self, client: AsyncClient):
        uid = _uid()
        r = await client.post("/api/me/micro-action", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_micro_action_awards_xp(self, client: AsyncClient):
        uid = _uid()
        # Create profile first
        await client.post(
            "/api/profile",
            json={
                "age_band": "17-18",
                "nickname": "Jay",
                "answers": _answers(),
                "consent": _consent("17-18"),
            },
            headers={"X-Youth-User-Id": uid},
        )
        r = await client.post("/api/me/micro-action", headers={"X-Youth-User-Id": uid})
        assert r.status_code == 200
        body = r.json()
        assert body["xp_gained"] == 15


# ─────────────────────────────────────────────────────────────────────────────
# 12. Rate limiting (429)
# ─────────────────────────────────────────────────────────────────────────────

class TestRateLimiting:
    @pytest.mark.asyncio
    async def test_profile_rate_limited_after_threshold(self, client: AsyncClient):
        """
        Verify 429 is raised once the per-IP counter exceeds max_requests.
        We directly exercise the in-memory enforcer with a tiny limit so the
        test is fast and deterministic, isolating it from all other tests.
        """
        import app.rate_limit as rl

        # Use a unique key to avoid cross-test bucket contamination
        import time as _time
        unique_suffix = f"rl_test_{_time.time_ns()}"
        original_redis = rl._redis_client
        rl._redis_client = None  # force in-memory

        req_mock = MagicMock()
        req_mock.client = MagicMock()
        req_mock.client.host = "10.99.99.99"

        # Allow 3 then block on 4th
        for _ in range(3):
            await rl.enforce_rate_limit(
                req_mock, key_suffix=unique_suffix, max_requests=3, window_sec=60
            )

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await rl.enforce_rate_limit(
                req_mock, key_suffix=unique_suffix, max_requests=3, window_sec=60
            )
        assert exc.value.status_code == 429

        rl._redis_client = original_redis

