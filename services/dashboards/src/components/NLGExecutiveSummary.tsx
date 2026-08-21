import { useMemo, useState } from "react";
import type { Alert, CommodityForecast, DistrictSummary } from "../types";

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
  heading: { en: string; ny: string };
  body: { en: string; ny: string };
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function buildSections(data: BriefingData, date: Date): Section[] {
  const { alerts, districts, forecast } = data;
  const sections: Section[] = [];

  const outbreakDistricts = districts
    .filter((d) => d.malaria_risk_level === "high")
    .map((d) => d.district_name);
  const n = outbreakDistricts.length;
  const names = listNames(outbreakDistricts.slice(0, 5));

  sections.push({
    heading: { en: "Outbreak Outlook", ny: "Chiwerengero cha Chiwombo" },
    body: {
      en:
        n > 0
          ? `This week (Week ${isoWeek(date).week}, ${isoWeek(date).year}): ${n} district${n === 1 ? "" : "s"} predicted outbreaks${names ? ` — ${names}` : ""}.`
          : `This week (Week ${isoWeek(date).week}, ${isoWeek(date).year}): no districts are predicted to experience outbreaks.`,
      ny:
        n > 0
          ? `Sabata ino (Sabata ${isoWeek(date).week}, Chaka ${isoWeek(date).year}): maboma ${n} akuwerengedwa kuti adzakhala ndi chiwombo cha malungo${names ? ` — ${names}` : ""}.`
          : `Sabata ino (Sabata ${isoWeek(date).week}, Chaka ${isoWeek(date).year}): palibe boma lofotokozedwa kuti lidzakhala ndi chiwombo.`,
    },
  });

  const counts = { red: 0, yellow: 0, green: 0 };
  for (const a of alerts) counts[a.alert_level] += 1;
  const criticalTAs = alerts
    .filter((a) => a.alert_level === "red")
    .slice(0, 5)
    .map((a) => `${a.ta_name} (${a.disease})`);

  sections.push({
    heading: { en: "Active Alerts", ny: "Zochenjera Zogwira Ntchito" },
    body: {
      en:
        alerts.length === 0
          ? "There are no active disease alerts this week."
          : `${alerts.length} active alert${alerts.length === 1 ? "" : "s"}: ${counts.red} critical, ${counts.yellow} elevated, ${counts.green} low.` +
            (criticalTAs.length > 0
              ? ` Priority response areas: ${listNames(criticalTAs)}.`
              : ""),
      ny:
        alerts.length === 0
          ? "Palibe zochenjera za matenda sabata ino."
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

  if (districts.length > 0) {
    const avgCoverage =
      districts.reduce((sum, d) => sum + d.essential_service_coverage, 0) / districts.length;
    const worst = [...districts].sort(
      (a, b) => a.essential_service_coverage - b.essential_service_coverage
    )[0];
    sections.push({
      heading: { en: "Essential Services", ny: "Utumiki Waukulu" },
      body: {
        en: `Essential service coverage averages ${Math.round(avgCoverage * 100)}% nationally; lowest in ${worst.district_name} (${Math.round(worst.essential_service_coverage * 100)}%).`,
        ny: `Utumiki waukulu wafika ${Math.round(avgCoverage * 100)}% pa dziko lonse; wotsika kwambiri ku ${worst.district_name} (${Math.round(worst.essential_service_coverage * 100)}%).`,
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
  const [language, setLanguage] = useState<BriefingLanguage>("en");

  const sections = useMemo(
    () => buildSections({ alerts, districts, forecast }, date),
    [alerts, districts, forecast, date]
  );
  const text = useMemo(
    () => briefingToText(sections, language, date),
    [sections, language, date]
  );

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

  return (
    <div className="nlg-executive-summary">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2>Weekly Executive Summary</h2>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          aria-pressed={language === "en"}
          onClick={() => setLanguage("en")}
        >
          English
        </button>
        <button
          type="button"
          aria-pressed={language === "ny"}
          onClick={() => setLanguage("ny")}
        >
          Chichewa
        </button>
        <button type="button" onClick={handleExport}>
          Export as Text
        </button>
      </div>
      <article className="briefing-body" style={{ lineHeight: 1.6 }}>
        {sections.map((section) => (
          <section key={section.heading.en}>
            <h3>{section.heading[language]}</h3>
            <p>{section.body[language]}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
