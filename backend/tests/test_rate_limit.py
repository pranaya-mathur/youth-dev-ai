"""
Tests for the rate limiter (rate_limit.py).

Covers:
- Issue #1: in-memory limiter works in single-process mode
- Redis path is selected when REDIS_URL is set (structural check)
- 429 is raised when limit exceeded
- Limit resets after window
- Different key_suffixes are independent buckets
"""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


# ─────────────────────────────────────────────────────────────────────────────
# Helper: build a fake Request object
# ─────────────────────────────────────────────────────────────────────────────

def make_request(ip: str = "127.0.0.1") -> MagicMock:
    req = MagicMock()
    req.client = MagicMock()
    req.client.host = ip
    return req


# ─────────────────────────────────────────────────────────────────────────────
# 1. In-memory sliding window
# ─────────────────────────────────────────────────────────────────────────────

class TestInMemoryRateLimit:
    """Tests for the _memory_enforce path (no REDIS_URL)."""

    @pytest.mark.asyncio
    async def test_allows_up_to_limit(self):
        # Patch redis client to None so in-memory path is used
        import app.rate_limit as rl
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req = make_request("10.0.0.1")
        for _ in range(3):
            await rl.enforce_rate_limit(req, key_suffix="test_allow", max_requests=3, window_sec=60)

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_blocks_on_exceeding_limit(self):
        import app.rate_limit as rl
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req = make_request("10.0.0.2")
        for _ in range(3):
            await rl.enforce_rate_limit(req, key_suffix="test_block", max_requests=3, window_sec=60)

        with pytest.raises(HTTPException) as exc_info:
            await rl.enforce_rate_limit(req, key_suffix="test_block", max_requests=3, window_sec=60)

        assert exc_info.value.status_code == 429

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_different_suffixes_independent(self):
        """Different key_suffix values must not share state."""
        import app.rate_limit as rl
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req = make_request("10.0.0.3")
        # Fill bucket A to its limit
        for _ in range(2):
            await rl.enforce_rate_limit(req, key_suffix="bucket_a", max_requests=2, window_sec=60)

        # Bucket B should still allow requests
        await rl.enforce_rate_limit(req, key_suffix="bucket_b", max_requests=2, window_sec=60)

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_different_ips_independent(self):
        """Different client IPs must not share state."""
        import app.rate_limit as rl
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req_a = make_request("10.1.1.1")
        req_b = make_request("10.1.1.2")

        for _ in range(2):
            await rl.enforce_rate_limit(req_a, key_suffix="ip_test", max_requests=2, window_sec=60)
        # req_b should still be allowed
        await rl.enforce_rate_limit(req_b, key_suffix="ip_test", max_requests=2, window_sec=60)

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_window_expiry_allows_new_requests(self):
        """After the window expires old entries are evicted and new ones allowed."""
        import app.rate_limit as rl
        import time
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req = make_request("10.0.0.4")
        # Use a 1-second window
        await rl.enforce_rate_limit(req, key_suffix="expiry_test", max_requests=1, window_sec=1)

        # Should block immediately
        with pytest.raises(HTTPException):
            await rl.enforce_rate_limit(req, key_suffix="expiry_test", max_requests=1, window_sec=1)

        # Wait for window to slide
        await asyncio.sleep(1.1)
        # Should be allowed again
        await rl.enforce_rate_limit(req, key_suffix="expiry_test", max_requests=1, window_sec=1)

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_zero_max_requests_is_noop(self):
        """max_requests < 1 should never enforce (short-circuit)."""
        import app.rate_limit as rl
        req = make_request()
        # Should not raise for any number of calls
        for _ in range(100):
            await rl.enforce_rate_limit(req, key_suffix="noop", max_requests=0, window_sec=60)

    @pytest.mark.asyncio
    async def test_no_client_host_uses_unknown_key(self):
        """Request with no client should not crash."""
        import app.rate_limit as rl
        original = rl._redis_client
        rl._redis_client = None
        rl._buckets.clear()

        req = MagicMock()
        req.client = None
        await rl.enforce_rate_limit(req, key_suffix="no_host", max_requests=5, window_sec=60)

        rl._redis_client = original


# ─────────────────────────────────────────────────────────────────────────────
# 2. Redis path selection (structural)
# ─────────────────────────────────────────────────────────────────────────────

class TestRedisPathSelection:
    @pytest.mark.asyncio
    async def test_redis_enforce_called_when_client_set(self):
        """When _redis_client is set, _redis_enforce should be invoked."""
        import app.rate_limit as rl

        fake_redis = MagicMock()
        original = rl._redis_client
        rl._redis_client = fake_redis

        with patch.object(rl, "_redis_enforce", new_callable=AsyncMock) as mock_redis_fn:
            req = make_request()
            await rl.enforce_rate_limit(req, key_suffix="redis_test", max_requests=10, window_sec=60)
            mock_redis_fn.assert_called_once()

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_memory_enforce_called_when_no_redis(self):
        """When _redis_client is None, _memory_enforce should be invoked."""
        import app.rate_limit as rl

        original = rl._redis_client
        rl._redis_client = None

        with patch.object(rl, "_memory_enforce", new_callable=AsyncMock) as mock_mem_fn:
            req = make_request()
            await rl.enforce_rate_limit(req, key_suffix="mem_test", max_requests=10, window_sec=60)
            mock_mem_fn.assert_called_once()

        rl._redis_client = original


# ─────────────────────────────────────────────────────────────────────────────
# 3. Redis sliding-window logic (mocked pipeline)
# ─────────────────────────────────────────────────────────────────────────────

class TestRedisEnforce:
    @pytest.mark.asyncio
    async def test_redis_429_when_count_exceeds_limit(self):
        """_redis_enforce should raise 429 when zcard result > max_requests."""
        import app.rate_limit as rl

        # Build a mock pipeline that returns count = 6 (> max 5)
        mock_pipe = AsyncMock()
        mock_pipe.execute = AsyncMock(return_value=[0, None, 6, None])
        mock_pipe.zremrangebyscore = MagicMock()
        mock_pipe.zadd = MagicMock()
        mock_pipe.zcard = MagicMock()
        mock_pipe.expire = MagicMock()

        fake_redis = MagicMock()
        fake_redis.pipeline = MagicMock(return_value=mock_pipe)

        original = rl._redis_client
        rl._redis_client = fake_redis

        with pytest.raises(HTTPException) as exc_info:
            await rl._redis_enforce("rl:127.0.0.1:test", max_requests=5, window_sec=60)
        assert exc_info.value.status_code == 429

        rl._redis_client = original

    @pytest.mark.asyncio
    async def test_redis_no_raise_when_within_limit(self):
        """_redis_enforce must NOT raise when count <= max_requests."""
        import app.rate_limit as rl

        mock_pipe = AsyncMock()
        mock_pipe.execute = AsyncMock(return_value=[0, None, 3, None])
        mock_pipe.zremrangebyscore = MagicMock()
        mock_pipe.zadd = MagicMock()
        mock_pipe.zcard = MagicMock()
        mock_pipe.expire = MagicMock()

        fake_redis = MagicMock()
        fake_redis.pipeline = MagicMock(return_value=mock_pipe)

        original = rl._redis_client
        rl._redis_client = fake_redis

        # max_requests=5, count=3 → should pass
        await rl._redis_enforce("rl:127.0.0.1:test2", max_requests=5, window_sec=60)

        rl._redis_client = original
