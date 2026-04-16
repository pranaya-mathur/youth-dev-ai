from datetime import datetime, timezone

from app.policy_constants import POLICY_VERSION_PRIVACY, POLICY_VERSION_TERMS
from app.schemas import ConsentIn


def validate_consent(age_band: str, c: ConsentIn) -> None:
    if c.policy_version_privacy != POLICY_VERSION_PRIVACY:
        raise ValueError(
            "Your privacy acknowledgment is out of date. Please refresh the page and accept the latest policies."
        )
    if c.policy_version_terms != POLICY_VERSION_TERMS:
        raise ValueError(
            "Your terms acknowledgment is out of date. Please refresh the page and accept the latest policies."
        )
    if not (c.accepted_privacy and c.accepted_terms and c.accepted_ai_processing):
        raise ValueError("All required consents must be accepted before generating a profile.")

    if age_band in ("11-13", "14-16"):
        if not c.guardian_attested:
            raise ValueError(
                "For your age band, a parent or guardian must confirm they reviewed Youth Dev with you."
            )
    elif age_band == "17-18":
        if not c.accepted_age_capacity:
            raise ValueError(
                "Please confirm you understand how Youth Dev works and that you may use it yourself."
            )
    else:
        raise ValueError("Invalid age band.")

    try:
        raw = c.recorded_at.replace("Z", "+00:00")
        ts = datetime.fromisoformat(raw)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
    except Exception as e:
        raise ValueError("Invalid consent timestamp.") from e

    now = datetime.now(timezone.utc)
    if ts > now:
        raise ValueError("Invalid consent timestamp.")
    if (now - ts).days > 30:
        raise ValueError("Consent has expired. Please review and accept the policies again.")
