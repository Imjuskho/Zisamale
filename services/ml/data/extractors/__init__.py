"""Base extraction infrastructure for Zisamale data pipelines.

Provides:
    * :class:`BaseExtractor` -- abstract base with retry logic, a circuit
      breaker, and transparent TTL response caching (Redis when available,
      filesystem otherwise).
    * :class:`RetryPolicy` -- exponential-backoff retry configuration.
    * :class:`CircuitBreaker` -- fail-fast protection against flaky upstreams.
    * :class:`TTLCache` -- Redis / filesystem cache backend.

All upstream I/O errors are normalised into two categories:

    * :class:`TransientError` -- worth retrying (timeouts, 5xx, rate limits).
    * :class:`PermanentError` -- never retried (bad request, auth failure).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import pickle
import random
import threading
import time
from abc import ABC
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

try:  # pragma: no cover - exercised only when redis is installed
    import redis as _redis
except ImportError:  # pragma: no cover
    _redis = None


class ExtractorError(Exception):
    """Base class for all extractor failures."""


class TransientError(ExtractorError):
    """Recoverable upstream failure; safe to retry with backoff."""


class PermanentError(ExtractorError):
    """Non-recoverable upstream failure; retrying will not help."""


class CircuitOpenError(ExtractorError):
    """Raised when a call is rejected because the circuit breaker is open."""


class CircuitState(Enum):
    """States of the classic circuit-breaker state machine."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Thread-safe circuit breaker protecting an upstream dependency.

    The breaker stays ``CLOSED`` while calls succeed. After
    ``failure_threshold`` consecutive failures it trips ``OPEN`` and rejects
    calls immediately for ``recovery_timeout`` seconds, after which it moves
    to ``HALF_OPEN`` and lets a single probe call through: success closes the
    circuit, failure re-opens it.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._clock = clock
        self._lock = threading.Lock()
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._opened_at: float | None = None

    @property
    def state(self) -> CircuitState:
        """Current breaker state, applying the recovery timeout if expired."""
        with self._lock:
            if (
                self._state is CircuitState.OPEN
                and self._opened_at is not None
                and self._clock() - self._opened_at >= self.recovery_timeout
            ):
                self._state = CircuitState.HALF_OPEN
            return self._state

    def before_call(self) -> None:
        """Raise :class:`CircuitOpenError` unless a call may proceed."""
        if self.state is CircuitState.OPEN:
            raise CircuitOpenError(
                f"Circuit breaker is open; retry after "
                f"{self.recovery_timeout:.0f}s recovery window"
            )

    def record_success(self) -> None:
        """Register a successful call; resets the breaker to ``CLOSED``."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._consecutive_failures = 0
            self._opened_at = None

    def record_failure(self) -> None:
        """Register a failed call; trips the breaker past the threshold."""
        with self._lock:
            self._consecutive_failures += 1
            if self._state is CircuitState.HALF_OPEN or (
                self._consecutive_failures >= self.failure_threshold
            ):
                self._state = CircuitState.OPEN
                self._opened_at = self._clock()


@dataclass(frozen=True)
class RetryPolicy:
    """Exponential-backoff retry configuration.

    Attributes:
        max_attempts: Total attempts including the first (minimum 1).
        backoff_base: Seconds before the first retry; doubles each attempt.
        backoff_max: Upper bound on any single sleep interval.
        jitter: Fraction of random jitter added to each sleep (0..1).
    """

    max_attempts: int = 3
    backoff_base: float = 1.0
    backoff_max: float = 30.0
    jitter: float = 0.25
    retry_on: tuple[type[Exception], ...] = (TransientError,)

    def delay_for_attempt(self, attempt: int, rng: random.Random | None = None) -> float:
        """Sleep duration in seconds after ``attempt`` (1-indexed) failed."""
        delay = min(self.backoff_base * (2 ** (attempt - 1)), self.backoff_max)
        jitter_frac = max(0.0, min(self.jitter, 1.0))
        return delay * (1.0 + rng.uniform(-jitter_frac, jitter_frac) if rng else jitter_frac * random.random())


class TTLCache:
    """Small TTL cache with a Redis backend and filesystem fallback.

    Values are pickled, so arbitrary payloads (dicts, lists, DataFrames) are
    supported. When neither a Redis client nor a directory is supplied the
    cache degrades to a no-op, which keeps extractors usable offline.
    """

    def __init__(
        self,
        namespace: str,
        ttl_seconds: float = 6 * 3600,
        redis_client: Any | None = None,
        cache_dir: str | Path | None = None,
    ) -> None:
        self.namespace = namespace
        self.ttl_seconds = ttl_seconds
        self._redis = redis_client
        if self._redis is None and cache_dir is None:
            cache_dir = os.environ.get(
                "ZISAMALE_CACHE_DIR",
                str(Path.home() / ".cache" / "zisamale" / "extractors"),
            )
        self.cache_dir: Path | None = Path(cache_dir) if cache_dir else None
        if self.cache_dir is not None:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    @property
    def backend(self) -> str:
        """Human-readable backend name: ``redis``, ``filesystem`` or ``none``."""
        if self._redis is not None:
            return "redis"
        if self.cache_dir is not None:
            return "filesystem"
        return "none"

    def _make_key(self, key_parts: Iterable[Any]) -> str:
        canonical = json.dumps([self.namespace, *key_parts], sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def get(self, key_parts: Iterable[Any]) -> Any | None:
        """Return the cached payload for ``key_parts`` or ``None`` if absent/expired."""
        key = self._make_key(key_parts)
        if self._redis is not None:
            raw = self._redis.get(key)
            if raw is None:
                return None
            return pickle.loads(raw)
        if self.cache_dir is not None:
            path = self.cache_dir / f"{key}.cache"
            if not path.exists():
                return None
            try:
                expires_at, payload = pickle.loads(path.read_bytes())
            except Exception:  # corrupted entry -- treat as a miss
                logger.warning("Discarding corrupted cache file %s", path)
                path.unlink(missing_ok=True)
                return None
            if time.time() >= expires_at:
                path.unlink(missing_ok=True)
                return None
            return payload
        return None

    def set(self, key_parts: Iterable[Any], value: Any, ttl_seconds: float | None = None) -> None:
        """Store ``value`` under ``key_parts`` with a time-to-live."""
        ttl = ttl_seconds if ttl_seconds is not None else self.ttl_seconds
        key = self._make_key(key_parts)
        if self._redis is not None:
            self._redis.set(key, pickle.dumps(value), ex=max(1, int(ttl)))
            return
        if self.cache_dir is not None:
            path = self.cache_dir / f"{key}.cache"
            tmp = path.with_suffix(".tmp")
            tmp.write_bytes(pickle.dumps((time.time() + ttl, value)))
            tmp.replace(path)


class BaseExtractor(ABC):
    """Abstract extractor combining retries, circuit breaking and caching.

    Subclasses implement domain-specific ``fetch_*`` methods and route every
    remote interaction through :meth:`_execute` (retry + breaker) and
    :meth:`_cached` (response caching).

    Args:
        name: Extractor name used for cache namespacing and logs.
        cache_ttl_seconds: Default response cache TTL (6 hours).
        redis_client: Optional pre-configured Redis client.
        cache_dir: Filesystem cache directory override.
        retry_policy: Retry behaviour; sensible defaults provided.
        circuit_breaker: Breaker instance; sensible defaults provided.
        sleep_fn: Sleep function (inject a no-op in tests).
        rng: Random source for backoff jitter (inject for determinism).
    """

    def __init__(
        self,
        name: str,
        cache_ttl_seconds: float = 6 * 3600,
        redis_client: Any | None = None,
        cache_dir: str | Path | None = None,
        retry_policy: RetryPolicy | None = None,
        circuit_breaker: CircuitBreaker | None = None,
        sleep_fn: Callable[[float], None] = time.sleep,
        rng: random.Random | None = None,
    ) -> None:
        self.name = name
        self.retry_policy = retry_policy or RetryPolicy()
        self.circuit_breaker = circuit_breaker or CircuitBreaker()
        self._sleep = sleep_fn
        self._rng = rng or random.Random()
        self.cache = TTLCache(
            namespace=name,
            ttl_seconds=cache_ttl_seconds,
            redis_client=redis_client,
            cache_dir=cache_dir,
        )

    def _execute(self, operation: Callable[[], T], description: str) -> T:
        """Run ``operation`` with circuit-breaking and exponential-backoff retries.

        Only :class:`TransientError` triggers a retry; the first
        :class:`PermanentError` propagates immediately.

        Raises:
            CircuitOpenError: If the breaker rejects the call.
            TransientError: If retries are exhausted.
            PermanentError: For non-retryable failures.
        """
        policy = self.retry_policy
        last_error: Exception | None = None
        for attempt in range(1, policy.max_attempts + 1):
            self.circuit_breaker.before_call()
            try:
                result = operation()
            except policy.retry_on as exc:
                self.circuit_breaker.record_failure()
                last_error = exc
                if attempt >= policy.max_attempts:
                    break
                delay = policy.delay_for_attempt(attempt, self._rng)
                logger.warning(
                    "%s: %s failed (attempt %d/%d): %s -- retrying in %.2fs",
                    self.name,
                    description,
                    attempt,
                    policy.max_attempts,
                    exc,
                    delay,
                )
                self._sleep(delay)
            else:
                self.circuit_breaker.record_success()
                return result
        raise last_error if last_error else TransientError(f"{description} failed")

    def _cached(self, key_parts: list[Any], producer: Callable[[], T]) -> T:
        """Return cached response for ``key_parts``, calling ``producer`` on miss."""
        cached = self.cache.get(key_parts)
        if cached is not None:
            logger.debug("%s: cache hit for %s", self.name, key_parts)
            return cached
        value = producer()
        self.cache.set(key_parts, value)
        return value


__all__ = [
    "BaseExtractor",
    "CircuitBreaker",
    "CircuitOpenError",
    "CircuitState",
    "ExtractorError",
    "PermanentError",
    "RetryPolicy",
    "TTLCache",
    "TransientError",
]
