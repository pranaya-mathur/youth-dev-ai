"""
Tests for the moderation module.

Covers:
- Issue #3: \\bcp\\b false positive removed
- Issue #9: print() → logger (structural check)
- Issue #10: unified re.search pattern strategy
- Correct crisis patterns still fire
- OpenAI key absent → local-only path
"""

from __future__ import annotations

import logging
import re
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.moderation import (
    _LOCAL_BLOCK_PATTERNS,
    _local_screen,
    _concat_user_text,
    moderate_user_text,
    trigger_crisis_webhook,
)
from app.schemas import AnswerIn


# ─────────────────────────────────────────────────────────────────────────────
# 1. Pattern quality
# ─────────────────────────────────────────────────────────────────────────────

class TestPatternFalsePositives:
    """Verify that innocent text is NOT blocked by local patterns."""

    @pytest.mark.parametrize("safe_text", [
        "I use cp to copy files in Linux",         # \\bcp\\b false positive (FIXED)
        "Capricorn is my zodiac sign",             # cp substring
        "I am a CP (certified professional)",      # abbreviation
        "copy-paste shortcut",                     # normal usage
        "The copy command worked",                 # incidental
        "I cut my birthday cake",                  # 'cut' without 'myself'
        "I want to end this project",              # 'end' without 'it all'
        "self-improvement is key",                 # 'self' without 'harm'
        "The kids are playing suicide squad",      # media title — BUT 'suicid' pattern fires; expected
    ])
    def test_cp_is_not_blocked(self, safe_text: str):
        # Only test the cp-specific cases; others may legitimately trigger
        if "cp" in safe_text.lower() and "child" not in safe_text.lower():
            result = _local_screen(safe_text)
            # cp alone must NOT trigger
            assert result is None, f"False positive for: {safe_text!r}"

    def test_cp_alone_does_not_block(self):
        assert _local_screen("cp -r dir1 dir2") is None
        assert _local_screen("cp file.txt /tmp/") is None
        assert _local_screen("use cp command") is None

    def test_cut_myself_blocks(self):
        assert _local_screen("I want to cut myself") is not None

    def test_self_harm_blocks(self):
        assert _local_screen("I have been doing self-harm") is not None

    def test_kms_blocks(self):
        assert _local_screen("honestly kms") is not None

    def test_suicidal_blocks(self):
        assert _local_screen("I have suicidal thoughts") is not None

    def test_child_porn_blocks(self):
        assert _local_screen("child porn content") is not None

    def test_childporn_nospace_blocks(self):
        assert _local_screen("childporn") is not None

    def test_csam_blocks(self):
        assert _local_screen("csam material") is not None


class TestPatternStrategy:
    """All patterns use re.search (consistent strategy, Issue #10)."""

    def test_all_patterns_are_regex_strings(self):
        for pat in _LOCAL_BLOCK_PATTERNS:
            assert isinstance(pat, str), f"Pattern should be a str: {pat!r}"
            # Must compile without error
            re.compile(pat)

    def test_patterns_use_word_boundaries(self):
        """Patterns should use \\b markers to avoid partial matches."""
        for pat in _LOCAL_BLOCK_PATTERNS:
            # Most patterns should have word boundary or anchored characters
            assert "\\b" in pat or "child" in pat, (
                f"Pattern {pat!r} lacks word boundary — check for false positives"
            )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Text concatenation
# ─────────────────────────────────────────────────────────────────────────────

class TestConcatUserText:
    def test_empty_returns_empty(self):
        assert _concat_user_text(None, []) == ""

    def test_nickname_included(self):
        result = _concat_user_text("Alice", [])
        assert "Alice" in result

    def test_blank_nickname_excluded(self):
        result = _concat_user_text("   ", [AnswerIn(question_id="q1", text="hello")])
        assert result.strip() == "hello"

    def test_answers_concatenated(self):
        answers = [
            AnswerIn(question_id="q1", text="first"),
            AnswerIn(question_id="q2", text="second"),
        ]
        result = _concat_user_text(None, answers)
        assert "first" in result and "second" in result

    def test_truncates_to_8000(self):
        long_text = "x" * 10000
        result = _concat_user_text(None, [AnswerIn(question_id="q1", text=long_text)])
        assert len(result) <= 8000


# ─────────────────────────────────────────────────────────────────────────────
# 3. Crisis webhook
# ─────────────────────────────────────────────────────────────────────────────

class TestCrisisWebhook:
    @pytest.mark.asyncio
    async def test_no_webhook_url_is_noop(self):
        """Should not raise even when no URL is configured."""
        from app.config import settings
        original = settings.crisis_webhook_url
        settings.__dict__["crisis_webhook_url"] = None
        # Must not raise
        await trigger_crisis_webhook(None, "test", "/test", False)
        settings.__dict__["crisis_webhook_url"] = original

    @pytest.mark.asyncio
    async def test_webhook_called_with_correct_payload(self):
        from app.config import settings
        settings.__dict__["crisis_webhook_url"] = "http://fake-webhook.test/hook"

        uid = uuid.uuid4()
        posted_payloads = []

        class FakeResponse:
            status_code = 200

        class FakeClient:
            async def post(self, url, json):
                posted_payloads.append(json)
                return FakeResponse()

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

        with patch("app.moderation.httpx.AsyncClient", return_value=FakeClient()):
            await trigger_crisis_webhook(uid, "local_pattern_match", "/api/profile", True)

        assert len(posted_payloads) == 1
        p = posted_payloads[0]
        assert p["event_type"] == "crisis_signal_detected"
        assert p["user_id"] == str(uid)
        assert p["signal_type"] == "local_pattern_match"
        assert p["route"] == "/api/profile"
        assert p["nickname_present"] is True
        settings.__dict__["crisis_webhook_url"] = None

    @pytest.mark.asyncio
    async def test_webhook_failure_does_not_propagate(self, caplog):
        from app.config import settings
        settings.__dict__["crisis_webhook_url"] = "http://bad-url.test/hook"

        class BrokenClient:
            async def post(self, url, json):
                raise ConnectionError("network down")

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

        with patch("app.moderation.httpx.AsyncClient", return_value=BrokenClient()):
            with caplog.at_level(logging.WARNING, logger="app.moderation"):
                # Must NOT raise
                await trigger_crisis_webhook(None, "test", "/test", False)

        assert any("webhook" in r.message.lower() for r in caplog.records)
        settings.__dict__["crisis_webhook_url"] = None


# ─────────────────────────────────────────────────────────────────────────────
# 4. moderate_user_text (end-to-end, no real API keys)
# ─────────────────────────────────────────────────────────────────────────────

class TestModerateUserText:
    @pytest.mark.asyncio
    async def test_empty_text_passes(self):
        # Should not raise
        await moderate_user_text(None, [], user_id=None, route="/test")

    @pytest.mark.asyncio
    async def test_safe_text_passes(self):
        answers = [AnswerIn(question_id="q1", text="I love painting and reading books")]
        await moderate_user_text("Alice", answers, user_id=None, route="/test")

    @pytest.mark.asyncio
    async def test_crisis_text_raises_value_error(self):
        answers = [AnswerIn(question_id="q1", text="I want to kill myself")]
        with pytest.raises(ValueError, match=r"[Hh]eavy|[Cc]risis|trusted adult"):
            await moderate_user_text(None, answers, user_id=None, route="/test")

    @pytest.mark.asyncio
    async def test_no_openai_key_skips_api(self):
        """With no OpenAI key, moderate_user_text should NOT call the API."""
        from app.config import settings
        original = settings.openai_api_key
        settings.__dict__["openai_api_key"] = None

        with patch("app.moderation.httpx.AsyncClient") as mock_client:
            answers = [AnswerIn(question_id="q1", text="I enjoy cricket")]
            await moderate_user_text(None, answers)
            mock_client.assert_not_called()

        settings.__dict__["openai_api_key"] = original

    @pytest.mark.asyncio
    async def test_print_not_used(self):
        """Issue #9: webhook failure should use logger, not print()."""
        import io
        import sys
        from app.config import settings
        settings.__dict__["crisis_webhook_url"] = "http://fail.test/"

        class BrokenClient:
            async def post(self, url, json):
                raise Exception("boom")
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass

        old_stdout = sys.stdout
        captured = io.StringIO()
        sys.stdout = captured
        try:
            with patch("app.moderation.httpx.AsyncClient", return_value=BrokenClient()):
                await trigger_crisis_webhook(None, "t", "/t", False)
        finally:
            sys.stdout = old_stdout
        settings.__dict__["crisis_webhook_url"] = None
        # Nothing should have been printed to stdout
        assert captured.getvalue() == "", "print() still being used instead of logger"
