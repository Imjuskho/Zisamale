import { useMemo, useState } from "react";
import { useT } from "../components/design/LanguageContext";
import { GuideCard } from "../components/design/GuideCard";
import { useFetch } from "../hooks/useFetch";
import { getPublicGuides } from "../services/api";
import { sortBySeverity } from "../lib/severity";
import { fill } from "../i18n";
import type { GuideSeverity } from "../lib/severity";

type SeverityFilter = "all" | GuideSeverity;

const SEVERITY_OPTIONS: Array<{ value: SeverityFilter; labelKey: "filterAll" | "severityInfo" | "severityWarning" | "severityEmergency" }> = [
  { value: "all", labelKey: "filterAll" },
  { value: "info", labelKey: "severityInfo" },
  { value: "warning", labelKey: "severityWarning" },
  { value: "emergency", labelKey: "severityEmergency" },
];

export function GuidesPage() {
  const t = useT();
  const guides = useFetch(() => getPublicGuides());
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const g of guides.data?.guides ?? []) set.add(g.category);
    return [...set].sort();
  }, [guides.data]);

  const visible = useMemo(() => {
    const list = sortBySeverity(guides.data?.guides ?? []);
    return list.filter(
      (g) =>
        (severity === "all" || g.severity === severity) &&
        (category === "all" || g.category === category)
    );
  }, [guides.data, severity, category]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      <p className="text-label uppercase tracking-[0.14em] text-clay">{t("appTagline")}</p>
      <h1 className="mt-2 text-headline text-apple-ink">{t("guidesTitle")}</h1>
      <p className="mt-2 max-w-xl text-lead text-apple-muted48">{t("guidesSub")}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by urgency">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSeverity(opt.value)}
              aria-pressed={severity === opt.value}
              className={`inline-flex h-11 items-center rounded-pill px-4 text-[15px] font-semibold transition-colors active:scale-[0.97] ${
                severity === opt.value
                  ? "bg-apple-ink text-white"
                  : "border border-surface-border bg-white text-apple-ink hover:bg-surface-card"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-apple-muted48">
          <span className="text-[14px] font-medium">{t("topicLabel")}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-pill border border-surface-border bg-white px-4 text-[15px] font-medium text-apple-ink focus:shadow-focus"
          >
            <option value="all">{t("filterAll")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {guides.loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-surface-card" />
          ))}
        </div>
      ) : guides.error ? (
        <p className="mt-6 text-apple-muted48">{t("errorBody")}</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-apple-muted48">{t("noGuides")}</p>
      ) : (
        <>
          <p className="mt-5 text-[14px] font-medium text-apple-muted48">
            {fill(t("guidesCount"), { n: String(visible.length) })}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => (
              <GuideCard key={g.guide_id} guide={g} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}