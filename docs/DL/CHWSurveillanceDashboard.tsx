// src/pages/CHWSurveillanceDashboard.tsx
// Field-first surveillance view — CHW data as primary signal
// Editorial design: Source Serif 4 headlines, Space Grotesk UI, thin rules

import { useT } from "~/i18n";
import { KPICard } from "~/components/KPICard";
import { DataFreshnessBadge } from "~/components/DataFreshnessBadge";
import { useSurveillanceData } from "~/hooks/useSurveillanceData";

export default function CHWSurveillanceDashboard() {
  const { t } = useT();
  const { summary, heatmap, overrides, comparison, loading, error } = useSurveillanceData();

  if (loading) return <SurveillanceSkeleton />;
  if (error) return <SurveillanceError error={error} />;

  return (
    <div className="page-container">
      {/* Page Header */}
      <header className="page-header">
        <div className="border-t border-[#1C1917] pt-3 mb-2">
          <span className="text-[#C0563B] text-[11px] font-semibold uppercase tracking-[0.05em] mr-3">
            01
          </span>
          <span className="text-[#78716C] text-[11px] font-medium uppercase tracking-[0.05em]">
            {t("surveillance.field_view")}
          </span>
        </div>
        <h1 className="font-serif text-[24px] font-semibold text-[#1C1917] leading-[1.3] mb-1">
          {t("surveillance.chw_title")}
        </h1>
        <p className="text-[14px] text-[#78716C] leading-[1.5]">
          {t("surveillance.chw_subtitle")}
        </p>
      </header>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <a href="/mohp" className="px-3 py-1.5 text-[12px] font-medium text-[#78716C] hover:text-[#1C1917] transition-colors">
          {t("surveillance.facility_view")}
        </a>
        <span className="px-3 py-1.5 text-[12px] font-semibold text-[#1C1917] border-b-2 border-[#1B4332]">
          {t("surveillance.field_view")}
        </span>
      </div>

      {/* KPI Row — All LIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KPICard
          label={t("surveillance.visits_this_week")}
          value={summary.visits_this_week}
          context={t("surveillance.across_districts", { count: summary.districts_active })}
          freshness={{ source: "chw", last_sync_at: summary.last_sync, record_count: summary.visits_this_week, expected_count: summary.expected_visits, freshness_score: "live" }}
        />
        <KPICard
          label={t("surveillance.fever_clusters")}
          value={summary.fever_clusters}
          context={t("surveillance.tas_affected", { count: summary.tas_affected })}
          freshness={{ source: "chw", last_sync_at: summary.last_sync, record_count: summary.fever_clusters, expected_count: summary.expected_clusters, freshness_score: "live" }}
        />
        <KPICard
          label={t("surveillance.danger_referrals")}
          value={summary.danger_referrals}
          context={t("surveillance.awaiting_facility")}
          freshness={{ source: "chw", last_sync_at: summary.last_sync, record_count: summary.danger_referrals, expected_count: summary.expected_referrals, freshness_score: "live" }}
        />
      </div>

      {/* Heatmap + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[18px] font-semibold text-[#1C1917]">
              {t("surveillance.ta_heatmap")}
            </h2>
            <DataFreshnessBadge meta={{ source: "chw", last_sync_at: heatmap.last_sync, record_count: heatmap.record_count, expected_count: heatmap.expected_count, freshness_score: "live" }} compact />
          </div>
          <TAHeatmap data={heatmap.cells} />
          <div className="flex items-center gap-4 mt-4 text-[11px] text-[#78716C]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#2D6A4F]" /> {t("risk.low")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#B45309]" /> {t("risk.medium")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#C0563B]" /> {t("risk.high")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#8C2F1B]" /> {t("risk.critical")}</span>
          </div>
        </div>

        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[18px] font-semibold text-[#1C1917]">
              {t("surveillance.fever_trend")}
            </h2>
            <DataFreshnessBadge meta={{ source: "chw", last_sync_at: summary.last_sync, record_count: summary.visits_this_week, expected_count: summary.expected_visits, freshness_score: "live" }} compact />
          </div>
          <FeverTrendChart data={summary.weekly_trend} />
        </div>
      </div>

      {/* Override Patterns */}
      <div className="card p-6 mb-8">
        <div className="border-t border-[#1C1917] pt-3 mb-4">
          <span className="text-[#C0563B] text-[11px] font-semibold uppercase tracking-[0.05em] mr-3">02</span>
          <span className="text-[#78716C] text-[11px] font-medium uppercase tracking-[0.05em]">
            {t("surveillance.override_patterns")}
          </span>
        </div>
        <p className="text-[14px] text-[#78716C] mb-4">
          {t("surveillance.override_subtitle")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#D6D3CD]">
              <tr>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C]">{t("override.reason")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C] text-right">{t("override.count")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C] text-right">{t("override.trend")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C]">{t("override.districts")}</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((row, i) => (
                <tr key={i} className="border-b border-[#D6D3CD] last:border-b-0">
                  <td className="py-3 text-[14px] text-[#1C1917]">{t(`override.${row.reason_key}`)}</td>
                  <td className="py-3 text-[14px] text-[#1C1917] text-right tabular-nums">{row.count}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[12px] font-medium ${row.trend > 0 ? "text-[#C0563B]" : row.trend < 0 ? "text-[#2D6A4F]" : "text-[#78716C]"}`}>
                      {row.trend > 0 ? "↑" : row.trend < 0 ? "↓" : "→"} {Math.abs(row.trend)}%
                    </span>
                  </td>
                  <td className="py-3 text-[12px] text-[#78716C]">{row.districts.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHW vs DHIS2 Comparison */}
      <div className="card p-6 mb-8">
        <div className="border-t border-[#1C1917] pt-3 mb-4">
          <span className="text-[#C0563B] text-[11px] font-semibold uppercase tracking-[0.05em] mr-3">03</span>
          <span className="text-[#78716C] text-[11px] font-medium uppercase tracking-[0.05em]">
            {t("surveillance.data_comparison")}
          </span>
        </div>
        <p className="text-[14px] text-[#78716C] mb-4">
          {t("surveillance.comparison_subtitle")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#D6D3CD]">
              <tr>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C]">{t("district.name")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C] text-right">{t("surveillance.chw_fever")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C] text-right">{t("surveillance.dhis2_malaria")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C] text-right">{t("surveillance.gap")}</th>
                <th scope="col" className="pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#78716C]">{t("surveillance.dhis2_age")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={i} className="border-b border-[#D6D3CD] last:border-b-0">
                  <td className="py-3 text-[14px] text-[#1C1917] font-medium">{row.district}</td>
                  <td className="py-3 text-[14px] text-[#1C1917] text-right tabular-nums">{row.chw_fever}</td>
                  <td className="py-3 text-[14px] text-[#78716C] text-right tabular-nums">{row.dhis2_malaria ?? "—"}</td>
                  <td className="py-3 text-right">
                    {row.gap > 50 ? (
                      <span className="text-[12px] font-semibold text-[#C0563B] tabular-nums">{row.gap}</span>
                    ) : (
                      <span className="text-[12px] text-[#78716C] tabular-nums">{row.gap}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <DataFreshnessBadge meta={row.dhis2_meta} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Skeleton
function SurveillanceSkeleton() {
  return (
    <div className="page-container space-y-6">
      <div className="border-t border-[#D6D3CD] pt-3">
        <div className="h-6 bg-[#F5F2EB] rounded-[2px] w-1/3 mb-2" />
        <div className="h-4 bg-[#F5F2EB] rounded-[2px] w-1/2" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-[#F5F2EB] rounded-[2px]" />)}
      </div>
      <div className="h-64 bg-[#F5F2EB] rounded-[2px]" />
    </div>
  );
}

// Error
function SurveillanceError({ error }: { error: Error }) {
  const { t } = useT();
  return (
    <div className="page-container flex items-center justify-center">
      <div className="text-center">
        <div className="text-[18px] font-serif font-semibold text-[#1C1917] mb-2">
          {t("error.loading_failed")}
        </div>
        <div className="text-[14px] text-[#78716C] mb-4">{error.message}</div>
        <button className="px-4 py-2 bg-[#1B4332] text-white text-[12px] font-semibold rounded-[2px] hover:bg-[#143828]">
          {t("action.retry")}
        </button>
      </div>
    </div>
  );
}
