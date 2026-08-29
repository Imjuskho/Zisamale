// src/pages/DataGapReportPage.tsx
// Printable monthly field-intelligence report. Pulls live surveillance
// aggregates; upstream sections render explicit disclosures where no
// integration exists yet. Print stylesheet produces an A4 document.

import { useCallback, useEffect, useState } from "react";

import { api } from "../services/api";
import type {
  ChwVsDhis2Comparison,
  SurveillanceOverrides,
  SurveillanceSummary,
} from "../services/api";
import { useT } from "../components/design/LanguageContext";
import { DataFreshnessBadge } from "../components/design/DataFreshnessBadge";
import {
  downloadDataGapReport,
  generateDataGapReport,
  type DataGapReportInput,
} from "../lib/dataGapReport";

function monthLabel(date = new Date()): string {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export default function DataGapReportPage() {
  const t = useT();
  const [summary, setSummary] = useState<SurveillanceSummary | null>(null);
  const [overrides, setOverrides] = useState<SurveillanceOverrides | null>(null);
  const [comparison, setComparison] = useState<ChwVsDhis2Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, o, c] = await Promise.all([
        api.getSurveillanceSummary(),
        api.getSurveillanceOverrides(),
        api.getChwVsDhis2(),
      ]);
      setSummary(s);
      setOverrides(o);
      setComparison(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const input: DataGapReportInput | null =
    summary && overrides && comparison
      ? {
          month: monthLabel(),
          districts: comparison.rows.map((r) => r.district_name),
          chw_count: comparison.rows.length,
          chw_active_count: comparison.rows.filter((r) => r.chw_fever > 0).length,
          chw_visit_count: summary.visits_this_week,
          fever_count: summary.fever_clusters,
          danger_sign_count: summary.danger_referrals,
          referral_count: summary.danger_referrals,
          override_count: overrides.overrides.reduce((acc, o) => acc + o.count, 0),
          overrides: overrides.overrides.map((o, i) => ({
            rank: i + 1,
            reason: o.reason_key,
            count: o.count,
            trend: o.trend,
          })),
          dhis2_coverage: null,
          dhis2_expected: null,
          dhis2_actual: null,
          dhis2_lag_months: null,
          ichis_coverage: null,
          ichis_stale_count: null,
          lmis_coverage: null,
          lmis_stockout_count: null,
          climate_date: monthLabel(),
          outbreaks: [],
          mama_inference_ms: null,
          mama_override_rate:
            summary.visits_this_week > 0
              ? Math.round(
                  (overrides.overrides.reduce((acc, o) => acc + o.count, 0) /
                    summary.visits_this_week) *
                    100
                )
              : null,
          ulalo_predictions: null,
          generated_at: new Date().toISOString(),
        }
      : null;

  return (
    <div className="dashboard">
      <header className="dashboard-header report__header">
        <h1>{t("reportTitle")}</h1>
        <p>{t("reportSubtitle")}</p>
        <div className="report__actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!input}
            onClick={() => input && window.print()}
          >
            {t("reportPrint")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!input}
            onClick={() => input && downloadDataGapReport(input)}
          >
            {t("reportDownloadTxt")}
          </button>
        </div>
      </header>

      {error && <p className="surv__note">{error}</p>}
      {!input && !error && <p className="surv__note">{t("loading")}</p>}

      {input && (
        <>
          {summary && (
            <div className="report__freshness">
              <DataFreshnessBadge meta={summary.source_meta} showSource compact={false} />
            </div>
          )}
          <pre className="report__document" aria-label={t("reportTitle")}>
            {generateDataGapReport(input)}
          </pre>
        </>
      )}
    </div>
  );
}
