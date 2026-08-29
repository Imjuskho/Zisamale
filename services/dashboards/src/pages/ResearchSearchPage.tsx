import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import { Icon, type IconName } from "../components/design/Icon";
import { getTopicTheme, ALL_TOPIC_KEYS } from "../design/topicTheme";
import { generateLaymanSummary, type LaymanSummary } from "../utils/laymanProcessor";
import { useToast } from "../components/design/Toast";
import { useLanguage } from "../components/design/LanguageContext";
import { SkeletonDashboard } from "../components/design/Skeleton";
import { EmptyState } from "../components/design/EmptyState";
import type { ResearchStudy } from "../types";

export function ResearchSearchPage() {
  const toast = useToast();
  const { language } = useLanguage();

  const [query, setQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [laymanMode, setLaymanMode] = useState(true);
  const [targetLang, setTargetLang] = useState<"en" | "ny">(language as "en" | "ny");
  const [expandedStudyId, setExpandedStudyId] = useState<string | null>(null);

  const [studies, setStudies] = useState<ResearchStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetLang(language as "en" | "ny");
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const st = await api.getResearchStudies();
        if (!cancelled) {
          setStudies(st);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load research");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Search filter
  const filteredStudies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studies.filter((study) => {
      const matchesTopic = selectedTopic === "all" || study.health_topic === selectedTopic;
      if (!matchesTopic) return false;
      if (!q) return true;

      const titleMatch = study.title.toLowerCase().includes(q);
      const authorsMatch = study.authors?.some((a) => a.toLowerCase().includes(q));
      const journalMatch = study.journal?.toLowerCase().includes(q);
      const districtMatch = study.study_district?.toLowerCase().includes(q);
      const topicMatch = study.health_topic.toLowerCase().includes(q);
      const doiMatch = study.doi?.toLowerCase().includes(q);

      return titleMatch || authorsMatch || journalMatch || districtMatch || topicMatch || doiMatch;
    });
  }, [studies, query, selectedTopic]);

  function handleCopySnippet(summary: LaymanSummary) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary.shareableSnippet);
      toast.show("Copied community summary to clipboard!", { type: "success" });
    }
  }

  if (loading) {
    return (
      <div className="dashboard p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard p-6">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-medium mb-3">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard research-search-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-neutral">
              Kuzisamala Research Intelligence
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-ink">
              {targetLang === "ny" ? "Kafukufuku wa Zaumoyo & Malangizo" : "Research Library & Evidence Synthesis"}
            </h1>
            <p className="text-sm text-neutral mt-1 max-w-3xl text-pretty">
              {targetLang === "ny"
                ? "Fufuzani kafukufuku yonse ya zaumoyo ku Malawi ndipo muwone malangizo a m'mudzi oyenera a CHW, madokotala, ndi a zaumoyo."
                : "Search clinical, epidemiological, and public health research across Malawi. Synthesize academic findings into actionable community briefs and field guidance for CHWs, clinicians, and health officers."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-light dark:bg-apple-gray900 p-1.5 rounded-full border border-surface-border">
            <button
              type="button"
              onClick={() => setTargetLang("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                targetLang === "en"
                  ? "bg-apple-blue text-white shadow-sm"
                  : "text-neutral hover:text-apple-ink"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setTargetLang("ny")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                targetLang === "ny"
                  ? "bg-apple-blue text-white shadow-sm"
                  : "text-neutral hover:text-apple-ink"
              }`}
            >
              Chichewa
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters Bar */}
      <section className="card-elevated p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3 bg-surface-bg dark:bg-apple-tile1 border border-surface-border rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-apple-blue-focus transition-all">
          <Icon name="MagnifyingGlass" size={20} className="text-neutral shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              targetLang === "ny"
                ? "Lembani mutu wa kafukufuku, ofufuza, chigawo, kapena matenda..."
                : "Search research studies by title, author, journal, district, keyword, or finding..."
            }
            className="w-full bg-transparent text-apple-ink text-sm sm:text-base outline-none placeholder:text-neutral-tertiary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-neutral hover:text-apple-ink"
              aria-label="Clear search"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>

        {/* Topic Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs">
          <button
            type="button"
            onClick={() => setSelectedTopic("all")}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-all ${
              selectedTopic === "all"
                ? "bg-apple-ink text-white dark:bg-white dark:text-apple-ink font-semibold"
                : "bg-neutral-light text-neutral hover:text-apple-ink border border-surface-border"
            }`}
          >
            All Topics ({studies.length})
          </button>
          {ALL_TOPIC_KEYS.map((key) => {
            const theme = getTopicTheme(key);
            const count = studies.filter((s) => s.health_topic === key).length;
            const isSelected = selectedTopic === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTopic(key)}
                className={`px-3 py-1.5 rounded-full font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? `${theme.bgTailwind} ${theme.textTailwind} ring-2 ring-current font-bold`
                    : "bg-surface-bg border border-surface-border text-neutral hover:text-apple-ink"
                }`}
              >
                <Icon name={theme.icon as IconName} size={14} />
                <span>{targetLang === "ny" ? theme.labelNy : theme.label}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-neutral">
            <Icon name="Sparkle" size={16} color="#0066CC" />
            <span>
              Showing <strong>{filteredStudies.length}</strong> studies
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-neutral font-medium">View Mode:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-neutral-light dark:bg-apple-tile2 border border-surface-border">
              <button
                type="button"
                onClick={() => setLaymanMode(true)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  laymanMode
                    ? "bg-apple-blue text-white shadow-sm"
                    : "text-neutral hover:text-apple-ink"
                }`}
              >
                Community Action Brief
              </button>
              <button
                type="button"
                onClick={() => setLaymanMode(false)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  !laymanMode
                    ? "bg-apple-blue text-white shadow-sm"
                    : "text-neutral hover:text-apple-ink"
                }`}
              >
                Clinical Evidence
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results List */}
      {filteredStudies.length === 0 ? (
        <EmptyState
          title={targetLang === "ny" ? "Palibe kafukufuku wopezeka" : "No research studies found"}
          subtitle={
            targetLang === "ny"
              ? "Yesani kusintha mawu omwe mwafufuza kapena sankhani mutu wina wa zaumoyo."
              : "Try searching for a different health condition, district name, or clear topic filters."
          }
          icon="MagnifyingGlass"
          action={{
            label: "Reset filters",
            onClick: () => {
              setQuery("");
              setSelectedTopic("all");
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredStudies.map((study) => {
            const theme = getTopicTheme(study.health_topic);
            const isExpanded = expandedStudyId === study.study_id;
            const layman = generateLaymanSummary(study, targetLang);

            return (
              <article
                key={study.study_id}
                className="card-elevated hover:shadow-card-hover transition-all duration-200 p-5 sm:p-6 space-y-4 rounded-2xl border border-surface-border"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${theme.bgTailwind} ${theme.textTailwind}`}
                      >
                        <Icon name={theme.icon as IconName} size={12} />
                        {targetLang === "ny" ? theme.labelNy : theme.label}
                      </span>
                      {study.study_district && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-light dark:bg-apple-tile1 text-neutral font-medium">
                          <Icon name="MapPin" size={12} />
                          {study.study_district}
                        </span>
                      )}
                      {study.publication_year && (
                        <span className="text-neutral">
                          • {study.publication_year}
                        </span>
                      )}
                      {study.journal && (
                        <span className="text-neutral italic">
                          • {study.journal}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-apple-ink tracking-tight">
                      {laymanMode ? layman.plainTitle : study.title}
                    </h2>

                    {study.authors && study.authors.length > 0 && (
                      <p className="text-xs text-neutral truncate">
                        By {study.authors.join(", ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStudyId(isExpanded ? null : study.study_id)
                    }
                    className="p-2 rounded-xl text-neutral hover:text-apple-ink hover:bg-neutral-light transition-all shrink-0"
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    <Icon name={isExpanded ? "CaretUp" : "CaretDown"} size={18} />
                  </button>
                </div>

                {/* Layman Plain Language Mode */}
                {laymanMode ? (
                  <div className="space-y-4 pt-2">
                    {/* Core finding box */}
                    <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-sm space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
                        <Icon name="Sparkle" size={16} color="#0066CC" />
                        <span>
                          {targetLang === "ny"
                            ? "Zomwe Kafukufukuyu Watsimikiza (Core Finding)"
                            : "Key Finding in Plain Words"}
                        </span>
                      </div>
                      <p className="text-blue-950 dark:text-blue-200 leading-relaxed">
                        {layman.coreFinding}
                      </p>
                    </div>

                    {/* What this means for your family */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral">
                        {targetLang === "ny"
                          ? "Zomwe Izi Zikutanthauza Kwa Banja Lanu"
                          : "What This Means for Families & Communities"}
                      </h4>
                      <p className="text-sm text-apple-ink leading-relaxed">
                        {layman.whatItMeansForYou}
                      </p>
                    </div>

                    {/* Actionable Steps */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral">
                        {targetLang === "ny"
                          ? "Zoyenera Kuchita M'mudzi (Actionable Steps)"
                          : "Actionable Steps You Can Take Today"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {layman.actionableSteps.map((step, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-surface-card border border-surface-border text-xs flex items-start gap-2.5"
                          >
                            <span className="size-5 rounded-full bg-apple-blue/10 text-apple-blue font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-apple-ink font-medium leading-normal">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expanded details: Myths, Numbers, When to seek help */}
                    {isExpanded && (
                      <div className="space-y-4 pt-3 border-t border-surface-border animate-fade-in">
                        {/* Numbers explained */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral">
                            {targetLang === "ny"
                              ? "Ziwerengero ndi Zotsatira Zosavuta"
                              : "Numbers & Evidence in Human Terms"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {layman.numbersExplained.map((num, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-surface-bg border border-surface-border text-xs space-y-1"
                              >
                                <span className="font-semibold text-neutral text-[11px]">
                                  {num.original}
                                </span>
                                <p className="text-apple-ink font-medium">
                                  {num.plainExplanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Myths vs Facts */}
                        {layman.mythsAndFacts.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral">
                              {targetLang === "ny"
                                ? "Zolakwika Zomwe Anthu Amakhulupirira (Myths vs Truth)"
                                : "Common Misconceptions & Real Truths"}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {layman.mythsAndFacts.map((mf, i) => (
                                <div
                                  key={i}
                                  className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-400 font-bold">
                                    <Icon name="XCircle" size={14} />
                                    <span>Myth: "{mf.myth}"</span>
                                  </div>
                                  <div className="flex items-start gap-1.5 text-green-800 dark:text-green-300 font-medium">
                                    <Icon name="CheckCircle" size={14} className="shrink-0 mt-0.5" />
                                    <span>Truth: {mf.fact}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* When to visit clinic */}
                        <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs space-y-2">
                          <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                            <Icon name="WarningOctagon" size={16} />
                            <span>
                              {targetLang === "ny"
                                ? "Nthawi Yopita Kuchipatala Mwachangu"
                                : "Danger Signs: When to Seek Clinic Care Immediately"}
                            </span>
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {layman.whenToSeekHelp.map((sign, i) => (
                              <li key={i} className="text-red-900 dark:text-red-200 font-medium flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                                {sign}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-surface-border flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(layman)}
                          className="btn-secondary py-1.5 px-3 text-xs rounded-lg flex items-center gap-1.5"
                        >
                          <Icon name="Share" size={14} />
                          <span>Copy CHW Field Message (SMS/WhatsApp)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStudyId(isExpanded ? null : study.study_id)
                        }
                        className="text-apple-blue font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Hide detailed guide" : "Show full community action guide & myths"}</span>
                        <Icon name={isExpanded ? "CaretUp" : "CaretDown"} size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Clinical / Academic Mode */
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                        <span className="text-neutral font-medium block">Design:</span>
                        <strong className="text-apple-ink">{study.study_design ?? "Observational"}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                        <span className="text-neutral font-medium block">Sample Size:</span>
                        <strong className="text-apple-ink">{study.sample_size?.toLocaleString() ?? "N/A"}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                        <span className="text-neutral font-medium block">Consent Status:</span>
                        <strong className="text-apple-ink capitalize">{study.consent_status}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                        <span className="text-neutral font-medium block">Status:</span>
                        <strong className="text-apple-ink capitalize">{study.status}</strong>
                      </div>
                    </div>

                    {study.doi && (
                      <p className="text-neutral">
                        DOI: <code className="text-apple-ink bg-neutral-light px-1.5 py-0.5 rounded">{study.doi}</code>
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
