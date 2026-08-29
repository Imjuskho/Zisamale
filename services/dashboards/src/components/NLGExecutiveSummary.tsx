import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Alert, CommodityForecast, DistrictSummary } from "../types";
import { Icon } from "./design/Icon";
import { LanguageToggle } from "./design/LanguageToggle";
import { useLanguage, useT } from "./design/LanguageContext";
import { useToast } from "./design/Toast";

export type BriefingLanguage = "en" | "ny";

/**
 * Template-based NLG weekly briefing.
 *
 * NOTE ON CHICHEWA: the `ny` templates below are functional drafts for the
 * demo. Have them reviewed by a certified Chichewa translator (and ideally
 * localized per district) before production rollout.
 */

export function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

interface BriefingData {
  alerts: Alert[];
  districts: DistrictSummary[];
  forecast: CommodityForecast[] | null;
}

interface Section {
  id: string;
  heading: { en: string; ny: string };
  body: { en: string; ny: string };
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function buildSections(data: BriefingData): Section[] {
  const { alerts, districts, forecast } = data;
  const sections: Section[] = [];

  const outbreakDistricts = districts
    .filter((d) => d.malaria_risk_level === "high")
    .map((d) => d.district_name);
  const n = outbreakDistricts.length;
  const names = listNames(outbreakDistricts.slice(0, 5));

  sections.push({
    id: "outbreak",
    heading: { en: "Outbreak Outlook", ny: "Chiwerengero cha Chiwombo" },
    body: {
      en:
        n > 0
          ? `${n} district${n === 1 ? "" : "s"} predicted outbreaks${names ? ` — ${names}` : ""} this week.`
          : "No districts are predicted to experience outbreaks this week.",
      ny:
        n > 0
          ? `Maboma ${n} akuwerengedwa kuti adzakhala ndi chiwombo cha malungo${names ? ` — ${names}` : ""} sabata ino.`
          : "Palibe boma lofotokozedwa kuti lidzakhala ndi chiwombo sabata ino.",
    },
  });

  const counts = { red: 0, yellow: 0, green: 0 };
  for (const a of alerts) counts[a.alert_level] += 1;
  const criticalTAs = alerts
    .filter((a) => a.alert_level === "red")
    .slice(0, 5)
    .map((a) => `${a.ta_name} (${a.disease})`);

  sections.push({
    id: "alerts",
    heading: { en: "Active Alerts", ny: "Zochenjera Zogwira Ntchito" },
    body: {
      en:
        alerts.length === 0
          ? "There are no active disease alerts requiring immediate action."
          : `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}: ${counts.red} critical, ${counts.yellow} elevated, ${counts.green} low.` +
            (criticalTAs.length > 0
              ? ` Priority response areas: ${listNames(criticalTAs)}.`
              : ""),
      ny:
        alerts.length === 0
          ? "Palibe zochenjera za matenda zofunika kuchita kanthu msanga."
          : `Zochenjera zogwira ntchito: ${alerts.length} — zowopsa ${counts.red}, zapakati ${counts.yellow}, zochepa ${counts.green}.` +
            (criticalTAs.length > 0
              ? ` Malo oyenera kupatsa mphamvu: ${listNames(criticalTAs)}.`
              : ""),
    },
  });

  const stockoutRisks = (forecast ?? [])
    .filter((f) => f.stockout_risk > 0.5)
    .sort((a, b) => b.stockout_risk - a.stockout_risk)
    .slice(0, 3);
  const riskList = stockoutRisks
    .map((r) => `${r.commodity} in ${r.district} (${Math.round(r.stockout_risk * 100)}%)`)
    .join("; ");

  sections.push({
    id: "supply",
    heading: { en: "Commodity Supply", ny: "Zinthu Zofunikira" },
    body: {
      en: stockoutRisks.length
        ? `High stockout risk (>50%): ${riskList}. Emergency resupply recommended.`
        : "Commodity supply is within manageable thresholds for the coming period.",
      ny: stockoutRisks.length
        ? `Zinthu zowopsa kuti zithe (kuposa 50%): ${riskList}. Kukweza zinthu ndikofunika pang'onopang'ono.`
        : "Zinthu zakwanira zilipo nthawi ino ikubwera.",
    },
  });

  const covered = districts
    .map((d) => ({ d, c: d.essential_service_coverage }))
    .filter((x): x is { d: typeof districts[number]; c: number } => x.c != null);
  if (covered.length > 0) {
    const avgCoverage = covered.reduce((sum, x) => sum + x.c, 0) / covered.length;
    const worst = [...covered].sort((a, b) => a.c - b.c)[0];
    sections.push({
      id: "services",
      heading: { en: "Essential Services", ny: "Utumiki Waukulu" },
      body: {
        en: `Coverage averages ${Math.round(avgCoverage * 100)}% nationally; lowest in ${worst.d.district_name} (${Math.round(worst.c * 100)}%).`,
        ny: `Utumiki waukulu wafika ${Math.round(avgCoverage * 100)}% pa dziko lonse; wotsika kwambiri ku ${worst.d.district_name} (${Math.round(worst.c * 100)}%).`,
      },
    });
  }

  return sections;
}

function briefingToText(
  sections: Section[],
  language: BriefingLanguage,
  date: Date
): string {
  const { week, year } = isoWeek(date);
  const title =
    language === "en"
      ? `ZISAMALE WEEKLY BRIEFING — Week ${week}, ${year}`
      : `CHIKWATIBWE CHA SABATA ZISAMALE — Sabata ${week}, Chaka ${year}`;
  const lines = [title, "=".repeat(title.length), ""];
  for (const section of sections) {
    lines.push(section.heading[language].toUpperCase());
    lines.push(section.body[language]);
    lines.push("");
  }
  lines.push(`Generated by Zisamale NLG — ${date.toISOString().slice(0, 10)}`);
  return lines.join("\n");
}

/* ── Visual configuration per section ─────────────────────────────── */

const SECTION_STYLE: Record<
  string,
  { icon: Parameters<typeof Icon>[0]["name"]; iconClass: string }
> = {
  outbreak: { icon: "Virus", iconClass: "exec-icon--red" },
  alerts: { icon: "Bell", iconClass: "exec-icon--amber" },
  supply: { icon: "Package", iconClass: "exec-icon--orange" },
  services: { icon: "Heartbeat", iconClass: "exec-icon--teal" },
};

interface Badge {
  text: string;
  tone: "red" | "green" | "amber" | "blue";
}

function buildBadge(sectionId: string, data: BriefingData): Badge | null {
  switch (sectionId) {
    case "outbreak": {
      const n = data.districts.filter((d) => d.malaria_risk_level === "high").length;
      return n > 0
        ? { text: `${n} district${n === 1 ? "" : "s"} at risk`, tone: "red" }
        : { text: "No outbreak predicted", tone: "green" };
    }
    case "alerts": {
      const red = data.alerts.filter((a) => a.alert_level === "red").length;
      if (data.alerts.length === 0) return { text: "0 alerts", tone: "green" };
      return { text: `${data.alerts.length} active${red > 0 ? ` • ${red} critical` : ""}`, tone: red > 0 ? "red" : "amber" };
    }
    case "supply": {
      const atRisk = (data.forecast ?? []).filter((f) => f.stockout_risk > 0.5).length;
      return atRisk > 0
        ? { text: `${atRisk} at risk`, tone: "amber" }
        : { text: "Within thresholds", tone: "green" };
    }
    case "services": {
      const covered = data.districts
        .map((d) => d.essential_service_coverage)
        .filter((c): c is number => c != null);
      if (covered.length === 0) return null;
      const avg = covered.reduce((s, c) => s + c, 0) / covered.length;
      return { text: `${Math.round(avg * 100)}% national`, tone: "blue" };
    }
    default:
      return null;
  }
}

const BADGE_TONE_CLASS: Record<Badge["tone"], string> = {
  red: "exec-badge--red",
  green: "exec-badge--green",
  amber: "exec-badge--amber",
  blue: "exec-badge--blue",
};

interface NLGExecutiveSummaryProps {
  alerts: Alert[];
  districts: DistrictSummary[];
  forecast: CommodityForecast[] | null;
  date?: Date;
}

export function NLGExecutiveSummary({
  alerts,
  districts,
  forecast,
  date = new Date(),
}: NLGExecutiveSummaryProps) {
  const { language } = useLanguage();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const data = useMemo(() => ({ alerts, districts, forecast }), [alerts, districts, forecast]);
  const sections = useMemo(() => buildSections(data), [data]);
  const text = useMemo(() => briefingToText(sections, language, date), [sections, language, date]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const criticalAlerts = alerts.filter((a) => a.alert_level === "red");
  const topStockouts = (forecast ?? [])
    .filter((f) => f.stockout_risk > 0.5)
    .sort((a, b) => b.stockout_risk - a.stockout_risk);

  function toggleSection(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const { week, year } = isoWeek(date);
    anchor.href = url;
    anchor.download = `zisamale-briefing-w${week}-${year}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShareWithFinance() {
    try {
      await navigator.clipboard.writeText(text);
      toast.show("Briefing copied to clipboard — ready to paste for Finance.", {
        type: "success",
      });
    } catch {
      toast.show("Copy failed — download the briefing instead.", { type: "error" });
      handleExport();
    }
  }

  return (
    <div className="nlg-executive-summary exec-card">
      <header className="exec-header">
        <div>
          <h2>{t("weeklyExecSummary")}</h2>
          <p className="exec-header-meta">
            {language === "ny"
              ? `Sabata ${isoWeek(date).week}, Chaka ${isoWeek(date).year}`
              : `Week ${isoWeek(date).week}, ${isoWeek(date).year}`}
            {" • "}
            {t("generatedByAi")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="compact" />
          <button type="button" className="btn-primary exec-export-btn" onClick={handleExport}>
            <Icon name="Download" size={14} />
            <span className="hidden sm:inline">{t("exportText")}</span>
          </button>
        </div>
      </header>

      <div className="exec-body">
        {/* Critical banner — surfaces immediately for scanning eyes */}
        {criticalAlerts.length > 0 && (
          <div className="exec-critical-banner" role="alert">
            <Icon name="Warning" size={20} weight="fill" className="shrink-0" />
            <div>
              <p className="exec-critical-title">
                {criticalAlerts.length} critical alert{criticalAlerts.length === 1 ? "" : "s"} require action
              </p>
              <p className="exec-critical-detail">
                {listNames(criticalAlerts.slice(0, 3).map((a) => `${a.ta_name} (${a.disease})`))}
                {" — "}
                {criticalAlerts.reduce((s, a) => s + a.predicted_cases, 0).toLocaleString()} predicted cases.
              </p>
            </div>
          </div>
        )}

        {/* Section cards */}
        <div className="exec-grid">
          {sections.map((section) => {
            const style = SECTION_STYLE[section.id];
            const badge = buildBadge(section.id, data);
            const isCollapsed = collapsed.has(section.id);
            return (
              <section
                key={section.id}
                className={`exec-section ${isCollapsed ? "exec-section--collapsed" : ""}`}
              >
                <button
                  type="button"
                  className="exec-section-header"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className={`exec-icon ${style?.iconClass ?? ""}`}>
                    {style && <Icon name={style.icon} size={16} />}
                  </span>
                  <span className="exec-section-title">
                    <h3>{section.heading[language]}</h3>
                    {badge && <span className={`exec-badge ${BADGE_TONE_CLASS[badge.tone]}`}>{badge.text}</span>}
                  </span>
                  <Icon name={isCollapsed ? "CaretDown" : "CaretUp"} size={14} />
                </button>
                {!isCollapsed && <p className="exec-section-body">{section.body[language]}</p>}
              </section>
            );
          })}
        </div>

        {/* AI recommendation */}
        {(topStockouts.length > 0 || criticalAlerts.length > 0) && (
          <div className="exec-ai-recommendation">
            <span className="exec-ai-icon">
              <Icon name="Sparkle" size={16} />
            </span>
            <div>
              <p className="exec-ai-title">
                {t("aiRecommendation")}
              </p>
              <p className="exec-ai-text">
                {topStockouts.length > 0
                  ? language === "ny"
                    ? `Sankhanitsani zinthu ku ${topStockouts[0].district} chifukwa cha chiopsezo cha stockout ( ${Math.round(topStockouts[0].stockout_risk * 100)}% ). Yesani ndondomeko ya CHUMA.`
                    : `Reallocate emergency stock to ${topStockouts[0].district}: ${topStockouts[0].commodity} carries a ${Math.round(topStockouts[0].stockout_risk * 100)}% stockout risk. Model the intervention before committing budget.`
                  : language === "ny"
                    ? "Yankha mapepala ochenjera otsatirawa musanathe sabata ino."
                    : "Acknowledge the critical alerts above before end of week; DRRT readiness is recommended."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn-primary exec-action-btn"
                  onClick={() => navigate("/chuma")}
                >
                  {t("modelInChuma")}
                </button>
                <button type="button" className="btn-secondary exec-action-btn" onClick={handleShareWithFinance}>
                  {t("shareWithFinance")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
