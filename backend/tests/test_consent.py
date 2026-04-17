"""
Tests for consent_validate.py.

Covers:
- Valid consent passes for each age band
- Missing required flags raise ValueError
- Stale / future / malformed timestamps raise ValueError
- Guardian attestation requirement for under-17
- accepted_age_capacity requirement for 17-18
- Invalid age band rejected
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.consent_validate import validate_consent
from app.policy_constants import POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS
from app.schemas import ConsentIn


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _consent(**overrides) -> ConsentIn:
    """Build a valid ConsentIn, optionally overriding any field."""
    now_iso = datetime.now(timezone.utc).isoformat()
    base = dict(
        accepted_privacy=True,
        accepted_terms=True,
        accepted_ai_processing=True,
        guardian_attested=False,
        accepted_age_capacity=True,
        policy_version_privacy=POLICY_VERSION_PRIVACY,
        policy_version_terms=POLICY_VERSION_TERMS,
        recorded_at=now_iso,
    )
    base.update(overrides)
    return ConsentIn(**base)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Happy paths
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("age_band,extra", [
    ("17-18", {"accepted_age_capacity": True, "guardian_attested": False}),
    ("14-16", {"guardian_attested": True, "accepted_age_capacity": False}),
    ("11-13", {"guardian_attested": True, "accepted_age_capacity": False}),
])
def test_valid_consent_passes(age_band, extra):
    c = _consent(**extra)
    validate_consent(age_band, c)  # Should not raise


# ─────────────────────────────────────────────────────────────────────────────
# 2. Required boolean consents
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("missing_field", [
    "accepted_privacy",
    "accepted_terms",
    "accepted_ai_processing",
])
def test_missing_required_consent_raises(missing_field):
    c = _consent(**{missing_field: False}, accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Aa]ll required consents"):
        validate_consent("17-18", c)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Policy version checks
# ─────────────────────────────────────────────────────────────────────────────

def test_wrong_privacy_version_raises():
    c = _consent(policy_version_privacy="1999-01-01", accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Pp]rivacy"):
        validate_consent("17-18", c)


def test_wrong_terms_version_raises():
    c = _consent(policy_version_terms="1999-01-01", accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Tt]erms"):
        validate_consent("17-18", c)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Age-band attestation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("age_band", ["11-13", "14-16"])
def test_guardian_not_attested_raises(age_band):
    c = _consent(guardian_attested=False, accepted_age_capacity=False)
    with pytest.raises(ValueError, match="[Gg]uardian"):
        validate_consent(age_band, c)


def test_17_18_without_age_capacity_raises():
    c = _consent(accepted_age_capacity=False, guardian_attested=False)
    with pytest.raises(ValueError, match="[Uu]nderstand"):
        validate_consent("17-18", c)


def test_invalid_age_band_raises():
    c = _consent(accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Ii]nvalid age band"):
        validate_consent("19-25", c)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Timestamp validation
# ─────────────────────────────────────────────────────────────────────────────

def test_future_timestamp_raises():
    future = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    c = _consent(recorded_at=future, accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Ii]nvalid consent timestamp"):
        validate_consent("17-18", c)


def test_stale_timestamp_raises():
    stale = (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
    c = _consent(recorded_at=stale, accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Ee]xpired"):
        validate_consent("17-18", c)


def test_malformed_timestamp_raises():
    c = _consent(recorded_at="not-a-date", accepted_age_capacity=True)
    with pytest.raises(ValueError, match="[Ii]nvalid consent timestamp"):
        validate_consent("17-18", c)


def test_z_suffix_timestamp_accepted():
    """'Z' suffix (common JS output) should be treated as UTC."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    c = _consent(recorded_at=ts, accepted_age_capacity=True)
    validate_consent("17-18", c)  # Should not raise
