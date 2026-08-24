import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchNationalOverview, fetchForecast } from "../store/dashboardSlice";
import { LeafletMap } from "../components/LeafletMap";
import type { DistrictRiskInput } from "../types";
import { NLGExecutiveSummary } from "../components/NLGExecutiveSummary";
import { DistrictScorecardCarousel } from "../components/design/DistrictScorecardCarousel";
import { KPICard } from "../components/design/KPICard";
import { useMapLayers } from "../hooks/useMapLayers";

const LEVEL_TO_RISK = { low: 0.22, medium: 0.47, high: 0.86 } as const;

/** Map district_name → geojson slug (same algorithm as LeafletMap). */
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function readHashDistrict(): string | null {
  const match = window.location.hash.match(/^#district=([\w-]+)$/);
  return match ? match[1] : null;
}

export function MoHPDashboard() {
  const dispatch = useAppDispatch();
  const { layers, refetch: refetchLayers } = useMapLayers();
  const { districts, alerts, forecast } = useAppSelector((s) => s.dashboard);
  const darkMode = useAppSelector((s) => s.theme.darkMode);

  const [selectedMapId, setSelectedMapId] = useState<string | null>(() => readHashDistrict());

  useEffect(() => {
    dispatch(fetchNationalOverview());
    dispatch(fetchForecast("baseline"));
  }, [dispatch]);

  // Escape clears selection; hash keeps selection shareable
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSelect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHash = useCallback((id: string | null) => {
    const url = id ? `#district=${id}` : window.location.pathname + window.location.search;
    window.history.replaceState(null, "", url);
  }, []);

  const handleSelect = useCallback(
    (mapId: string | null) => {
      setSelectedMapId(mapId);
      setHash(mapId);
    },
    [setHash]
  );

  const mapDistricts = useMemo<DistrictRiskInput[]>(
    () =>
      districts.map((d) => ({
        district_id: slugify(d.district_name),
        name: d.district_name,
        risk_score: LEVEL_TO_RISK[d.malaria_risk_level],
      })),
    [districts]
  );

  // Carousel works with summary ids; translate to/from map slugs
  const selectedSummaryId = useMemo(() => {
    if (!selectedMapId) return null;
    return districts.find((d) => slugify(d.district_name) === selectedMapId)?.district_id ?? null;
  }, [districts, selectedMapId]);

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.alert_level === "red").length;
  const avgCoverage = districts.length
    ? districts.reduce((s, d) => s + d.essential_service_coverage, 0) / districts.length
    : 0;

  return (
    <div className={`dashboard mohp-dashboard ${darkMode ? "dark" : ""}`}>
      <header className="dashboard-header">
        <p className="dashboard-kicker">National Programme</p>
        <h1>Ministry of Health Dashboard</h1>
        <p>National Surveillance &amp; Policy Tracking</p>
      </header>
      <div className="kpi-row">
        <KPICard label="Districts Monitored" value={districts.length} icon="MapPin" iconColor="#17646C" />
        <KPICard label="Active Alerts" value={totalAlerts} icon="Bell" iconColor="#C62828" trend={criticalAlerts > 0 ? { direction: "up", value: `${criticalAlerts} critical`, isPositive: false } : undefined} />
        <KPICard label="Avg Coverage" value={`${Math.round(avgCoverage * 100)}%`} icon="ChartBar" iconColor="#2D7D46" />
        <KPICard label="Stockout Districts" value={districts.filter((d) => d.stockout_count > 0).length} icon="Package" iconColor="#E65100" />
      </div>
      <section>
        <DistrictScorecardCarousel
          districts={districts}
          selectedDistrictId={selectedSummaryId}
          onSelectDistrict={(summaryId) => {
            if (!summaryId) {
              handleSelect(null);
              return;
            }
            const summary = districts.find((d) => d.district_id === summaryId);
            handleSelect(summary ? slugify(summary.district_name) : null);
          }}
        />
      </section>
      <section>
        <LeafletMap
          districts={mapDistricts}
          height={520}
          role="mohp"
          layers={layers}
          onRefresh={refetchLayers}
          onRefreshWeather={refetchLayers}
          selectedDistrictId={selectedMapId}
          onSelectedDistrictChange={handleSelect}
        />
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
