"""
Tests for ai_pipeline.py.

Covers:
- _extract_json_object: handles clean JSON and JSON wrapped in markdown
- _profile_response_from_obj: pads short strengths, caps at 5
- _mock_profile: returns valid ProfileResponse in demo mode
- generate_profile: returns mock when no LLM configured + ALLOW_LLM_DEMO=true
"""

from __future__ import annotations

import pytest

from app.ai_pipeline import (
    _extract_json_object,
    _mock_profile,
    _profile_response_from_obj,
    _answers_blob,
)
from app.schemas import AnswerIn, ProfileRequest
from tests.conftest import make_consent, make_answers


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_req() -> ProfileRequest:
    from app.policy_constants import POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS
    from datetime import datetime, timezone
    from app.schemas import ConsentIn
    return ProfileRequest(
        age_band="17-18",
        nickname="Tester",
        answers=[AnswerIn(question_id="q1", mcq_id="opt_a")],
        consent=ConsentIn(
            accepted_privacy=True,
            accepted_terms=True,
            accepted_ai_processing=True,
            guardian_attested=False,
            accepted_age_capacity=True,
            policy_version_privacy=POLICY_VERSION_PRIVACY,
            policy_version_terms=POLICY_VERSION_TERMS,
            recorded_at=datetime.now(timezone.utc).isoformat(),
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. JSON extraction
# ─────────────────────────────────────────────────────────────────────────────

class TestExtractJsonObject:
    def test_clean_json(self):
        raw = '{"key": "value"}'
        result = _extract_json_object(raw)
        assert result == {"key": "value"}

    def test_json_wrapped_in_markdown(self):
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = _extract_json_object(raw)
        assert result == {"key": "value"}

    def test_json_with_leading_text(self):
        raw = "Here is the result:\n{\"identity_name\": \"Bright Star\"}"
        result = _extract_json_object(raw)
        assert result["identity_name"] == "Bright Star"

    def test_invalid_json_raises(self):
        with pytest.raises((ValueError, Exception)):
            _extract_json_object("this is not json at all")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Profile response parsing
# ─────────────────────────────────────────────────────────────────────────────

class TestProfileResponseFromObj:
    def test_valid_obj_parses(self):
        obj = {
            "strengths": ["Brave", "Kind", "Curious", "Hopeful", "Warm"],
            "identity_name": "Quiet Starlight",
            "narrative": "A great story.",
            "micro_action": "Do one thing.",
            "reflection_prompt": "What did you notice?",
        }
        resp = _profile_response_from_obj(obj)
        assert resp.identity_name == "Quiet Starlight"
        assert len(resp.strengths) == 5
        assert resp.demo_mode is False

    def test_short_strengths_padded_to_min_4(self):
        obj = {
            "strengths": ["Brave"],
            "identity_name": "Test",
            "narrative": "N",
            "micro_action": "M",
            "reflection_prompt": "R",
        }
        resp = _profile_response_from_obj(obj)
        assert len(resp.strengths) >= 4

    def test_extra_strengths_capped_at_5(self):
        obj = {
            "strengths": ["A", "B", "C", "D", "E", "F", "G"],
            "identity_name": "Test",
            "narrative": "N",
            "micro_action": "M",
            "reflection_prompt": "R",
        }
        resp = _profile_response_from_obj(obj)
        assert len(resp.strengths) == 5

    def test_identity_name_truncated(self):
        obj = {
            "strengths": ["A", "B", "C", "D"],
            "identity_name": "X" * 200,
            "narrative": "N",
            "micro_action": "M",
            "reflection_prompt": "R",
        }
        resp = _profile_response_from_obj(obj)
        assert len(resp.identity_name) <= 80


# ─────────────────────────────────────────────────────────────────────────────
# 3. Mock profile
# ─────────────────────────────────────────────────────────────────────────────

class TestMockProfile:
    def test_returns_demo_mode_true(self):
        req = _make_req()
        resp = _mock_profile(req)
        assert resp.demo_mode is True

    def test_returns_valid_strengths(self):
        req = _make_req()
        resp = _mock_profile(req)
        assert 4 <= len(resp.strengths) <= 5

    def test_deterministic_for_same_inputs(self):
        """Same answer inputs should produce same mock output."""
        req = _make_req()
        r1 = _mock_profile(req)
        r2 = _mock_profile(req)
        assert r1.identity_name == r2.identity_name
        assert r1.strengths == r2.strengths


# ─────────────────────────────────────────────────────────────────────────────
# 4. answers_blob — ensures free-text truncation
# ─────────────────────────────────────────────────────────────────────────────

class TestAnswersBlob:
    def test_long_note_truncated_in_blob(self):
        answers = [AnswerIn(question_id="q1", mcq_id="a1", text="x" * 1000)]
        blob = _answers_blob(answers)
        # Each note is capped at 400 chars within the blob
        assert "x" * 401 not in blob

    def test_mcq_and_text_both_present(self):
        answers = [AnswerIn(question_id="q1", mcq_id="choice_a", text="Some note")]
        blob = _answers_blob(answers)
        assert "choice_a" in blob
        assert "Some note" in blob

    def test_no_text_omits_note(self):
        answers = [AnswerIn(question_id="q1", mcq_id="choice_a")]
        blob = _answers_blob(answers)
        assert "note=" not in blob


# ─────────────────────────────────────────────────────────────────────────────
# 5. generate_profile integration (demo path)
# ─────────────────────────────────────────────────────────────────────────────

class TestGenerateProfile:
    @pytest.mark.asyncio
    async def test_demo_mode_returns_response(self):
        from app.config import settings
        settings.__dict__["openai_api_key"] = None
        settings.__dict__["groq_api_key"] = None
        settings.__dict__["allow_llm_demo"] = True

        from app.ai_pipeline import generate_profile
        req = _make_req()
        resp = await generate_profile(req)

        assert resp.demo_mode is True
        assert len(resp.strengths) >= 4

    @pytest.mark.asyncio
    async def test_no_llm_no_demo_raises(self):
        from app.config import settings
        settings.__dict__["openai_api_key"] = None
        settings.__dict__["groq_api_key"] = None
        settings.__dict__["allow_llm_demo"] = False

        from app.ai_pipeline import generate_profile
        req = _make_req()
        with pytest.raises(ValueError, match="LLM"):
            await generate_profile(req)

        # Restore
        settings.__dict__["allow_llm_demo"] = True
