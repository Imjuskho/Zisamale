import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { useT } from "../design/LanguageContext";
import { useLanguage } from "../design/LanguageContext";
import type { PublicGuide } from "../../types/public";
import { severityColor, SEVERITY_TONE } from "../../lib/severity";
import type { GuideSeverity } from "../../lib/severity";

export function guideTitle(g: PublicGuide, lang: "en" | "ny"): string {
  return lang === "ny" && g.title_chichewa ? g.title_chichewa : g.title;
}

export function guideLines(
  en: string[],
  ny: string[],
  lang: "en" | "ny"
): string[] {
  return lang === "ny" && ny.length > 0 ? ny : en;
}

/** Family-facing guide card. Severity tint leads; count, and an obvious
 * "open" affordance. No decoration beyond the signal. */
export function GuideCard({ guide }: { guide: PublicGuide }) {
  const t = useT();
  const { language } = useLanguage();
  const tone = SEVERITY_TONE[guide.severity as GuideSeverity];
  const color = severityColor(guide.severity as GuideSeverity);

  return (
    <Link
      to={`/zindule/${guide.guide_id}`}
      className="group flex flex-col gap-3 rounded-lg border border-surface-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover active:scale-[0.985]"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-label uppercase tracking-wide text-apple-muted48">
          {guide.category.replace(/_/g, " ")}
        </span>
        <span
          className="barometer-cell ml-auto inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: color }}
        >
          {t(tone === "low" ? "severityInfo" : tone === "high" ? "severityWarning" : "severityEmergency")}
        </span>
      </div>
      <h3 className="text-title text-apple-ink">
        {guideTitle(guide, language)}
      </h3>
      <span className="mt-auto inline-flex items-center gap-1 text-[15px] font-semibold text-apple-blue group-hover:underline">
        {t("readGuide")}
        <ArrowRight size={16} weight="bold" aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}