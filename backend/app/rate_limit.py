"""Best-effort in-memory rate limits (single worker). Use Redis etc. for multi-instance production."""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_lock = asyncio.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)
_MAX_TRACKED_KEYS = 8000


async def enforce_rate_limit(request: Request, *, key_suffix: str, max_requests: int, window_sec: float) -> None:
    if max_requests < 1 or window_sec <= 0:
        return
    client_host = request.client.host if request.client else "unknown"
    key = f"{client_host}:{key_suffix}"
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
