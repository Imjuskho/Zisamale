import type { RiskTone } from "../design/risk";
import { RISK_HEX } from "../design/risk";

/** Self-care guide severity, straight from the backend enum. */
export type GuideSeverity = "info" | "warning" | "emergency";

/** Severity → platform risk tone. Emergency reads as critical, warning as
 * "act now", info as a calm *learn* green. */
export const SEVERITY_TONE: Record<GuideSeverity, RiskTone> = {
  info: "low",
  warning: "high",
  emergency: "critical",
};

export function severityColor(severity: GuideSeverity): string {
  return RISK_HEX[SEVERITY_TONE[severity]];
}

/** Ordering key: emergency outranks warning outranks info. */
export const SEVERITY_RANK: Record<GuideSeverity, number> = {
  info: 0,
  warning: 1,
  emergency: 2,
};

export function sortBySeverity<T extends { severity: GuideSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}