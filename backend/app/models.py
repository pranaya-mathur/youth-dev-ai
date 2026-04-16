import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProfileRun(Base):
    __tablename__ = "profile_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    age_band: Mapped[str] = mapped_column(String(16))
    nickname: Mapped[str | None] = mapped_column(String(80), nullable=True)
    identity_name: Mapped[str] = mapped_column(String(160))
    strengths: Mapped[list[Any]] = mapped_column(JSONB)
    narrative: Mapped[str] = mapped_column(Text())
    micro_action: Mapped[str] = mapped_column(Text())
    micro_action_done: Mapped[bool] = mapped_column(default=False)
    reflection_prompt: Mapped[str] = mapped_column(Text())
    demo_mode: Mapped[bool] = mapped_column(default=False)
    result_hash: Mapped[str] = mapped_column(String(200), index=True)
    answers_json: Mapped[list[Any]] = mapped_column(JSONB)


class GamificationRow(Base):
    __tablename__ = "gamification"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    badges: Mapped[list[Any]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    last_streak_mark: Mapped[str | None] = mapped_column(String(32), nullable=True)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    prompt_id: Mapped[str] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text())


class CoachMessage(Base):
    __tablename__ = "coach_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text())
