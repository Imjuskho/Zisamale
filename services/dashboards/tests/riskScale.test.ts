import { describe, it, expect } from "vitest";
import {
  band,
  toneFromScore0to10,
  riskToColor,
  riskToLabel,
  bedBarColor,
  facilityStatusColor,
  RISK_HEX,
} from "../src/design/riskScale";

describe("riskScale — the one palette and threshold set", () => {
  it("bands the canonical 0–1 scale", () => {
    expect(band(0.1)).toBe("low");
    expect(band(0.45)).toBe("medium");
    expect(band(0.7)).toBe("high");
    expect(band(0.95)).toBe("critical");
  });

  it("maps 0–10 scores onto the same bands", () => {
    expect(toneFromScore0to10(9.2)).toBe("critical");
    expect(toneFromScore0to10(7)).toBe("high");
    expect(toneFromScore0to10(4.5)).toBe("medium");
    expect(toneFromScore0to10(1)).toBe("low");
  });

  it("colors come from the design-system risk tokens", () => {
    expect(riskToColor(0.1)).toBe(RISK_HEX.low);
    expect(riskToColor(0.45)).toBe(RISK_HEX.medium);
    expect(riskToColor(0.7)).toBe(RISK_HEX.high);
    expect(riskToColor(0.95)).toBe(RISK_HEX.critical);
    expect(Object.values(RISK_HEX)).not.toContain("#22c55e"); // old stray palette gone
  });

  it("labels are consistent English until i18n supplies language", () => {
    expect(riskToLabel(0.1)).toBe("Low");
    expect(riskToLabel(0.45)).toBe("Moderate");
    expect(riskToLabel(0.95)).toBe("Critical");
  });

  it("bed availability bar shares the same thresholds everywhere", () => {
    expect(bedBarColor(60, 100)).toBe(RISK_HEX.low);
    expect(bedBarColor(30, 100)).toBe(RISK_HEX.high);
    expect(bedBarColor(5, 100)).toBe(RISK_HEX.critical);
    expect(bedBarColor(5, 0)).toBe(RISK_HEX.critical); // no capacity = critical
  });

  it("operational status maps onto tones", () => {
    expect(facilityStatusColor("Functional")).toBe(RISK_HEX.low);
    expect(facilityStatusColor("Partial")).toBe(RISK_HEX.high);
    expect(facilityStatusColor("Not Functional")).toBe(RISK_HEX.critical);
    expect(facilityStatusColor("Closed")).not.toBe("");
  });
});
