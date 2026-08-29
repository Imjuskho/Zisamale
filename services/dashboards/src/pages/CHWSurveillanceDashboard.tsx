// src/pages/CHWSurveillanceDashboard.tsx
// Field-first surveillance: CHW visit data as the primary signal.
// Editorial system throughout - serif headlines, section numbers,
// thin rules, freshness badges on every data surface.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../services/api";
import type {
  ChwVsDhis2Comparison,
  SurveillanceHeatmap,
  SurveillanceOverrides,
  SurveillanceSummary,
} from "../services/api";
import { useT } from "../components/design/LanguageContext";
import { KPICard } from "../components/design/KPICard";
import { DataFreshnessBadge } from "../components/design/DataFreshnessBadge";
import {
  RISK_HEX,
  RISK_NODATA_HEX,
  riskToLabel,
  band as bandRisk,
} from "../design/riskScale";
import {
  CHART_COLORS,
  commonAxisProps,
  commonCartesianGridProps,
  commonTooltipProps,
} from "../lib/chart-theme";

export default function CHWSurveillanceDashboard() {
  const t = useT();
  const [summary, setSummary] = useState<SurveillanceSummary | null>(null);
  const [heatmap, setHeatmap] = useState<SurveillanceHeatmap | null>(null);
  const [overrides, setOverrides] = useState<SurveillanceOverrides | null>(null);
  const [comparison, setComparison] = useState<ChwVsDhis2Comparison | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h, o, c] = await Promise.all([
        api.getSurveillanceSummary(),
        api.getSurveillanceHeatmap(),
        api.getSurveillanceOverrides(),
        api.getChwVsDhis2(),
      ]);
      setSummary(s);
      setHeatmap(h);
      setOverrides(o);
      setComparison(c);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <SurveillanceSkeleton />;
  if (error)
    return (
      <div className="dashboard">
        <EmptyPanel
          title={t("tryAgain")}
          detail={error.message}
          onRetry={load}
        />
      </div>
    );

  return (
    <div className="page-container surv">
      <header className="dashboard-header">
        <SectionNumber index="01" label={t("fieldView")} />
        <h1>{t("surveillanceTitle")}</h1>
        <p>{t("surveillanceSubtitle")}</p>
        <div className="surv__view-toggle">
          <Link to="/mohp" className="surv__toggle-link">
            {t("facilityView")}
          </Link>
          <span className="surv__toggle-active">{t("fieldView")}</span>
        </div>
      </header>

      {summary && (
        <div className="kpi-row">
          <KPICard
            label={t("visitsThisWeek")}
            value={summary.visits_this_week}
            freshness={summary.source_meta}
          />
          <KPICard
            label={t("feverClusters")}
            value={summary.fever_clusters}
            freshness={summary.source_meta}
            iconColor={RISK_HEX.medium}
          />
          <KPICard
            label={t("dangerReferrals")}
            value={summary.danger_referrals}
            freshness={summary.source_meta}
            iconColor={RISK_HEX.critical}
          />
        </div>
      )}

      {summary && summary.weekly_trend.length > 0 && (
        <section className="card p-6 mb-8">
          <CardHeader title={t("feverTrend")} meta={summary.source_meta} />
          <div className="surv__chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.weekly_trend}>
                <CartesianGrid {...commonCartesianGridProps} />
                <XAxis dataKey="week" tickFormatter={(w: string) => w.slice(5)} {...commonAxisProps} />
                <YAxis allowDecimals={false} {...commonAxisProps} />
                <Tooltip {...commonTooltipProps} />
                <Bar dataKey="fever" fill={CHART_COLORS.predicted} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {heatmap && heatmap.cells.length > 0 && (
        <section className="card p-6 mb-8">
          <CardHeader title={t("taHeatmap")} meta={heatmap.source_meta} />
          <div className="surv__heat-grid">
            {heatmap.cells.map((cell) => (
              <TAHeatCell key={cell.ta_id} cell={cell} max={heatmap.max_visit_count} />
            ))}
          </div>
        </section>
      )}

      {overrides && overrides.overrides.length > 0 && (
        <section className="card p-6 mb-8">
          <SectionNumber index="02" label={t("overridePatterns")} />
          <table className="surv__table">
            <thead>
              <tr>
                <th scope="col">{t("colReason")}</th>
                <th scope="col">{t("colCount")}</th>
                <th scope="col">{t("colTrend")}</th>
                <th scope="col">{t("colDistricts")}</th>
              </tr>
            </thead>
            <tbody>
              {overrides.overrides.map((row) => (
                <tr key={row.reason_key}>
                  <td>{row.reason_key}</td>
                  <td className="num">{row.count}</td>
                  <td className={`num ${trendClass(row.trend)}`}>
                    {trendGlyph(row.trend)}
                  </td>
                  <td className="muted">{row.districts.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {comparison && comparison.rows.length > 0 && (
        <section className="card p-6 mb-8">
          <SectionNumber index="03" label={t("dataComparison")} />
          <p className="surv__note">{t("comparisonNote")}</p>
          <table className="surv__table">
            <thead>
              <tr>
                <th scope="col">{t("colDistrictName")}</th>
                <th scope="col">{t("colChwFever")}</th>
                <th scope="col">{t("colDhis2Malaria")}</th>
                <th scope="col">{t("colGap")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.district_id}>
                  <td className="strong">{row.district_name}</td>
                  <td className="num">{row.chw_fever}</td>
                  <td className="num muted">{row.dhis2_malaria ?? "—"}</td>
                  <td className="num muted">{row.gap ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ── Local pieces ──────────────────────────────────────────────────

function SectionNumber({ index, label }: { index: string; label: string }) {
  return (
    <div className="surv__section-rule">
      <span className="surv__section-index">{index}</span>
      <span className="surv__section-label">{label}</span>
    </div>
  );
}

function CardHeader({ title, meta }: { title: string; meta: SurveillanceSummary["source_meta"] }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2>{title}</h2>
      <DataFreshnessBadge meta={meta} showSource />
    </div>
  );
}

function TAHeatCell({
  cell,
  max,
}: {
  cell: SurveillanceHeatmap["cells"][number];
  max: number;
}) {
  const intensity =
    max > 0 ? Math.max(0.15, cell.visit_count / max) : 0;
  const tone =
    cell.risk_score === null
      ? RISK_NODATA_HEX
      : RISK_HEX[bandRisk(cell.risk_score)];
  return (
    <div className="surv__cell" title={`${cell.ta_name}: ${cell.visit_count}`}>
      <span
        className="surv__cell-swatch"
        style={{
          backgroundColor:
            cell.risk_score === null
              ? "transparent"
              : tone,
          opacity: cell.risk_score === null ? 1 : intensity,
          border:
            cell.risk_score === null
              ? `1px dashed ${RISK_NODATA_HEX}`
              : "none",
        }}
      />
      <span className="surv__cell-name">{cell.ta_name}</span>
      <span className="surv__cell-meta">
        {cell.visit_count > 0
          ? `${riskToLabel(cell.risk_score ?? 0)} · ${cell.fever_count}`
          : "—"}
      </span>
    </div>
  );
}

function EmptyPanel({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="card p-8 text-center">
      <h2>{title}</h2>
      <p className="surv__note">{detail}</p>
      <button type="button" className="btn-primary mt-4" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function trendGlyph(trend: number | null): string {
  if (trend === null) return "new";
  if (trend > 0) return `↑ ${trend}%`;
  if (trend < 0) return `↓ ${Math.abs(trend)}%`;
  return "→ 0%";
}

function trendClass(trend: number | null): string {
  if (trend === null) return "muted";
  if (trend > 0) return "up";
  if (trend < 0) return "down";
  return "";
}

function SurveillanceSkeleton() {
  return (
    <div className="page-container surv">
      <div className="surv__section-rule">
        <div className="skeleton-line skeleton-line--short" />
      </div>
      <div className="kpi-row">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 skeleton-block" />
        ))}
      </div>
      <div className="card p-6 skeleton-block skeleton-block--tall" />
    </div>
  );
}
