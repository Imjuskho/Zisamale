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
import { getTopicTheme, getAssetTypeTheme, getStatusTheme } from "../design/topicTheme";
import type {
  ResearchStudy,
  KnowledgeAsset,
  SelfCareGuide,
  CommunityHealthTalk,
  SAMALASummary,
} from "../types";
import { useT } from "../components/design/LanguageContext";
import { Icon, type IconName } from "../components/design/Icon";

const PIE_COLORS = ["#0066cc", "#34c759", "#ff9500", "#0066cc", "#ff9500", "#0891B2", "#0066cc"];

function monthLabel(date = new Date()): string {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export default function SAMALAReport() {
  const t = useT();
  const [summary, setSummary] = useState<SAMALASummary | null>(null);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [guides, setGuides] = useState<SelfCareGuide[]>([]);
  const [talks, setTalks] = useState<CommunityHealthTalk[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st, a, g, tk] = await Promise.all([
        api.getSAMALASummary(),
        api.getResearchStudies(),
        api.getKnowledgeAssets(),
        api.getSelfCareGuides(),
        api.getHealthTalks(),
      ]);
      setSummary(s);
      setStudies(st);
      setAssets(a);
      setGuides(g);
      setTalks(tk);
    } catch {
      // endpoints may not be available yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePrint = () => window.print();

  const topicData = summary
    ? Object.entries(summary.topic_coverage)
        .sort(([, a], [, b]) => b - a)
        .map(([topic, count]) => ({
          name: getTopicTheme(topic).label,
          value: count,
        }))
    : [];

  const assetTypeData = summary
    ? Object.entries(summary.assets_by_type).map(([type, count]) => ({
        name: getAssetTypeTheme(type).label,
        value: count,
      }))
    : [];

  const studyStatusData = summary
    ? Object.entries(summary.studies_by_status).map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count,
      }))
    : [];

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
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard report-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">{t("reports")}</p>
          <h1>{t("reportSAMALA")}</h1>
          <p className="text-body text-neutral mt-1">
            {monthLabel()} &mdash; {studies.length} {t("reportStudies")}, {assets.length}{" "}
            {t("reportAssets")}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-caption" onClick={handlePrint}>
            <Icon name="FileText" size={16} className="mr-1.5" />
            {t("reportPrint")}
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI
          label={t("reportTotalStudies")}
          value={summary?.total_studies ?? 0}
          icon="BookOpen"
          color="#0066cc"
          subtitle={`${summary?.studies_by_status?.deployed ?? 0} deployed`}
        />
        <KPI
          label={t("reportTotalAssets")}
          value={summary?.total_assets ?? 0}
          icon="FileText"
          color="#34c759"
          subtitle={`${summary?.assets_by_type?.infographic ?? 0} infographics`}
        />
        <KPI
          label={t("reportTotalGuides")}
          value={guides.length}
          icon="Heart"
          color="#ff9500"
          subtitle={`${guides.filter((g) => g.severity === "emergency").length} emergency`}
        />
        <KPI
          label={t("reportTotalTalks")}
          value={talks.length}
          icon="Megaphone"
          color="#0066cc"
          subtitle={`${talks.reduce((a, t) => a + t.duration_minutes, 0)} min total`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Topic Coverage */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportTopicCoverage")}</h3>
          {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topicData}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="#0066cc" radius={[0, 2, 2, 0]} name={t("reportAssetsAndStudies")} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption text-neutral text-center py-8">{t("reportNoData")}</p>
          )}
        </section>

        {/* Asset Type Distribution */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportAssetTypes")}</h3>
          {assetTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={assetTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {assetTypeData.map((_, i) => (
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption text-neutral text-center py-8">{t("reportNoData")}</p>
          )}
        </section>
      </div>

      {/* Study Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportStudyStatus")}</h3>
          {studyStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={studyStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {studyStatusData.map((entry) => (
                    <Cell
                      key={entry.name}
                       fill={getStatusTheme(entry.name).hex}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-caption text-neutral text-center py-8">{t("reportNoData")}</p>
          )}
        </section>

        {/* Deployment Status */}
        <section className="card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-title font-semibold mb-4">{t("reportDeploymentStatus")}</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-neutral-50">
              <p className="text-data" style={{ color: "#0066cc" }}>
                {summary?.total_deployments ?? 0}
              </p>
              <p className="text-caption text-neutral">{t("reportDeployments")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-neutral-50">
              <p className="text-data" style={{ color: "#34c759" }}>
                {summary?.households_reached ?? 0}
              </p>
              <p className="text-caption text-neutral">{t("reportHouseholdsReached")}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-neutral-50">
              <p className="text-data" style={{ color: "#ff9500" }}>
                {summary?.avg_knowledge_change != null
                  ? `+${Math.round(summary.avg_knowledge_change * 100)}%`
                  : "--"}
              </p>
              <p className="text-caption text-neutral">{t("reportKnowledgeChange")}</p>
            </div>
          </div>
          <p className="text-caption text-neutral italic">
            {t("reportDeploymentNote")}
          </p>
        </section>
      </div>

      {/* Studies Inventory Table */}
      <section className="card rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-title font-semibold">{t("reportStudiesInventory")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableTitle")}</th>
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableTopic")}</th>
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableDesign")}</th>
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableDistrict")}</th>
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableConsent")}</th>
                <th className="px-4 py-3 text-label font-medium text-neutral">{t("reportTableStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {studies.map((study) => (
                <tr key={study.study_id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-body max-w-xs truncate">{study.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                       {getTopicTheme(study.health_topic).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-caption text-neutral capitalize">
                    {study.study_design?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-caption text-neutral">
                    {study.study_district ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ConsentBadge status={study.consent_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={study.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guides & Talks Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Self-Care Guides */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportSelfCareGuides")}</h3>
          <div className="space-y-3">
            {guides.map((guide) => (
              <div key={guide.guide_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      guide.severity === "emergency"
                        ? "#ff9500"
                        : guide.severity === "warning"
                          ? "#ff9500"
                          : "#34c759",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-body truncate">{guide.title}</p>
                  {guide.title_chichewa && (
                    <p className="text-label text-neutral italic truncate">{guide.title_chichewa}</p>
                  )}
                </div>
                <span className="text-label text-neutral capitalize">{guide.severity}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Community Health Talks */}
        <section className="card rounded-xl p-5">
          <h3 className="text-title font-semibold mb-4">{t("reportCommunityTalks")}</h3>
          <div className="space-y-3">
            {talks.map((talk) => (
              <div key={talk.talk_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50">
                <Icon name="Megaphone" size={16} color="#0066cc" />
                <div className="flex-1 min-w-0">
                  <p className="text-body truncate">{talk.title}</p>
                  {talk.title_chichewa && (
                    <p className="text-label text-neutral italic truncate">{talk.title_chichewa}</p>
                  )}
                </div>
                <span className="text-label text-neutral">{talk.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Narrative */}
      <section className="card rounded-xl p-6">
        <h3 className="text-title font-semibold mb-3">{t("reportSAMALANarrative")}</h3>
        <div className="text-body text-text-secondary leading-relaxed space-y-3">
          <p>
            {t("reportSAMALANarrativeBody1")} {summary?.total_studies ?? 0}{" "}
            {t("reportSAMALANarrativeBody2")} {Object.keys(summary?.topic_coverage ?? {}).length}{" "}
            {t("reportSAMALANarrativeBody3")}
          </p>
          <p>
            {t("reportSAMALANarrativeBody4")} {summary?.total_assets ?? 0}{" "}
            {t("reportSAMALANarrativeBody5")}
          </p>
          <p className="text-caption text-neutral italic">
            {t("reportSAMALANarrativeFooter")}
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

function ConsentBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    granted: { bg: "rgba(52, 199, 89, 0.08)", text: "#34c759" },
    denied: { bg: "rgba(255, 59, 48, 0.08)", text: "#ff3b30" },
    pending: { bg: "rgba(255, 149, 0, 0.08)", text: "#ff9500" },
  };
  const c = colors[status] ?? colors.pending;
  return (
    <span className="text-caption px-2 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = getStatusTheme(status).hex;
  return (
    <span
      className="text-caption px-2 py-0.5 rounded"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {status}
    </span>
  );
}
