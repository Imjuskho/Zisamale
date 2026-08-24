import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import {
  fetchAlerts,
  fetchSurveillanceTrends,
  fetchCHWPerformance,
  fetchCHWHouseholds,
  submitAlertAction,
  realtimeAlertReceived,
  setWsStatus,
  selectDistrict,
} from "../store/dashboardSlice";
import { AlertCommandCenter } from "../components/AlertCommandCenter";
import { TrendChart } from "../components/charts/TrendChart";
import { LeafletMap, type DistrictRiskInput } from "../components/LeafletMap";
import { CHWPerformanceTable } from "../components/CHWPerformanceTable";
import { connectAlertSocket } from "../services/api";
import { KPICard } from "../components/design/KPICard";
import { SyncIndicator } from "../components/design/SyncIndicator";
import { SkeletonDashboard } from "../components/design/Skeleton";

const LEVEL_TO_RISK = { low: 0.22, medium: 0.47, high: 0.86 } as const;

export function DHODashboard() {
  const dispatch = useAppDispatch();
  const {
    alerts,
    districts,
    trends,
    loading,
    chwPerformance,
    chwHouseholds,
    wsStatus,
  } = useAppSelector((s) => s.dashboard);
  const user = useAppSelector((s) => s.auth.user);
  const districtId = user?.district || "nsanje-001";

  useEffect(() => {
    dispatch(fetchAlerts(districtId));
    dispatch(fetchSurveillanceTrends(districtId));
    dispatch(fetchCHWPerformance(districtId));
  }, [dispatch, districtId]);

  useEffect(() => {
    const socket = connectAlertSocket({
      onAlert: (alert) => dispatch(realtimeAlertReceived(alert)),
      onStatus: (status) => dispatch(setWsStatus(status)),
    });
    return () => socket.close();
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

  const criticalAlerts = alerts.filter((a) => a.alert_level === "red").length;
  const totalPredicted = alerts.reduce((s, a) => s + a.predicted_cases, 0);
  const chwsOnline = chwPerformance.filter(
    (c) => (Date.now() - new Date(c.last_sync_at).getTime()) / 3_600_000 < 24
  ).length;

  return (
    <div className="dashboard dho-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>District Health Office Dashboard</h1>
          <p>
            {user?.district || "District"} Health Office
            <span className="ws-status-inline">
              <SyncIndicator status={wsStatus === "connected" ? "synced" : wsStatus === "error" ? "error" : "offline"} />
            </span>
          </p>
        </div>
      </header>
      {loading && <SkeletonDashboard />}
      <div className="kpi-row">
        <KPICard label="Critical Alerts" value={criticalAlerts} icon="Bell" iconColor="#c62828" trend={criticalAlerts > 3 ? { direction: "up", value: `${criticalAlerts} active`, isPositive: false } : undefined} />
        <KPICard label="Predicted Cases" value={totalPredicted} icon="ChartBar" iconColor="#0f7b8a" />
        <KPICard label="CHWs Online" value={`${chwsOnline}/${chwPerformance.length}`} icon="Users" iconColor="#2d7d46" />
        <KPICard label="Districts" value={districts.length} icon="MapPin" iconColor="#0f7b8a" />
      </div>
      <section>
        <AlertCommandCenter
          alerts={alerts}
          onAction={(alert, action) => {
            void dispatch(submitAlertAction({ alertId: alert.alert_id, action }));
          }}
        />
      </section>
      <section>
        <LeafletMap
          districts={mapDistricts}
          onSelectDistrict={(props) => dispatch(selectDistrict(props.district_id))}
        />
      </section>
      {trends && (
        <section>
          <TrendChart actual={trends.actual} predicted={trends.predicted} />
          {trends.accuracy && (
            <div className="model-metrics">
              <h3>Model Performance</h3>
              <span>AUC-ROC: {trends.accuracy.auc_roc}</span>
              <span>Sensitivity: {trends.accuracy.sensitivity}</span>
              <span>Specificity: {trends.accuracy.specificity}</span>
            </div>
          )}
        </section>
      )}
      <section>
        <CHWPerformanceTable
          rows={chwPerformance}
          householdsByChw={chwHouseholds}
          onLoadHouseholds={(chwId) => dispatch(fetchCHWHouseholds(chwId))}
        />
      </section>
    </div>
  );
}
