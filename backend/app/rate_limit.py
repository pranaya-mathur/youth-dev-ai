"""
Rate limiting with optional Redis backend.

Multi-worker / multi-instance deployments
==========================================
Set ``REDIS_URL`` in the environment (e.g. ``redis://localhost:6379/0``) to
enable a shared Redis sliding-window counter that is consistent across all
Uvicorn workers and replicas.

Single-worker / demo deployments
=================================
When ``REDIS_URL`` is absent the module falls back to an in-process sliding
window (asyncio-safe). This is adequate for a single-worker process but WILL
be bypassed in multi-worker or multi-replica setups — keep that in mind for
production.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

# ---------------------------------------------------------------------------
# Optional Redis backend
# ---------------------------------------------------------------------------

_redis_client = None  # type: ignore[assignment]

try:
    import redis.asyncio as aioredis  # type: ignore[import]

    _REDIS_URL = os.environ.get("REDIS_URL", "").strip()
    if _REDIS_URL:
        _redis_client = aioredis.from_url(_REDIS_URL, decode_responses=True)
except ImportError:
    pass  # redis package not installed — in-memory fallback

# ---------------------------------------------------------------------------
# In-memory fallback (single-worker only)
# ---------------------------------------------------------------------------

_lock = asyncio.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)
_MAX_TRACKED_KEYS = 8000


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def enforce_rate_limit(
    request: Request,
    *,
    key_suffix: str,
    max_requests: int,
    window_sec: float,
) -> None:
    """Raise HTTP 429 when the caller exceeds ``max_requests`` in ``window_sec`` seconds.

    Uses Redis sliding-window when REDIS_URL is configured, otherwise falls
    back to an in-process deque (single-worker safe).
    """
    if max_requests < 1 or window_sec <= 0:
        return

    client_host = request.client.host if request.client else "unknown"
    key = f"rl:{client_host}:{key_suffix}"

    if _redis_client is not None:
        await _redis_enforce(key, max_requests=max_requests, window_sec=window_sec)
    else:
        await _memory_enforce(key, max_requests=max_requests, window_sec=window_sec)


# ---------------------------------------------------------------------------
# Backends
# ---------------------------------------------------------------------------


async def _redis_enforce(key: str, *, max_requests: int, window_sec: float) -> None:
    """Sliding-window rate limit backed by Redis ZADD/ZREMRANGEBYSCORE.

    Each member in the sorted set is a unique float timestamp so multiple
    requests within the same millisecond are all counted correctly.
    """
    now = time.time()
    window_start = now - window_sec

    pipe = _redis_client.pipeline()
    # Remove entries older than the window
    pipe.zremrangebyscore(key, "-inf", window_start)
    # Add current request (member = unique string to avoid collisions)
    member = f"{now:.6f}-{id(pipe)}"
    pipe.zadd(key, {member: now})
    # Count entries in the window
    pipe.zcard(key)
    # Expire the key slightly beyond the window to allow TTL cleanup
    pipe.expire(key, int(window_sec) + 10)
    results = await pipe.execute()

    count = results[2]  # zcard result
    if count > max_requests:
        raise HTTPException(
            status_code=429,
            detail="Too many requests for this action. Try again later.",
        )


async def _memory_enforce(key: str, *, max_requests: int, window_sec: float) -> None:
    """In-process sliding window (single-worker / demo only)."""
    now = time.monotonic()
    cutoff = now - window_sec

    async with _lock:
        if len(_buckets) > _MAX_TRACKED_KEYS:
            for stale_key in list(_buckets.keys())[:1200]:
                _buckets.pop(stale_key, None)

        q = _buckets[key]
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="Too many requests for this action. Try again later.",
            )
        q.append(now)
