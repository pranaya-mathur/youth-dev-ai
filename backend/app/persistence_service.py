from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CoachMessage, GamificationRow, JournalEntry, ProfileRun, User
from app.schemas import AnswerIn, ProfileRequest, ProfileResponse

BADGE_FIRST_SPARK = "first_spark"
BADGE_PATH_WALKER = "path_walker"
BADGE_STEADY_GLOW = "steady_glow"


def _result_hash(resp: ProfileResponse) -> str:
    return f"{resp.identity_name}|{','.join(resp.strengths)}"[:200]


def _today_utc() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _days_between(a: str, b: str) -> int:
    da = datetime.fromisoformat(a).date()
    db = datetime.fromisoformat(b).date()
    return (db - da).days


def _answers_to_json(answers: list[AnswerIn]) -> list[dict[str, Any]]:
    return [a.model_dump() for a in answers]


async def _ensure_user(session: AsyncSession, user_id: uuid.UUID) -> None:
    row = await session.get(User, user_id)
    now = datetime.now(timezone.utc)
    if row is None:
        session.add(User(id=user_id, created_at=now, last_seen_at=now))
    else:
        row.last_seen_at = now


async def _get_or_create_gamification(session: AsyncSession, user_id: uuid.UUID) -> GamificationRow:
    row = await session.get(GamificationRow, user_id)
    if row is None:
        row = GamificationRow(
            user_id=user_id,
            xp=0,
            last_streak_mark=None,
            streak_days=0,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(row)
        await session.flush()
    if row.badges is None:
        row.badges = []
    return row


def _add_badge(badges: list[str], badge: str) -> bool:
    if badge in badges:
        return False
    badges.append(badge)
    return True


async def save_profile_run_if_new(
    session: AsyncSession,
    user_id: uuid.UUID,
    req: ProfileRequest,
    resp: ProfileResponse,
) -> dict[str, Any] | None:
    """
    Persists profile + bumps gamification when this result_hash is new for the user.
    Returns a small delta dict for clients, or None if duplicate hash.
    """
    h = _result_hash(resp)
    existing = await session.execute(
        select(ProfileRun.id).where(ProfileRun.user_id == user_id, ProfileRun.result_hash == h).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return None

    await _ensure_user(session, user_id)

    run = ProfileRun(
        id=uuid.uuid4(),
        user_id=user_id,
        age_band=req.age_band,
        nickname=req.nickname,
        identity_name=resp.identity_name,
        strengths=list(resp.strengths),
        narrative=resp.narrative,
        micro_action=resp.micro_action,
        reflection_prompt=resp.reflection_prompt,
        demo_mode=resp.demo_mode,
        result_hash=h,
        answers_json=_answers_to_json(req.answers),
    )
    session.add(run)
    await session.flush()

    total = int(
        await session.scalar(select(func.count(ProfileRun.id)).where(ProfileRun.user_id == user_id)) or 0
    )

    g = await _get_or_create_gamification(session, user_id)
    xp_gain = 55
    g.xp += xp_gain
    today = _today_utc()
    if not g.last_streak_mark:
        g.streak_days = 1
        g.last_streak_mark = today
    else:
        diff = _days_between(g.last_streak_mark, today)
        if diff == 0:
            pass
        elif diff == 1:
            g.streak_days += 1
            g.last_streak_mark = today
        else:
            g.streak_days = 1
            g.last_streak_mark = today

    new_badges: list[str] = []
    if total == 1 and _add_badge(g.badges, BADGE_FIRST_SPARK):
        new_badges.append(BADGE_FIRST_SPARK)
    if total >= 3 and _add_badge(g.badges, BADGE_PATH_WALKER):
        new_badges.append(BADGE_PATH_WALKER)
    if g.streak_days >= 3 and _add_badge(g.badges, BADGE_STEADY_GLOW):
        new_badges.append(BADGE_STEADY_GLOW)

    g.updated_at = datetime.now(timezone.utc)

    return {
        "xp_gained": xp_gain,
        "new_badges": new_badges,
        "level": (g.xp // 120) + 1,
        "streak_days": g.streak_days,
        "xp_total": g.xp,
        "badges": list(g.badges),
    }


        )
    )


async def mark_micro_action_done(session: AsyncSession, user_id: uuid.UUID) -> dict[str, Any] | None:
    """
    Finds the latest ProfileRun for the user that isn't done yet, marks it done, and adds 15 XP.
    """
    row = (
        (
            await session.execute(
                select(ProfileRun)
                .where(ProfileRun.user_id == user_id, ProfileRun.micro_action_done == False)
                .order_by(ProfileRun.created_at.desc())
                .limit(1)
            )
        )
        .scalars()
        .first()
    )
    if row is None:
        return None

    row.micro_action_done = True
    g = await _get_or_create_gamification(session, user_id)
    xp_gain = 15
    g.xp += xp_gain
    g.updated_at = datetime.now(timezone.utc)
    return {"xp_gained": xp_gain, "xp_total": g.xp}


async def append_coach_exchange(
    session: AsyncSession,
    user_id: uuid.UUID,
    user_text: str,
    assistant_text: str,
) -> None:
    await _ensure_user(session, user_id)
    now = datetime.now(timezone.utc)
    session.add(CoachMessage(id=uuid.uuid4(), user_id=user_id, role="user", content=user_text[:4000]))
    session.add(CoachMessage(id=uuid.uuid4(), user_id=user_id, role="assistant", content=assistant_text[:4000]))


async def fetch_me_payload(session: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    await _ensure_user(session, user_id)

    runs = (
        (
            await session.execute(
                select(ProfileRun)
                .where(ProfileRun.user_id == user_id)
                .order_by(ProfileRun.created_at.desc())
                .limit(30)
            )
        )
        .scalars()
        .all()
    )

    snaps: list[dict[str, Any]] = []
    for r in runs:
        snaps.append(
            {
                "at": r.created_at.isoformat(),
                "age_band": r.age_band,
                "identity_name": r.identity_name,
                "strengths": list(r.strengths or []),
                "demo_mode": bool(r.demo_mode),
            }
        )

    g = await _get_or_create_gamification(session, user_id)

    journals = (
        (
            await session.execute(
                select(JournalEntry)
                .where(JournalEntry.user_id == user_id)
                .order_by(JournalEntry.created_at.desc())
                .limit(40)
            )
        )
        .scalars()
        .all()
    )
    journal_out = [
        {
            "id": str(j.id),
            "at": j.created_at.isoformat(),
            "prompt_id": j.prompt_id,
            "text": j.body,
        }
        for j in journals
    ]

    return {
        "user_id": str(user_id),
        "snapshots": snaps,
        "gamification": {
            "xp": g.xp,
            "badges": list(g.badges or []),
            "streak_days": g.streak_days,
            "last_streak_mark": g.last_streak_mark,
        },
        "journal": journal_out,
    }


async def fetch_trends_payload(session: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    """
    Aggregates top recurring strengths, identity history, and estimated XP progression.
    """
    runs = (
        (
            await session.execute(
                select(ProfileRun)
                .where(ProfileRun.user_id == user_id)
                .order_by(ProfileRun.created_at.asc())
            )
        )
        .scalars()
        .all()
    )

    all_strengths: list[str] = []
    identity_history: list[dict[str, Any]] = []
    xp_events: list[dict[str, Any]] = []

    for r in runs:
        all_strengths.extend(r.strengths or [])
        identity_history.append({"at": r.created_at.isoformat(), "name": r.identity_name})
        xp_events.append({"at": r.created_at, "gain": 55, "type": "profile"})
        if r.micro_action_done:
            # We don't have a timestamp for when it was done, so we stick it near the profile run
            # or just ignore it for the arc if precision isn't critical.
            # For now, let's assume it was done shortly after.
            xp_events.append({"at": r.created_at + timedelta(hours=1), "gain": 15, "type": "micro_action"})

    journals = (
        (
            await session.execute(
                select(JournalEntry)
                .where(JournalEntry.user_id == user_id)
                .order_by(JournalEntry.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    for j in journals:
        xp_events.append({"at": j.created_at, "gain": 8, "type": "journal"})

    # Sort events by time to build the progression arc
    xp_events.sort(key=lambda x: x["at"])
    progression: list[dict[str, Any]] = []
    cumulative_xp = 0
    for e in xp_events:
        cumulative_xp += e["gain"]
        progression.append({"at": e["at"].isoformat(), "xp": cumulative_xp, "type": e["type"]})

    top_strengths = [
        {"name": s, "count": c} for s, c in Counter(all_strengths).most_common(8)
    ]

    return {
        "user_id": str(user_id),
        "top_strengths": top_strengths,
        "identity_history": identity_history,
        "xp_progression": progression,
    }


async def delete_all_user_data(session: AsyncSession, user_id: uuid.UUID) -> bool:
    """Delete the user row; FK ondelete=CASCADE removes related rows. Returns True if a row existed."""
    row = await session.get(User, user_id)
    if row is None:
        return False
    await session.delete(row)
    return True


async def fetch_full_export_payload(session: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    """Portable JSON for the device-scoped user (no _ensure_user — avoids creating empty users)."""
    exported_at = datetime.now(timezone.utc).isoformat()
    urow = await session.get(User, user_id)
    if urow is None:
        return {
            "export_schema": "youth-dev-ai/1",
            "exported_at": exported_at,
            "user_id": str(user_id),
            "user": None,
            "profile_runs": [],
            "gamification": None,
            "journal": [],
            "coach_messages": [],
        }

    runs = (
        (
            await session.execute(
                select(ProfileRun)
                .where(ProfileRun.user_id == user_id)
                .order_by(ProfileRun.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    profile_runs: list[dict[str, Any]] = []
    for r in runs:
        profile_runs.append(
            {
                "id": str(r.id),
                "created_at": r.created_at.isoformat(),
                "age_band": r.age_band,
                "nickname": r.nickname,
                "identity_name": r.identity_name,
                "strengths": list(r.strengths or []),
                "narrative": r.narrative,
                "micro_action": r.micro_action,
                "reflection_prompt": r.reflection_prompt,
                "demo_mode": bool(r.demo_mode),
                "result_hash": r.result_hash,
                "answers": list(r.answers_json or []),
            }
        )

    g = await session.get(GamificationRow, user_id)
    gamification: dict[str, Any] | None = None
    if g is not None:
        gamification = {
            "xp": g.xp,
            "badges": list(g.badges or []),
            "streak_days": g.streak_days,
            "last_streak_mark": g.last_streak_mark,
            "updated_at": g.updated_at.isoformat(),
        }

    journals = (
        (
            await session.execute(
                select(JournalEntry)
                .where(JournalEntry.user_id == user_id)
                .order_by(JournalEntry.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    journal_out = [
        {
            "id": str(j.id),
            "at": j.created_at.isoformat(),
            "prompt_id": j.prompt_id,
            "text": j.body,
        }
        for j in journals
    ]

    coach_rows = (
        (
            await session.execute(
                select(CoachMessage)
                .where(CoachMessage.user_id == user_id)
                .order_by(CoachMessage.created_at.asc())
                .limit(500)
            )
        )
        .scalars()
        .all()
    )
    coach_out = [
        {
            "id": str(m.id),
            "at": m.created_at.isoformat(),
            "role": m.role,
            "content": m.content,
        }
        for m in coach_rows
    ]

    return {
        "export_schema": "youth-dev-ai/1",
        "exported_at": exported_at,
        "user_id": str(user_id),
        "user": {
            "created_at": urow.created_at.isoformat(),
            "last_seen_at": urow.last_seen_at.isoformat() if urow.last_seen_at else None,
        },
        "profile_runs": profile_runs,
        "gamification": gamification,
        "journal": journal_out,
        "coach_messages": coach_out,
    }


async def purge_users_inactive_older_than(session: AsyncSession, days: int) -> int:
    """Delete users whose last activity (last_seen_at or created_at) is older than ``days``."""
    if days < 1:
        return 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    res = await session.execute(delete(User).where(func.coalesce(User.last_seen_at, User.created_at) < cutoff))
    return int(res.rowcount or 0)
