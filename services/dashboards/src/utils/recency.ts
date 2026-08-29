/**
 * RECENCY — the one module for "how long ago was this timestamp?".
 *
 * Staleness arithmetic used to be copy-pasted across dashboards, marker
 * layers, and tables (hours vs days vs rounded, each with its own
 * NaN behavior). Every helper takes an injectable `now` (the pattern
 * AlertCommandCenter.formatTimeRemaining established) so tests pin the
 * clock instead of racing Date.now().
 */

export type TimestampInput = string | number | Date;

const MS_PER_HOUR = 3_600_000;

function epochMs(input: TimestampInput): number | null {
  const t = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Fractional hours since `input`; null when the timestamp is unparseable. */
export function hoursSince(input: TimestampInput, now: Date = new Date()): number | null {
  const t = epochMs(input);
  if (t === null) return null;
  return (now.getTime() - t) / MS_PER_HOUR;
}

/** Whole days (floored) since `input`; null when unparseable. */
export function daysSince(input: TimestampInput, now: Date = new Date()): number | null {
  const hours = hoursSince(input, now);
  if (hours === null) return null;
  return Math.floor(hours / 24);
}

/** True when `input` is older than `thresholdHours` (unparseable ⇒ not older). */
export function isOlderThan(
  input: TimestampInput,
  thresholdHours: number,
  now: Date = new Date(),
): boolean {
  const hours = hoursSince(input, now);
  return hours !== null && hours > thresholdHours;
}

// ── Freshness bands (surveillance honesty) ────────────────────────
// < 7 days live · < 30 recent · < 180 stale · else historic.

export type FreshnessLevel = "live" | "recent" | "stale" | "historic";

export function freshnessFromSync(
  input: TimestampInput | null | undefined,
  now: Date = new Date(),
): FreshnessLevel {
  const days = input === null || input === undefined ? null : daysSince(input, now);
  if (days === null) return "historic";
  if (days < 7) return "live";
  if (days < 30) return "recent";
  if (days < 180) return "stale";
  return "historic";
}

export interface FreshnessAgeParts {
  value: number;
  unit: "d" | "w" | "mo" | "y";
}

/** Human age parts for badge copy; null when unparseable. */
export function freshnessAgeParts(
  input: TimestampInput | null | undefined,
  now: Date = new Date(),
): FreshnessAgeParts | null {
  if (input === null || input === undefined) return null;
  const days = daysSince(input, now);
  if (days === null) return null;
  if (days < 7) return { value: days, unit: "d" };
  if (days < 30) return { value: Math.floor(days / 7), unit: "w" };
  if (days < 365) return { value: Math.floor(days / 30), unit: "mo" };
  return { value: Math.floor(days / 365), unit: "y" };
}
