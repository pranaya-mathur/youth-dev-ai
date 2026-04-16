from typing import Literal

from pydantic import BaseModel, Field


class AnswerIn(BaseModel):
    question_id: str
    mcq_id: str | None = None
    text: str | None = None


class ConsentIn(BaseModel):
    accepted_privacy: bool = False
    accepted_terms: bool = False
    accepted_ai_processing: bool = False
    guardian_attested: bool = False
    accepted_age_capacity: bool = False
    policy_version_privacy: str
    policy_version_terms: str
    recorded_at: str = Field(..., description="ISO-8601 timestamp when the user submitted consent")


class ProfileRequest(BaseModel):
    age_band: str = Field(..., description="11-13 | 14-16 | 17-18")
    nickname: str | None = Field(None, max_length=40)
    answers: list[AnswerIn]
    consent: ConsentIn


class ProfileResponse(BaseModel):
    strengths: list[str] = Field(..., min_length=4, max_length=5)
    identity_name: str
    narrative: str
    micro_action: str
    reflection_prompt: str
    demo_mode: bool = False


class CoachChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class CoachRequest(BaseModel):
    age_band: str = Field(..., description="11-13 | 14-16 | 17-18")
    nickname: str | None = Field(None, max_length=40)
    messages: list[CoachChatMessage] = Field(..., max_length=24)
    consent: ConsentIn


class CoachResponse(BaseModel):
    reply: str
    demo_mode: bool = False


class AppHelpRequest(BaseModel):
    """Product / navigation help; no consent or age (see POST /api/app-help)."""

    messages: list[CoachChatMessage] = Field(..., max_length=24)


class ProfileSnapshotOut(BaseModel):
    at: str
    age_band: str
    identity_name: str
    strengths: list[str]
    demo_mode: bool


class GamificationOut(BaseModel):
    xp: int
    badges: list[str]
    streak_days: int
    last_streak_mark: str | None = None


class JournalEntryOut(BaseModel):
    id: str
    at: str
    prompt_id: str
    text: str


class MeResponse(BaseModel):
    user_id: str
    snapshots: list[ProfileSnapshotOut]
    gamification: GamificationOut
    journal: list[JournalEntryOut]


class JournalRequest(BaseModel):
    age_band: str = Field(..., description="11-13 | 14-16 | 17-18")
    prompt_id: str = Field(..., max_length=64)
    text: str = Field(..., max_length=2000)
    consent: ConsentIn


class ServerDataDeleteResponse(BaseModel):
    ok: bool = True
    had_server_rows: bool


class ServerDataDeleteRequest(BaseModel):
    confirm: Literal["delete_my_server_data"]


class PurgeMaintenanceRequest(BaseModel):
    confirm: Literal["purge_inactive_users"]


class PurgeMaintenanceResponse(BaseModel):
    ok: bool = True
    deleted_user_rows: int


class RecurringStrength(BaseModel):
    name: str
    count: int


class IdentityHistoryItem(BaseModel):
    at: str
    name: str


class XPProgressItem(BaseModel):
    at: str
    xp: int
    type: str


class TrendsResponse(BaseModel):
    user_id: str
    top_strengths: list[RecurringStrength]
    identity_history: list[IdentityHistoryItem]
    xp_progression: list[XPProgressItem]


class MicroActionResponse(BaseModel):
    ok: bool = True
    xp_gained: int
    xp_total: int
