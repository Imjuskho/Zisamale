/**
 * RISK SCALE — the single source for "how risky is this?"
 *
 * One threshold scale, one palette, one label set. Map polygons, badges,
 * alert cards, legend sections, and popup HTML strings are all adapters
 * over this module; changing a clinical threshold or color happens here
 * and nowhere else.
 *
 * Canonical score is 0–1 (the backend ai_risk_score convention). Helpers
 * accept 0–10 where noted.
 */

export type RiskTone = "low" | "medium" | "high" | "critical";

/** Hex values mirror tailwind.config.js `risk.*`. Popup HTML strings need
 * literals because Leaflet renders raw HTML outside Tailwind's scanner. */
export const RISK_HEX: Record<RiskTone, string> = {
  low: "#34C759",
  medium: "#FFCC00",
  high: "#FF9500",
  critical: "#FF3B30",
};

export const RISK_NODATA_HEX = "#A29A8E";

/** Tailwind classes for React surfaces. */
export const RISK_BG_CLASSES: Record<RiskTone, string> = {
  low: "bg-risk-low text-white",
  medium: "bg-risk-medium text-apple-ink",
  high: "bg-risk-high text-white",
  critical: "bg-risk-critical text-white",
};

export const RISK_BORDER_CLASSES: Record<RiskTone, string> = {
  low: "border-risk-low",
  medium: "border-risk-medium",
  high: "border-risk-high",
  critical: "border-risk-critical",
};

export function band(score01: number): RiskTone {
  if (score01 < 0.3) return "low";
  if (score01 < 0.6) return "medium";
  if (score01 < 0.8) return "high";
  return "critical";
}

export function toneFromScore0to10(score: number): RiskTone {
  return band(score / 10);
}

export function toneToColor(tone: RiskTone): string {
  return RISK_HEX[tone];
}

export function riskToColor(risk01: number): string {
  return RISK_HEX[band(risk01)];
}

export function toneToLabel(tone: RiskTone): string {
  switch (tone) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Moderate";
    default:
      return "Low";
  }
}

export function riskToLabel(risk01: number): string {
  return toneToLabel(band(risk01));
}

// ── Alert levels (backend enum: red | yellow | green) ─────────────

export type AlertLevel = "red" | "yellow" | "green";

export const ALERT_LEVEL_STYLES: Record<
  AlertLevel,
  { bg: string; border: string; label: string }
> = {
  red: { bg: "#F5E3DD", border: RISK_HEX.critical, label: "CRITICAL" },
  yellow: { bg: "#F6E7DE", border: RISK_HEX.high, label: "ELEVATED" },
  green: { bg: "#EAF3EE", border: RISK_HEX.low, label: "LOW" },
};

// ── Facility operational status ───────────────────────────────────

export function facilityStatusColor(status: string | null): string {
  switch (status) {
    case "Functional":
      return RISK_HEX.low;
    case "Partial":
      return RISK_HEX.high;
    case "Not Functional":
      return RISK_HEX.critical;
    default:
  return "#8E8E93"; // neutral — closed / unknown
  }
}

export function bedBarColor(available: number, total: number): string {
  const ratio = total > 0 ? available / total : 0;
  if (ratio > 0.5) return RISK_HEX.low;
  if (ratio > 0.2) return RISK_HEX.high;
  return RISK_HEX.critical;
}
