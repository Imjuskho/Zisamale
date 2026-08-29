import { describe, it, expect } from "vitest";
import { daysSince, hoursSince, isOlderThan } from "../src/utils/recency";

// Pinned clock: 2026-08-24T12:00:00Z
const NOW = new Date("2026-08-24T12:00:00Z");

describe("recency", () => {
  it("computes fractional hours since a timestamp", () => {
    expect(hoursSince("2026-08-24T10:00:00Z", NOW)).toBe(2);
    expect(hoursSince("2026-08-23T22:00:00Z", NOW)).toBe(14);
  });

  it("floors whole days since a timestamp", () => {
    expect(daysSince("2026-08-24T06:00:00Z", NOW)).toBe(0);
    expect(daysSince("2026-08-23T11:00:00Z", NOW)).toBe(1);
    expect(daysSince("2026-08-10T12:00:00Z", NOW)).toBe(14);
  });

  it("flags timestamps older than the threshold", () => {
    expect(isOlderThan("2026-08-22T00:00:00Z", 48, NOW)).toBe(true);
    expect(isOlderThan("2026-08-23T00:00:00Z", 48, NOW)).toBe(false);
    expect(isOlderThan("2026-08-24T13:00:00Z", 48, NOW)).toBe(false);
  });

  it("treats unparseable input as never-stale rather than crashing", () => {
    expect(hoursSince("not-a-date", NOW)).toBeNull();
    expect(daysSince("", NOW)).toBeNull();
    expect(isOlderThan("garbage", 1, NOW)).toBe(false);
  });
});
