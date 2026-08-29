// src/lib/nlg/dataGapReport.ts
// Auto-generated monthly report for grant reporting
// Honest about data quality. Turns infrastructure weakness into strength.

import { useT } from "~/i18n";

export interface DataGapReportInput {
  month: string;
  districts: string[];
  chw_count: number;
  chw_active_count: number;
  chw_visit_count: number;
  fever_count: number;
  danger_sign_count: number;
  referral_count: number;
  override_count: number;
  overrides: Array<{ rank: number; reason: string; count: number; trend: number }>;
  dhis2_coverage: number;
  dhis2_expected: number;
  dhis2_actual: number;
  dhis2_lag_months: number;
  ichis_coverage: number;
  ichis_stale_count: number;
  lmis_coverage: number;
  lmis_stockout_count: number;
  climate_date: string;
  outbreaks: Array<{
    disease: string;
    district: string;
    risk_level: string;
    horizon: number;
    confidence: number;
    data_quality: string;
    data_quality_note: string;
  }>;
  mama_inference_ms: number;
  mama_override_rate: number;
  mama_top_override: string;
  ulalo_predictions: number;
  ulalo_validated: number;
  ulalo_validation_note: string;
  ulalo_chw_validation: string;
  chw_data_freshness: string;
  generated_at: string;
}

export function generateDataGapReport(data: DataGapReportInput): string {
  const { t } = useT();

  const lines: string[] = [];

  lines.push("ZISAMALE MONTHLY FIELD INTELLIGENCE REPORT");
  lines.push("=".repeat(65));
  lines.push(`Month: ${data.month} | Districts: ${data.districts.join(", ")} | CHWs Active: ${data.chw_active_count}`);
  lines.push("");

  // ── UPSTREAM DATA QUALITY ──
  lines.push("UPSTREAM DATA QUALITY");
  lines.push("-".repeat(65));
  lines.push("");
  lines.push(`DHIS2 facility reporting: ${data.dhis2_coverage}% of facilities reported this month`);
  lines.push(`  (${data.dhis2_expected} expected, ${data.dhis2_actual} received).`);
  lines.push(`  Average reporting lag: ${data.dhis2_lag_months} months.`);
  lines.push("");
  lines.push(`iCHIS/CHT sync: ${data.ichis_coverage}% of CHWs synced within 7 days.`);
  lines.push(`  ${data.ichis_stale_count} CHWs have not synced in >14 days.`);
  lines.push("");
  lines.push(`LMIS stock data: ${data.lmis_coverage}% of facilities reported stock levels.`);
  lines.push(`  ${data.lmis_stockout_count} facilities reported stockouts.`);
  lines.push("");
  lines.push(`CLIMATE DATA: Live. CHIRPS rainfall, ERA5 temperature, MODIS vegetation`);
  lines.push(`  indices current through ${data.climate_date}.`);
  lines.push("");

  // ── FIELD SIGNAL (PRIMARY) ──
  lines.push("FIELD SIGNAL (PRIMARY)");
  lines.push("-".repeat(65));
  lines.push("");
  lines.push(`This month, ${data.chw_visit_count} home visits were conducted by`);
  lines.push(`${data.chw_active_count} CHWs. Of these:`);
  lines.push("");
  lines.push(`  • ${data.fever_count} patients reported fever`);
  lines.push(`  • ${data.danger_sign_count} patients exhibited danger signs`);
  lines.push(`  • ${data.referral_count} emergency referrals were initiated`);
  lines.push(`  • ${data.override_count} AI recommendations were overridden by CHWs`);
  lines.push("");
  lines.push("Top override reasons:");
  data.overrides.forEach(o => {
    const trendStr = o.trend > 0 ? `↑ ${o.trend}%` : o.trend < 0 ? `↓ ${Math.abs(o.trend)}%` : "→ 0%";
    lines.push(`  ${o.rank}. ${o.reason} — ${o.count} times (${trendStr})`);
  });
  lines.push("");
  lines.push("CHW override is a training signal, not a failure. Each override");
  lines.push("is reviewed by the supervisor and fed back into model retraining.");
  lines.push("");

  // ── SURVEILLANCE OUTLOOK ──
  lines.push("SURVEILLANCE OUTLOOK");
  lines.push("-".repeat(65));
  lines.push("");
  if (data.outbreaks.length > 0) {
    data.outbreaks.forEach(o => {
      lines.push(`  ${o.disease} risk in ${o.district}: ${o.risk_level}`);
      lines.push(`    Prediction horizon: ${o.horizon} weeks`);
      lines.push(`    Model confidence: ${o.confidence}%`);
      lines.push(`    Data quality: ${o.data_quality} — ${o.data_quality_note}`);
      lines.push("");
    });
  } else {
    lines.push("  No outbreak predictions exceeded threshold this month.");
    lines.push("");
  }

  // ── MODEL PERFORMANCE ──
  lines.push("MODEL PERFORMANCE");
  lines.push("-".repeat(65));
  lines.push("");
  lines.push("MAMA-AI edge model (on-device risk scoring):");
  lines.push(`  • Inference time: ${data.mama_inference_ms}ms average`);
  lines.push(`  • CHW override rate: ${data.mama_override_rate}%`);
  lines.push(`  • Top override reason: ${data.mama_top_override}`);
  lines.push("");
  lines.push("ULALO-AI surveillance model:");
  lines.push(`  • Predictions generated: ${data.ulalo_predictions}`);
  lines.push(`  • Validated against DHIS2: ${data.ulalo_validated} (${data.ulalo_validation_note})`);
  lines.push(`  • CHW-reported validation: ${data.ulalo_chw_validation}`);
  lines.push("");

  // ── RECOMMENDATION ──
  lines.push("RECOMMENDATION FOR GRANT REPORTING");
  lines.push("-".repeat(65));
  lines.push("");
  lines.push("Zisamale's surveillance layer does not depend on complete DHIS2");
  lines.push("reporting. In environments where facility data is");
  lines.push(`${data.dhis2_lag_months} months stale, CHW-reported symptoms provide a real-time`);
  lines.push(`signal that is ${data.chw_data_freshness} current.`);
  lines.push("");
  lines.push("The platform's value is not in replacing DHIS2. It is in building");
  lines.push("an intelligence layer that works with the data that actually exists.");
  lines.push("");
  lines.push("=".repeat(65));
  lines.push(`Generated by Zisamale AI | ${data.generated_at}`);

  return lines.join("\n");
}

// HTML/print version for dashboard rendering
export function generateDataGapReportHTML(data: DataGapReportInput): string {
  const report = generateDataGapReport(data);
  return report
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

// Download as .txt
export function downloadDataGapReport(data: DataGapReportInput): void {
  const report = generateDataGapReport(data);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zisamale-field-report-${data.month.replace(/\s+/g, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
