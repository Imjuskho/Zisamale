import { describe, expect, it } from "vitest";
import { fill, strings, t } from "../src/i18n";
import { severityColor, sortBySeverity } from "../src/lib/severity";
import { RISK_HEX } from "../src/design/risk";

describe("i18n parity (Samala public)", () => {
  it("serves every key in both Chichewa and English", () => {
    for (const [key, pair] of Object.entries(strings)) {
      expect(pair.en?.length ?? 0, `en missing for ${key}`).toBeGreaterThan(0);
      expect(pair.ny?.length ?? 0, `ny missing for ${key}`).toBeGreaterThan(0);
    }
  });

  it("exposes a type-safe key seam", () => {
    const k = "navGuides" as const;
    expect(t(k, "ny")).toBe(strings.navGuides.ny);
    expect(t(k, "en")).toBe(strings.navGuides.en);
  });

  it("fills templates without leaving braces behind", () => {
    const en = fill(strings.riskSentence.en, { district: "Nsanje", level: "High risk" });
    expect(en).toContain("Nsanje");
    expect(en).not.toMatch(/\{/);
    const ny = fill(strings.shareText.ny, { title: "X" });
    expect(ny).not.toMatch(/\{/);
  });
});

describe("severity semantics", () => {
  it("maps severity onto the shared platform palette", () => {
    expect(severityColor("info")).toBe(RISK_HEX.low);
    expect(severityColor("warning")).toBe(RISK_HEX.high);
    expect(severityColor("emergency")).toBe(RISK_HEX.critical);
  });

  it("sorts emergency above warning above info", () => {
    const items: Array<{ severity: "info" | "warning" | "emergency"; title: string }> = [
      { severity: "info", title: "info" },
      { severity: "emergency", title: "emergency" },
      { severity: "warning", title: "warning" },
    ];
    const sorted = sortBySeverity(items);
    expect(sorted.map((s) => s.title)).toEqual(["emergency", "warning", "info"]);
  });
});