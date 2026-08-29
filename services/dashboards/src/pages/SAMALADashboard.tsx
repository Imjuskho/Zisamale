import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/design/Icon";
import { KPICard } from "../components/design/KPICard";
import { EmptyState } from "../components/design/EmptyState";
import { SkeletonDashboard } from "../components/design/Skeleton";
import { api } from "../services/api";
import { useAppSelector } from "../hooks/useRedux";
import { getTopicTheme, getAssetTypeTheme, getStatusTheme, ALL_TOPIC_KEYS } from "../design/topicTheme";
import type {
  ResearchStudy,
  KnowledgeAsset,
  KnowledgeDeployment,
  SelfCareGuide,
  CommunityHealthTalk,
  SAMALASummary,
} from "../types";

export function SAMALADashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const districtId = user?.district;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SAMALASummary | null>(null);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [deployments, setDeployments] = useState<KnowledgeDeployment[]>([]);
  const [guides, setGuides] = useState<SelfCareGuide[]>([]);
  const [talks, setTalks] = useState<CommunityHealthTalk[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, st, a, d, g, t] = await Promise.all([
          api.getSAMALASummary(districtId),
          api.getResearchStudies(),
          api.getKnowledgeAssets(),
          api.getKnowledgeDeployments({ district_id: districtId }),
          api.getSelfCareGuides(),
          api.getHealthTalks(),
        ]);
        if (!cancelled) {
          setSummary(s);
          setStudies(st);
          setAssets(a);
          setDeployments(d);
          setGuides(g);
          setTalks(t);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load knowledge data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [districtId]);

  const filteredStudies = useMemo(
    () => (topicFilter ? studies.filter((s) => s.health_topic === topicFilter) : studies),
    [studies, topicFilter]
  );

  const filteredAssets = useMemo(
    () => (topicFilter ? assets.filter((a) => a.health_topic === topicFilter) : assets),
    [assets, topicFilter]
  );

  const filteredGuides = useMemo(
    () => (topicFilter ? guides.filter((g) => g.category === topicFilter) : guides),
    [guides, topicFilter]
  );

  const filteredTalks = useMemo(
    () => (topicFilter ? talks.filter((t) => t.health_topic === topicFilter) : talks),
    [talks, topicFilter]
  );

  if (loading) {
    return (
      <div className="dashboard">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium mb-2">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary text-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard samala-dashboard">
      <header className="dashboard-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="dashboard-kicker">Knowledge Translation</p>
          <h1>SAMALA-AI</h1>
          <p>Research-to-community knowledge pipeline</p>
        </div>
        <Link
          to="/samala/search"
          className="btn-primary flex items-center gap-2 text-sm shadow-sm hover:shadow-md transition-all"
        >
          <Icon name="MagnifyingGlass" size={16} />
          <span>Search Research Library</span>
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Studies Ingested"
          value={summary?.total_studies ?? 0}
          icon="BookOpen"
          iconColor="#0066cc"
          context={`${summary?.studies_by_status?.deployed ?? 0} deployed`}
        />
        <KPICard
          label="Knowledge Assets"
          value={summary?.total_assets ?? 0}
          icon="FileText"
          iconColor="#0066cc"
          context={`${summary?.assets_by_type?.infographic ?? 0} infographics, ${summary?.assets_by_type?.chw_brief ?? 0} CHW briefs`}
        />
        <KPICard
          label="Households Reached"
          value={summary?.households_reached ?? 0}
          icon="Users"
          iconColor="#34c759"
          context={`${summary?.total_deployments ?? 0} deployments`}
        />
        <KPICard
          label="Avg Knowledge Change"
          value={
            summary?.avg_knowledge_change != null
              ? `+${Math.round(summary.avg_knowledge_change * 100)}%`
              : null
          }
          icon="TrendUp"
          iconColor="#ff9500"
          context="Pre to post assessment"
        />
      </div>

      {/* Topic Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-caption text-neutral font-medium">Filter by topic:</span>
        <button
          onClick={() => setTopicFilter("")}
          aria-pressed={!topicFilter}
          className={`text-caption px-3 py-1 rounded-full border transition-colors ${
            !topicFilter
              ? "bg-apple-blue text-white border-apple-blue"
              : "bg-white text-neutral border-neutral-200 hover:border-apple-blue"
          }`}
        >
          All
        </button>
        {ALL_TOPIC_KEYS.map((key) => {
          const t = getTopicTheme(key);
          return (
            <button
              key={key}
              onClick={() => setTopicFilter(key)}
              aria-pressed={topicFilter === key}
              className={`text-caption px-3 py-1 rounded-full border transition-colors ${
                topicFilter === key
                  ? `${t.bgTailwind} ${t.textTailwind} ${t.borderTailwind}`
                  : "bg-white text-neutral border-neutral-200 hover:border-apple-blue"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Topic Distribution */}
      {summary?.topic_coverage && Object.keys(summary.topic_coverage).length > 0 && (
        <section className="mb-8">
          <h2 className="text-title font-semibold mb-4">Topic Coverage</h2>
          <div className="card rounded-xl p-4">
            <div className="space-y-3">
              {Object.entries(summary.topic_coverage)
                .sort(([, a], [, b]) => b - a)
                .map(([topic, count]) => {
                  const max = Math.max(...Object.values(summary.topic_coverage));
                  const pct = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <div key={topic} className="flex items-center gap-3">
                      <span className="text-caption text-neutral w-36 text-right truncate">
                        {getTopicTheme(topic).label}
                      </span>
                      <div className="flex-1 h-6 bg-neutral-50 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: getTopicTheme(topic).hex,
                          }}
                        />
                      </div>
                      <span className="text-caption font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* Research Inventory */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">Research Inventory</h2>
        {filteredStudies.length === 0 ? (
          <EmptyState
            title="No studies yet"
            subtitle="Ingest research studies to begin the knowledge translation pipeline."
            icon="BookOpen"
          />
        ) : (
          <div className="card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Title</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Topic</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">District</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Consent</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudies.map((study) => (
                    <tr key={study.study_id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-body max-w-xs truncate">{study.title}</td>
                      <td className="px-4 py-3">
                        <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                          {getTopicTheme(study.health_topic).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-caption text-neutral">{study.study_district ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-caption px-2 py-0.5 rounded"
                          style={{
                            backgroundColor:
                              study.consent_status === "granted"
                                ? "rgba(52, 199, 89, 0.08)"
                                : study.consent_status === "denied"
                                  ? "rgba(255, 59, 48, 0.08)"
                                  : "rgba(255, 149, 0, 0.08)",
                            color:
                              study.consent_status === "granted"
                                ? "#34c759"
                                : study.consent_status === "denied"
                                  ? "#ff3b30"
                                  : "#ff9500",
                          }}
                        >
                          {study.consent_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-caption px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${getStatusTheme(study.status).hex}18`,
                            color: getStatusTheme(study.status).hex,
                          }}
                        >
                          {study.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Knowledge Assets */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">Knowledge Assets</h2>
        {filteredAssets.length === 0 ? (
          <EmptyState
            title="No assets created"
            subtitle="Synthesize research into communication assets for communities."
            icon="FileText"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div key={asset.asset_id} className="card rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                    {getAssetTypeTheme(asset.asset_type).label}
                  </span>
                  <span
                    className="text-caption px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        asset.severity === "emergency"
                          ? "rgba(255, 59, 48, 0.08)"
                          : asset.severity === "warning"
                            ? "rgba(255, 149, 0, 0.08)"
                            : "rgba(52, 199, 89, 0.08)",
                      color:
                        asset.severity === "emergency"
                          ? "#ff3b30"
                          : asset.severity === "warning"
                            ? "#ff9500"
                            : "#34c759",
                    }}
                  >
                    {asset.severity}
                  </span>
                </div>
                <h3 className="text-body font-medium mb-1">{asset.title}</h3>
                {asset.title_chichewa && (
                  <p className="text-caption text-neutral italic mb-2">{asset.title_chichewa}</p>
                )}
                <p className="text-caption text-neutral mb-3 line-clamp-2">{asset.key_finding}</p>
                <div className="flex items-center justify-between">
                  <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                    {getTopicTheme(asset.health_topic).label}
                  </span>
                  <span
                    className="text-caption px-2 py-0.5 rounded"
                    style={{
                       backgroundColor: `${getStatusTheme(asset.status).hex}18`,
                        color: getStatusTheme(asset.status).hex,
                    }}
                  >
                    {asset.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Self-Care Guides */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">Self-Care Guides</h2>
        {filteredGuides.length === 0 ? (
          <EmptyState
            title="No guides yet"
            subtitle="Create self-care guides for community health."
            icon="BookOpen"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((guide) => (
              <div key={guide.guide_id} className="card rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="text-caption px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        guide.severity === "emergency"
                          ? "rgba(255, 59, 48, 0.08)"
                          : guide.severity === "warning"
                            ? "rgba(255, 149, 0, 0.08)"
                            : "rgba(52, 199, 89, 0.08)",
                      color:
                        guide.severity === "emergency"
                          ? "#ff3b30"
                          : guide.severity === "warning"
                            ? "#ff9500"
                            : "#34c759",
                    }}
                  >
                    {guide.severity}
                  </span>
                  <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                    {getTopicTheme(guide.category).label}
                  </span>
                </div>
                <h3 className="text-body font-medium mb-1">{guide.title}</h3>
                {guide.title_chichewa && (
                  <p className="text-caption text-neutral italic mb-2">{guide.title_chichewa}</p>
                )}
                {guide.what_it_is && (
                  <p className="text-caption text-neutral mb-3 line-clamp-2">{guide.what_it_is}</p>
                )}
                <div className="flex items-center gap-2">
                  {guide.audience?.split(",").map((a) => (
                    <span key={a} className="text-caption bg-neutral-100 px-2 py-0.5 rounded capitalize">
                      {a.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Community Health Talks */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">Community Health Talks</h2>
        {filteredTalks.length === 0 ? (
          <EmptyState
            title="No talks yet"
            subtitle="Create community health talk templates."
            icon="Users"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalks.map((talk) => (
              <div key={talk.talk_id} className="card rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                    {talk.duration_minutes} min
                  </span>
                  <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                    {getTopicTheme(talk.health_topic).label}
                  </span>
                </div>
                <h3 className="text-body font-medium mb-1">{talk.title}</h3>
                {talk.title_chichewa && (
                  <p className="text-caption text-neutral italic mb-2">{talk.title_chichewa}</p>
                )}
                <p className="text-caption text-neutral mb-3">
                  {talk.talking_points.length} talking points &middot; {talk.discussion_questions.length} discussion questions
                </p>
                {talk.pledge_card_text && (
                  <p className="text-caption text-neutral italic line-clamp-2 border-t border-neutral-100 pt-2 mt-2">
                    Pledge: {talk.pledge_card_text.slice(0, 80)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Deployments */}
      <section>
        <h2 className="text-title font-semibold mb-4">Recent Deployments</h2>
        {deployments.length === 0 ? (
          <EmptyState
            title="No deployments yet"
            subtitle="Deploy knowledge assets to communities through CHWs."
            icon="ArrowRight"
          />
        ) : (
          <div className="card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Date</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Method</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Households</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Knowledge Δ</th>
                    <th className="px-4 py-3 text-caption font-medium text-neutral">Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.slice(0, 10).map((dep) => {
                    const kDelta =
                      dep.knowledge_post_score != null && dep.knowledge_pre_score != null
                        ? dep.knowledge_post_score - dep.knowledge_pre_score
                        : null;
                    return (
                      <tr key={dep.deployment_id} className="border-b border-neutral-50 hover:bg-neutral-50">
                        <td className="px-4 py-3 text-caption text-neutral">
                          {dep.deployed_at ? new Date(dep.deployed_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-caption capitalize">
                          {dep.delivery_method.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-body font-medium">{dep.households_reached}</td>
                        <td className="px-4 py-3">
                          {kDelta != null ? (
                            <span
                              className="text-caption font-medium"
                              style={{ color: kDelta >= 0 ? "#34c759" : "#ff3b30" }}
                            >
                              {kDelta >= 0 ? "+" : ""}
                              {Math.round(kDelta * 100)}%
                            </span>
                          ) : (
                            <span className="text-caption text-neutral">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {dep.behavior_change_score != null ? (
                            <span className="text-caption font-medium text-risk-low">
                              {Math.round(dep.behavior_change_score * 100)}%
                            </span>
                          ) : (
                            <span className="text-caption text-neutral">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
