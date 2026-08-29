import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "../services/api";
import type {
  SurveillanceSummary,
  SurveillanceOverrides,
  ChwVsDhis2Comparison,
} from "../services/api";
import { useT } from "../components/design/LanguageContext";
import { Icon, type IconName } from "../components/design/Icon";

function monthLabel(date = new Date()): string {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const PIE_COLORS = ["#2D6A4F", "#ff9500", "#ff9500", "#0066cc", "#7C3AED"];

export default function DistrictHealthReport() {
  const t = useT();
  const [summary, setSummary] = useState<SurveillanceSummary | null>(null);
  const [overrides, setOverrides] = useState<SurveillanceOverrides | null>(null);
  const [comparison, setComparison] = useState<ChwVsDhis2Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePrint = () => window.print();

  const totalOverrides = overrides?.overrides.reduce((a, o) => a + o.count, 0) ?? 0;
  const activeCHWs = comparison?.rows.filter((r) => r.chw_fever > 0).length ?? 0;
  const totalDistricts = comparison?.rows.length ?? 0;

  const overrideReasonData =
    overrides?.overrides.map((o) => ({
      name: o.reason_key.length > 30 ? o.reason_key.slice(0, 30) + "..." : o.reason_key,
      value: o.count,
    })) ?? [];

  const trendData = summary?.weekly_trend.map((w) => ({
    week: new Date(w.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    fever: w.fever,
  })) ?? [];

  const districtData = comparison?.rows
    .filter((r) => r.chw_fever > 0 || r.dhis2_malaria !== null)
    .slice(0, 10)
    .map((r) => ({
      name: r.district_name.length > 12 ? r.district_name.slice(0, 12) + "." : r.district_name,
      chw: r.chw_fever,
      dhis2: r.dhis2_malaria ?? 0,
    })) ?? [];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-100 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-neutral-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-neutral-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard report-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{t("reports")}</p>
          <h1>{t("reportDistrictHealth")}</h1>
          <p className="text-body text-neutral mt-1">
            {monthLabel()} &mdash; {totalDistricts} {t("reportDistricts")}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-caption" onClick={handlePrint}>
            <Icon name="FileText" size={16} className="mr-1.5" />
            {t("reportPrint")}
          </button>
        </div>
      </header>

      {error && (
        <div className="card rounded-xl p-4 mb-6 border-l-4" style={{ borderLeftColor: "#ff9500" }}>
          <p className="text-body text-risk-high">{error}</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI
          label={t("reportVisitsThisWeek")}
          value={summary?.visits_this_week ?? 0}
          icon="House"
          color="#2D6A4F"
        />
        <KPI
          label={t("reportFeverCases")}
          value={summary?.fever_clusters ?? 0}
          icon="Warning"
          color="#ff9500"
        />
        <KPI
          label={t("reportDangerReferrals")}
          value={summary?.danger_referrals ?? 0}
          icon="FirstAid"
          color="#ff9500"
        />
        <KPI
          label={t("reportAIOverrides")}
          value={totalOverrides}
          icon="Sparkle"
          color="#7C3AED"
          subtitle={`${activeCHWs} ${t("reportActiveCHWs")}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Fever Trend */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportFeverTrend")}</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="fever" fill="#ff9500" radius={[2, 2, 0, 0]} name={t("reportFeverCases")} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption text-neutral text-center py-8">{t("reportNoData")}</p>
          )}
        </section>

        {/* Override Reasons Pie */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportOverrideReasons")}</h3>
          {overrideReasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={overrideReasonData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {overrideReasonData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption text-neutral text-center py-8">{t("reportNoOverrides")}</p>
          )}
        </section>
      </div>

      {/* District Comparison */}
      {districtData.length > 0 && (
        <section className="card rounded-xl p-5 mb-8">
          <h3 className="text-title font-semibold mb-4">{t("reportDistrictComparison")}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={districtData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="chw" fill="#2D6A4F" name={t("reportCHWFever")} radius={[2, 2, 0, 0]} />
              <Bar dataKey="dhis2" fill="#0066cc" name="DHIS2 Malaria" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Data Quality Disclosure */}
      <section className="card rounded-xl p-5 mb-8">
        <h3 className="text-title font-semibold mb-3">{t("reportDataQuality")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DisclosureItem
            label="DHIS2"
            status="not_connected"
            note={t("reportDHIS2Note")}
          />
          <DisclosureItem
            label="iCHIS/CHT"
            status="not_connected"
            note={t("reportICHISNote")}
          />
          <DisclosureItem
            label="LMIS"
            status="not_connected"
            note={t("reportLMISNote")}
          />
        </div>
      </section>

      {/* Narrative */}
      <section className="card rounded-xl p-6">
        <h3 className="text-title font-semibold mb-3">{t("reportNarrative")}</h3>
        <div className="text-body text-text-secondary leading-relaxed space-y-3">
          <p>
            {t("reportNarrativeBody1")} {summary?.visits_this_week ?? 0} {t("reportNarrativeBody2")}
            {activeCHWs} {t("reportNarrativeBody3")}
          </p>
          <p>
            {t("reportNarrativeBody4")} {totalOverrides} {t("reportNarrativeBody5")}
          </p>
          <p className="text-caption text-neutral italic">
            {t("reportNarrativeFooter")}
          </p>
        </div>
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  icon: IconName;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon name={icon} size={20} color={color} />
        </div>
        <div>
          <p className="text-data" style={{ color }}>
            {value.toLocaleString()}
          </p>
          <p className="text-caption text-neutral">{label}</p>
          {subtitle && <p className="text-label text-neutral">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function DisclosureItem({
  label,
  status,
  note,
}: {
  label: string;
  status: "connected" | "partial" | "not_connected";
  note: string;
}) {
  const colors = {
    connected: { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
    partial: { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
    not_connected: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  };
  const c = colors[status];

  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: c.bg }}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: c.dot }}
        />
        <span className="text-caption font-medium" style={{ color: c.text }}>
          {label}
        </span>
      </div>
      <p className="text-label" style={{ color: c.text }}>
        {note}
      </p>
    </div>
  );
}
