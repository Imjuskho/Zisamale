"""Circuit breaker pattern for external service integrations.

States:
    CLOSED     - normal operation, calls pass through, failures are counted
    OPEN       - failure threshold exceeded, calls fail fast with CircuitOpenError
    HALF_OPEN  - recovery timeout elapsed, a limited number of trial calls are allowed

Thread-safety: single asyncio loop; state transitions are guarded by an
asyncio.Lock so concurrent coroutines cannot race the breaker open.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from collections.abc import Awaitable, Callable
from enum import StrEnum
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(StrEnum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(RuntimeError):
    """Raised when a call is attempted while the circuit is OPEN."""

    def __init__(self, name: str, retry_after: float) -> None:
        self.name = name
        self.retry_after = retry_after
        super().__init__(
            f"Circuit '{name}' is OPEN; retry after {retry_after:.2f}s"
        )


class CircuitBreaker:
    """Async circuit breaker with closed/open/half-open states.

    Args:
        failure_threshold: consecutive failures before the circuit opens.
        recovery_timeout: seconds the circuit stays OPEN before allowing a
            trial call (HALF_OPEN).
        name: identifier used in logs and the shared breaker registry.
        half_open_max_calls: max concurrent trial calls allowed in HALF_OPEN.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        name: str = "default",
        half_open_max_calls: int = 1,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError("failure_threshold must be >= 1")
        self.failure_threshold = failure_threshold
        self.recovery_timeout = float(recovery_timeout)
        self.name = name
        self.half_open_max_calls = half_open_max_calls

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float | None = None  # epoch seconds
        self._opened_at: float | None = None  # monotonic seconds
        self._half_open_calls_in_flight = 0
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------ state

    @property
    def state(self) -> CircuitState:
        if (
            self._state is CircuitState.OPEN
            and self._opened_at is not None
            and time.monotonic() - self._opened_at >= self.recovery_timeout
        ):
            return CircuitState.HALF_OPEN
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    @property
    def success_count(self) -> int:
        return self._success_count

    @property
    def last_failure_time(self) -> float | None:
        return self._last_failure_time

    @property
    def opened_at(self) -> float | None:
        return self._opened_at

    def stats(self) -> dict[str, Any]:
        state = self.state
        stats: dict[str, Any] = {
            "name": self.name,
            "state": state.value,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "last_failure_time": self._last_failure_time,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout": self.recovery_timeout,
        }
        if state is CircuitState.OPEN and self._opened_at is not None:
            stats["retry_after_seconds"] = round(
                max(0.0, self.recovery_timeout - (time.monotonic() - self._opened_at)), 3
            )
        return stats

    def reset(self) -> None:
        """Force the breaker back to CLOSED with cleared counters."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._opened_at = None
        self._half_open_calls_in_flight = 0
        logger.info("circuit_breaker.reset", extra={"breaker": self.name})

    # --------------------------------------------------------------- gateways

    async def _acquire(self) -> None:
        async with self._lock:
            state = self.state
            if state is CircuitState.OPEN:
                retry_after = max(
                    0.0,
                    self.recovery_timeout - (time.monotonic() - (self._opened_at or 0.0)),
                )
                raise CircuitOpenError(self.name, retry_after)
            if state is CircuitState.HALF_OPEN:
                if self._state is CircuitState.OPEN:
                    # First trial call after timeout elapses: transition.
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls_in_flight = 0
                    logger.info(
                        "circuit_breaker.half_open",
                        extra={"breaker": self.name},
                    )
                if self._half_open_calls_in_flight >= self.half_open_max_calls:
                    raise CircuitOpenError(self.name, self.recovery_timeout)
                self._half_open_calls_in_flight += 1

    async def _release_trial(self) -> None:
        async with self._lock:
            self._half_open_calls_in_flight = max(
                0, self._half_open_calls_in_flight - 1
            )

    async def record_success(self) -> None:
        async with self._lock:
            self._success_count += 1
            recovered = self._state is CircuitState.HALF_OPEN
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._opened_at = None
            self._half_open_calls_in_flight = 0
            if recovered:
                logger.info(
                    "circuit_breaker.closed_after_recovery",
                    extra={"breaker": self.name},
                )

    async def record_failure(self) -> None:
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            if self._state is CircuitState.HALF_OPEN:
                self._trip()
                return
            if self._failure_count >= self.failure_threshold:
                self._trip()

    def _trip(self) -> None:
        self._state = CircuitState.OPEN
        self._opened_at = time.monotonic()
        self._half_open_calls_in_flight = 0
        logger.warning(
            "circuit_breaker.opened",
            extra={
                "breaker": self.name,
                "failures": self._failure_count,
                "recovery_timeout": self.recovery_timeout,
            },
        )

    # ------------------------------------------------------------------- call

    async def call(self, func: Callable[..., Awaitable[T]], *args: Any, **kwargs: Any) -> T:
        """Execute an async callable through the breaker."""
        await self._acquire()
        try:
            result = await func(*args, **kwargs)
        except BaseException:
            await self.record_failure()
            raise
        else:
            await self.record_success()
            return result
        finally:
            if self.state is CircuitState.HALF_OPEN or self._half_open_calls_in_flight:
                await self._release_trial()


# ----------------------------------------------------------------- registry

_breakers: dict[str, CircuitBreaker] = {}


def get_or_create_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0,
) -> CircuitBreaker:
    """Return the registered breaker for `name`, creating it on first use.

    Safe under a single event loop: dict get-or-set on one key is atomic
    between awaits.
    """
    breaker = _breakers.get(name)
    if breaker is None:
        breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            name=name,
        )
        _breakers[name] = breaker
    return breaker


def get_breaker(name: str) -> CircuitBreaker:
    """Alias for :func:`get_or_create_breaker` with default tuning."""
    return get_or_create_breaker(name)


def all_breaker_stats() -> list[dict[str, Any]]:
    return [b.stats() for b in _breakers.values()]


def reset_all_breakers() -> None:
    for breaker in _breakers.values():
        breaker.reset()


def circuit_breaker(
    name: str = "default",
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0,
) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Decorator: route an async function through a named circuit breaker.

    Example:
        @circuit_breaker(name="dhis2")
        async def pull_data(): ...
    """

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        breaker = get_or_create_breaker(
            name, failure_threshold=failure_threshold, recovery_timeout=recovery_timeout
        )

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            return await breaker.call(func, *args, **kwargs)

        wrapper.__circuit_breaker__ = breaker  # type: ignore[attr-defined]
        return wrapper

    return decorator
