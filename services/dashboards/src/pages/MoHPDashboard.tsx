import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchNationalOverview } from "../store/dashboardSlice";
import { LeafletMap, type DistrictRiskInput } from "../components/LeafletMap";
import { NLGExecutiveSummary } from "../components/NLGExecutiveSummary";
import { DistrictScorecard } from "../components/design/DistrictScorecard";
import { KPICard } from "../components/design/KPICard";

const LEVEL_TO_RISK = { low: 0.22, medium: 0.47, high: 0.86 } as const;

export function MoHPDashboard() {
  const dispatch = useAppDispatch();
  const { districts, alerts, forecast } = useAppSelector((s) => s.dashboard);
  const darkMode = useAppSelector((s) => s.theme.darkMode);

  useEffect(() => {
    dispatch(fetchNationalOverview());
  }, [dispatch]);

  const mapDistricts = useMemo<DistrictRiskInput[]>(
    () =>
      districts.map((d) => ({
        district_id: d.district_id,
        name: d.district_name,
        risk_score: LEVEL_TO_RISK[d.malaria_risk_level],
      })),
    [districts]
  );

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.alert_level === "red").length;
  const avgCoverage = districts.length
    ? districts.reduce((s, d) => s + d.essential_service_coverage, 0) / districts.length
    : 0;

  return (
    <div className={`dashboard mohp-dashboard ${darkMode ? "dark" : ""}`}>
      <header className="dashboard-header">
        <h1>Ministry of Health Dashboard</h1>
        <p>National Surveillance &amp; Policy Tracking</p>
      </header>
      <div className="kpi-row">
        <KPICard label="Districts Monitored" value={districts.length} icon="MapPin" iconColor="#0f7b8a" />
        <KPICard label="Active Alerts" value={totalAlerts} icon="Bell" iconColor="#c62828" trend={criticalAlerts > 0 ? { direction: "up", value: `${criticalAlerts} critical`, isPositive: false } : undefined} />
        <KPICard label="Avg Coverage" value={`${Math.round(avgCoverage * 100)}%`} icon="ChartBar" iconColor="#2d7d46" />
        <KPICard label="Stockout Districts" value={districts.filter((d) => d.stockout_count > 0).length} icon="Package" iconColor="#e65100" />
      </div>
      <section>
        <DistrictScorecard districts={districts} />
      </section>
      <section>
        <LeafletMap districts={mapDistricts} height={520} />
      </section>
      <section className="executive-summary">
        <NLGExecutiveSummary
          alerts={alerts}
          districts={districts}
          forecast={forecast?.commodity_needs ?? null}
        />
      </section>
    </div>
  );
}
