// src/lib/dataGapReport.ts
// Monthly field-intelligence report for grant reporting.
// Honest about upstream data quality; positions CHW data as the
// primary signal. Pure functions only - no React, no i18n seam:
// grant reports are canonical-English documents by convention.

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
  overrides: Array<{ rank: number; reason: string; count: number; trend: number | null }>;
  /** null = integration not connected; rendered as an explicit disclosure */
  dhis2_coverage: number | null;
  dhis2_expected: number | null;
  dhis2_actual: number | null;
  dhis2_lag_months: number | null;
  ichis_coverage: number | null;
  ichis_stale_count: number | null;
  lmis_coverage: number | null;
  lmis_stockout_count: number | null;
  climate_date: string;
  outbreaks: Array<{
    disease: string;
    district: string;
    risk_level: string;
    horizon_weeks: number;
    confidence_percent: number | null;
    data_quality_note: string;
  }>;
  mama_inference_ms: number | null;
  mama_override_rate: number | null;
  ulalo_predictions: number | null;
  generated_at: string;
}

const RULE = "-".repeat(66);
const HEAVY = "=".repeat(66);

function pct(value: number | null): string {
  return value === null ? "not available" : `${value}%`;
}

function num(value: number | null, unit = ""): string {
  return value === null ? `not available${unit}` : `${value}${unit}`;
}

function trendText(trend: number | null): string {
  if (trend === null) return "no prior-period baseline";
  if (trend > 0) return `up ${trend}%`;
  if (trend < 0) return `down ${Math.abs(trend)}%`;
  return "flat";
}

export function generateDataGapReport(data: DataGapReportInput): string {
  const lines: string[] = [];

  lines.push("ZISAMALE MONTHLY FIELD INTELLIGENCE REPORT");
  lines.push(HEAVY);
  lines.push(
    `Month: ${data.month} | Districts: ${data.districts.join(", ") || "all"}`
  );
  lines.push(
    `CHWs on roster: ${data.chw_count} | CHWs active this month: ${data.chw_active_count}`
  );
  lines.push("");

  // -- UPSTREAM DATA QUALITY ----------------------------------------
  lines.push("UPSTREAM DATA QUALITY");
  lines.push(RULE);
  lines.push("");
  if (data.dhis2_coverage === null) {
    lines.push(
      "DHIS2 facility reporting: no live connection yet. Facility-side"
    );
    lines.push(
      "columns in dashboards stay empty rather than showing estimates;"
    );
    lines.push("lag cannot be stated until the integration is verified.");
  } else {
    lines.push(
      `DHIS2 facility reporting: ${data.dhis2_coverage}% of facilities reported this month`
    );
    lines.push(`  (${data.dhis2_expected ?? "?"} expected, ${data.dhis2_actual ?? "?"} received).`);
    if (data.dhis2_lag_months !== null && data.dhis2_lag_months > 0) {
      lines.push(`  Average reporting lag: ${data.dhis2_lag_months} months.`);
    }
  }
  lines.push("");
  lines.push(
    `iCHIS/CHT sync: ${pct(data.ichis_coverage)} of CHWs synced within 7 days.`
  );
  if (data.ichis_stale_count !== null) {
    lines.push(`  ${data.ichis_stale_count} CHW(s) have not synced in over 14 days.`);
  }
  lines.push("");
  lines.push(
    `LMIS stock data: coverage ${pct(data.lmis_coverage)}; stockouts reported: ${num(
      data.lmis_stockout_count
    )}.`
  );
  lines.push("");
  lines.push(
    `CLIMATE DATA: live. CHIRPS rainfall, ERA5 temperature, MODIS vegetation`
  );
  lines.push(`  indices current through ${data.climate_date}.`);
  lines.push("");

  // -- FIELD SIGNAL --------------------------------------------------
  lines.push("FIELD SIGNAL (PRIMARY)");
  lines.push(RULE);
  lines.push("");
  lines.push(
    `This month, ${data.chw_visit_count} home visits were conducted by`
  );
  lines.push(`${data.chw_active_count} active CHW(s). Of these:`);
  lines.push("");
  lines.push(`  - ${data.fever_count} household(s) reported fever`);
  lines.push(`  - ${data.danger_sign_count} visit(s) flagged danger signs`);
  lines.push(`  - ${data.referral_count} emergency referral(s) were initiated`);
  lines.push(`  - ${data.override_count} AI recommendation(s) were overridden by CHWs`);
  lines.push("");
  if (data.overrides.length > 0) {
    lines.push("Top override reasons:");
    for (const o of data.overrides) {
      lines.push(
        `  ${o.rank}. ${o.reason} - ${o.count} time(s) (${trendText(o.trend)})`
      );
    }
    lines.push("");
  }
  lines.push(
    "CHW override is a training signal, not a failure. Each override is"
  );
  lines.push("reviewed by the supervisor and fed back into model retraining.");
  lines.push("");

  // -- SURVEILLANCE OUTLOOK ------------------------------------------
  lines.push("SURVEILLANCE OUTLOOK");
  lines.push(RULE);
  lines.push("");
  if (data.outbreaks.length === 0) {
    lines.push("No outbreak predictions exceeded threshold this month.");
  } else {
    for (const o of data.outbreaks) {
      lines.push(`  ${o.disease} risk in ${o.district}: ${o.risk_level}`);
      lines.push(`    Prediction horizon: ${o.horizon_weeks} weeks`);
      lines.push(
        `    Model confidence: ${
          o.confidence_percent === null ? "not validated" : `${o.confidence_percent}%`
        }`
      );
      lines.push(`    Data quality note: ${o.data_quality_note}`);
      lines.push("");
    }
  }
  lines.push("");

  // -- MODEL PERFORMANCE ----------------------------------------------
  lines.push("MODEL PERFORMANCE");
  lines.push(RULE);
  lines.push("");
  lines.push("MAMA-AI edge model (on-device risk scoring):");
  lines.push(`  - Average inference time: ${num(data.mama_inference_ms, "ms")}`);
  lines.push(`  - CHW override rate: ${pct(data.mama_override_rate)}`);
  lines.push("");
  lines.push("ULALO-AI surveillance model:");
  lines.push(`  - Predictions generated this month: ${num(data.ulalo_predictions)}`);
  lines.push("");

  // -- GRANT RECOMMENDATION --------------------------------------------
  lines.push("RECOMMENDATION FOR GRANT REPORTING");
  lines.push(RULE);
  lines.push("");
  lines.push(
    "Zisamale's surveillance layer does not depend on complete facility"
  );
  lines.push(
    "reporting. Where upstream data lags or is unavailable, CHW-reported"
  );
  lines.push(
    "symptoms provide a real-time signal collected on $100 Android"
  );
  lines.push("devices and synced opportunistically over 2G/3G.");
  lines.push("");
  lines.push(
    "The platform's value is not in replacing DHIS2. It is in building an"
  );
  lines.push("intelligence layer that works with the data that actually exists,");
  lines.push("and being transparent about what each widget can and cannot see.");
  lines.push("");
  lines.push(HEAVY);
  lines.push(`Generated by Zisamale AI | ${data.generated_at}`);

  return lines.join("\n");
}

/** Download the report as .txt (PDF export deferred per brief). */
export function downloadDataGapReport(data: DataGapReportInput): void {
  const report = generateDataGapReport(data);
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zisamale-field-report-${data.month.replace(/\s+/g, "-").toLowerCase()}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
