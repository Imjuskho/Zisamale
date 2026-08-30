/**
 * RISK SCALE — mirrors `services/dashboards/src/design/riskScale.ts`.
 *
 * One threshold set, one palette, one label vocabulary across the whole
 * platform. These two modules must stay in lockstep; if Zisamale grows a
 * shared package, this moves there. The public site only ever renders
 * aggregate risk (district level) — the bands themselves are identical.
 */

export type RiskTone = "low" | "medium" | "high" | "critical";

export const RISK_HEX: Record<RiskTone, string> = {
  low: "#34C759",
  medium: "#FFCC00",
  high: "#FF9500",
  critical: "#FF3B30",
};

export const RISK_NODATA_HEX = "#A29A8E";

export function band(score01: number): RiskTone {
  if (score01 < 0.3) return "low";
  if (score01 < 0.6) return "medium";
  if (score01 < 0.8) return "high";
  return "critical";
}

export function toneToColor(tone: RiskTone): string {
  return RISK_HEX[tone];
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

/** Public district risk is served as a 3-level string (low/medium/high) or
 * null when there is no active alert. critical is reserved for the scale. */
export type PublicRiskLevel = "low" | "medium" | "high" | "critical" | null;

export function riskLevelTone(level: PublicRiskLevel): RiskTone {
  return level ?? "low";
}