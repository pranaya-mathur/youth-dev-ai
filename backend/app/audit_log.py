"""Minimal logs for sensitive API actions (hashed device id only, no youth content)."""

from __future__ import annotations

import hashlib
import logging
import uuid

_log = logging.getLogger("youth_dev_ai.audit")


def user_fingerprint(user_id: uuid.UUID) -> str:
    return hashlib.sha256(str(user_id).encode()).hexdigest()[:16]


def log_export(user_id: uuid.UUID) -> None:
    _log.info("me_export user_fp=%s", user_fingerprint(user_id))


def log_server_delete(user_id: uuid.UUID, had_rows: bool) -> None:
    _log.info("me_delete user_fp=%s had_rows=%s", user_fingerprint(user_id), had_rows)


def log_purge(deleted_rows: int) -> None:
    _log.info("purge_inactive_users deleted_user_rows=%s", deleted_rows)
