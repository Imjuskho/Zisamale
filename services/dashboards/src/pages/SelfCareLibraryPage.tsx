import { useEffect, useMemo, useState } from "react";
import { KPICard } from "../components/design/KPICard";
import { EmptyState } from "../components/design/EmptyState";
import { SkeletonDashboard } from "../components/design/Skeleton";
import { api } from "../services/api";
import { getTopicTheme, getSeverityTheme, ALL_TOPIC_KEYS } from "../design/topicTheme";
import { Icon, type IconName } from "../components/design/Icon";
import type { SelfCareGuide } from "../types";

export function SelfCareLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<SelfCareGuide[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [selectedGuide, setSelectedGuide] = useState<SelfCareGuide | null>(null);
  const [language, setLanguage] = useState<"en" | "ny">("en");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: { category?: string; severity?: string } = {};
        if (categoryFilter) params.category = categoryFilter;
        if (severityFilter) params.severity = severityFilter;
        const data = await api.getSelfCareGuides(Object.keys(params).length ? params : undefined);
        if (!cancelled) setGuides(data);
      } catch {
        // endpoint may not be available yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [categoryFilter, severityFilter]);

  const categories = useMemo(() => {
    const cats = new Set(guides.map((g) => g.category));
    return Array.from(cats).sort();
  }, [guides]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of guides) {
      c[g.category] = (c[g.category] ?? 0) + 1;
    }
    return c;
  }, [guides]);

  const emergencyCount = guides.filter((g) => g.severity === "emergency").length;
  const warningCount = guides.filter((g) => g.severity === "warning").length;

  if (loading) {
    return (
      <div className="dashboard">
        <SkeletonDashboard />
      </div>
    );
  }

  if (selectedGuide) {
    return (
      <div className="dashboard self-care-dashboard">
        <header className="dashboard-header">
          <div>
            <button
              onClick={() => setSelectedGuide(null)}
              className="text-caption text-apple-blue hover:underline mb-1"
            >
              &larr; Back to guides
            </button>
            <h1>{language === "en" ? selectedGuide.title : selectedGuide.title_chichewa ?? selectedGuide.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {(() => {
                const sev = getSeverityTheme(selectedGuide.severity);
                return (
                  <span
                    className="text-caption px-2 py-0.5 rounded"
                    style={{ backgroundColor: sev.hex + "20", color: sev.hex }}
                  >
                    {sev.label}
                  </span>
                );
              })()}
              <span className="text-caption bg-neutral-100 px-2 py-0.5 rounded">
                {getTopicTheme(selectedGuide.category).label}
              </span>
            </div>
          </div>
        </header>

        {/* Language Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-caption text-neutral">Language:</span>
          <button
            onClick={() => setLanguage("en")}
            className={`text-caption px-3 py-1 rounded border ${
              language === "en"
                ? "bg-apple-blue text-white border-apple-blue"
                : "bg-white text-neutral border-neutral-200"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("ny")}
            className={`text-caption px-3 py-1 rounded border ${
              language === "ny"
                ? "bg-apple-blue text-white border-apple-blue"
                : "bg-white text-neutral border-neutral-200"
            }`}
          >
            Chichewa
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What It Is */}
          {(language === "en" ? selectedGuide.what_it_is : selectedGuide.what_it_is_chichewa) && (
            <div className="card rounded-xl p-6">
              <h3 className="text-title font-semibold mb-2">What is this?</h3>
              <p className="text-body text-neutral leading-relaxed">
                {language === "en" ? selectedGuide.what_it_is : selectedGuide.what_it_is_chichewa}
              </p>
            </div>
          )}

          {/* What To Do Now */}
          {(language === "en" ? selectedGuide.what_to_do_now : selectedGuide.what_to_do_now_chichewa)?.length ? (
            <div className="card rounded-xl p-6 border-l-4 border-risk-low">
              <h3 className="text-title font-semibold mb-2" style={{ color: "#34c759" }}>
                What to do now
              </h3>
              <ul className="space-y-2">
                {(language === "en" ? selectedGuide.what_to_do_now : selectedGuide.what_to_do_now_chichewa).map(
                  (step, i) => (
                    <li key={i} className="flex items-start gap-2 text-body">
                      <span className="text-risk-low mt-0.5">&#10003;</span>
                      <span>{step}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : null}

          {/* What NOT To Do */}
          {(language === "en" ? selectedGuide.what_not_to_do : selectedGuide.what_not_to_do_chichewa)?.length ? (
            <div className="card rounded-xl p-6 border-l-4 border-risk-critical">
              <h3 className="text-title font-semibold mb-2" style={{ color: "#ff3b30" }}>
                What NOT to do
              </h3>
              <ul className="space-y-2">
                {(language === "en" ? selectedGuide.what_not_to_do : selectedGuide.what_not_to_do_chichewa).map(
                  (step, i) => (
                    <li key={i} className="flex items-start gap-2 text-body">
                      <span className="text-risk-critical mt-0.5">&#10007;</span>
                      <span>{step}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : null}

          {/* When to Seek Help */}
          {(language === "en" ? selectedGuide.when_to_seek_help : selectedGuide.when_to_seek_help_chichewa) && (
            <div className="card rounded-xl p-6 border-l-4 border-yellow-500">
              <h3 className="text-title font-semibold mb-2" style={{ color: "#ff9500" }}>
                When to seek help
              </h3>
              <p className="text-body text-neutral leading-relaxed">
                {language === "en" ? selectedGuide.when_to_seek_help : selectedGuide.when_to_seek_help_chichewa}
              </p>
            </div>
          )}

          {/* Prevention */}
          {(language === "en" ? selectedGuide.prevention : selectedGuide.prevention_chichewa)?.length ? (
            <div className="card rounded-xl p-6">
              <h3 className="text-title font-semibold mb-2">Prevention</h3>
              <ul className="space-y-2">
                {(language === "en" ? selectedGuide.prevention : selectedGuide.prevention_chichewa).map(
                  (item, i) => (
                    <li key={i} className="flex items-start gap-2 text-body">
                      <span className="text-apple-blue mt-0.5">&#8226;</span>
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Source */}
        {selectedGuide.source && (
          <p className="text-caption text-neutral mt-6">
            Source: {selectedGuide.source}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard self-care-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Kuzisamala</p>
          <h1>Self-Care Library</h1>
          <p>Health guides for CHWs and communities</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Guides"
          value={guides.length}
          icon="BookOpen"
          iconColor="#0066cc"
          context={`${categories.length} categories`}
        />
        <KPICard
          label="Emergency Guides"
          value={emergencyCount}
          icon="WarningOctagon"
          iconColor="#ff3b30"
          context="Critical care instructions"
        />
        <KPICard
          label="Warning Guides"
          value={warningCount}
          icon="WarningCircle"
          iconColor="#ff9500"
          context="Seek help soon"
        />
        <KPICard
          label="Categories"
          value={categories.length}
          icon="Stack"
          iconColor="#0066cc"
        />
      </div>

      {/* Category Grid */}
      <section className="mb-8">
        <h2 className="text-title font-semibold mb-4">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ALL_TOPIC_KEYS
            .filter((key) => counts[key])
            .map((key) => {
              const theme = getTopicTheme(key);
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(categoryFilter === key ? "" : key)}
                  className={`card rounded-xl p-4 text-center transition-all hover:shadow-md ${
                    categoryFilter === key ? "ring-2 ring-apple-blue" : ""
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    <Icon name={theme.icon as IconName} size={24} color={theme.hex} weight="fill" />
                  </div>
                  <span className="text-caption font-medium block">{theme.label}</span>
                  <span className="text-caption text-neutral">{counts[key] ?? 0} guides</span>
                </button>
              );
            })}
        </div>
      </section>

      {/* Severity Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-caption text-neutral font-medium">Severity:</span>
        {["", "info", "warning", "emergency"].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`text-caption px-3 py-1 rounded-full border transition-colors ${
              severityFilter === sev
                ? "bg-apple-blue text-white border-apple-blue"
                : "bg-white text-neutral border-neutral-200 hover:border-apple-blue"
            }`}
          >
            {sev === "" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
          </button>
        ))}
      </div>

      {/* Guide Cards */}
      {guides.length === 0 ? (
        <EmptyState
          title="No self-care guides"
          subtitle="Add self-care guides to help CHWs and communities manage health conditions."
          icon="BookOpen"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((guide) => {
            const sev = getSeverityTheme(guide.severity);
            const catTheme = getTopicTheme(guide.category);
            return (
              <button
                key={guide.guide_id}
                onClick={() => setSelectedGuide(guide)}
                className="card rounded-xl p-4 text-left hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon name={catTheme.icon as IconName} size={24} color={catTheme.hex} weight="fill" />
                  <span
                    className="text-caption px-2 py-0.5 rounded"
                    style={{ backgroundColor: sev.hex + "20", color: sev.hex }}
                  >
                    {sev.label}
                  </span>
                </div>
                <h3 className="text-body font-medium mb-1">{guide.title}</h3>
                {guide.title_chichewa && (
                  <p className="text-caption text-neutral italic mb-2">{guide.title_chichewa}</p>
                )}
                <p className="text-caption text-neutral">
                  {guide.what_to_do_now.length} steps &middot; {catTheme.label}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
