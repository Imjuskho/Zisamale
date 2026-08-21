import { useMemo } from "react";
import type { Alert, DistrictSummary, CommodityForecast } from "../types";

interface Props {
  alerts: Alert[];
  districts: DistrictSummary[];
  forecast: CommodityForecast[] | null;
}

function countByLevel(alerts: Alert[]) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const a of alerts) counts[a.alert_level]++;
  return counts;
}

function topDistricts(districts: DistrictSummary[], n: number) {
  return [...districts]
    .sort((a, b) => b.active_alerts - a.active_alerts)
    .slice(0, n);
}

function stockoutRiskItems(forecast: CommodityForecast[]) {
  return forecast
    .filter((f) => f.stockout_risk > 0.5)
    .sort((a, b) => b.stockout_risk - a.stockout_risk)
    .slice(0, 5);
}

export function NLGSummary({ alerts, districts, forecast }: Props) {
  const summary = useMemo(() => {
    const lines: string[] = [];
    const levels = countByLevel(alerts);

    if (alerts.length === 0) {
      lines.push("There are currently no active disease alerts across monitored districts.");
    } else {
      const parts: string[] = [];
      if (levels.red > 0) parts.push(`${levels.red} critical (red)`);
      if (levels.yellow > 0) parts.push(`${levels.yellow} moderate (yellow)`);
      if (levels.green > 0) parts.push(`${levels.green} low (green)`);
      lines.push(
        `There ${alerts.length === 1 ? "is" : "are"} ${alerts.length} active alert${alerts.length === 1 ? "" : "s"}: ${parts.join(", ")}.`
      );
    }

    if (districts.length > 0) {
      const highRisk = districts.filter((d) => d.malaria_risk_level === "high");
      const totalStockouts = districts.reduce((s, d) => s + d.stockout_count, 0);
      if (highRisk.length > 0) {
        const names = highRisk.map((d) => d.district_name).join(", ");
        lines.push(
          `${highRisk.length} district${highRisk.length === 1 ? " is" : "s are"} at high malaria risk: ${names}.`
        );
      }
      if (totalStockouts > 0) {
        const worst = topDistricts(districts, 3);
        lines.push(
          `${totalStockouts} commodity stockout${totalStockouts === 1 ? "" : "s"} reported. Priority districts: ${worst.map((d) => d.district_name).join(", ")}.`
        );
      }
      const avgCoverage =
        districts.reduce((s, d) => s + d.essential_service_coverage, 0) / districts.length;
      lines.push(
        `Essential service coverage averages ${(avgCoverage * 100).toFixed(0)}% nationally.`
      );
    }

    if (forecast && forecast.length > 0) {
      const risks = stockoutRiskItems(forecast);
      if (risks.length > 0) {
        lines.push(
          `Forecast: ${risks.length} commodit${risks.length === 1 ? "y has" : "ies have"} high stockout risk (>50%). Top concerns: ${risks.map((r) => `${r.commodity} in ${r.district}`).join("; ")}.`
        );
      } else {
        lines.push("Forecast indicates manageable commodity supply levels for the upcoming period.");
      }
    }

    return lines;
  }, [alerts, districts, forecast]);

  return (
    <div className="nlg-summary" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <h2>Executive Summary</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {summary.map((line, i) => (
          <li key={i} style={{ marginBottom: 8, lineHeight: 1.6 }}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
