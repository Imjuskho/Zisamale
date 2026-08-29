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
import { LeafletMap } from "../components/LeafletMap";
import type { DistrictRiskInput } from "../types";
import { CHWPerformanceTable } from "../components/CHWPerformanceTable";
import { connectAlertSocket } from "../services/api";
import { KPICard } from "../components/design/KPICard";
import { isOlderThan } from "../utils/recency";
import { toMapDistricts } from "../components/map/districtGeo";
import { SyncIndicator } from "../components/design/SyncIndicator";
import { SkeletonDashboard } from "../components/design/Skeleton";
import { useToast } from "../components/design/Toast";
import { useMapLayers } from "../hooks/useMapLayers";
import type { AlertActionType } from "../types";

const ACTION_TOASTS: Record<AlertActionType, string> = {
  acknowledge: "Alert acknowledged. Supervisor notified.",
  deploy_drrt: "DRRT deployment requested.",
  request_supplies: "Supply request submitted.",
  dismiss: "Alert dismissed.",
};

export function DHODashboard() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { layers, refetch: refetchLayers } = useMapLayers();
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
    () => toMapDistricts(districts),
    [districts]
  );

  const criticalAlerts = alerts.filter((a) => a.alert_level === "red").length;
  const totalPredicted = alerts.reduce((s, a) => s + a.predicted_cases, 0);
  const chwsOnline = chwPerformance.filter(
    (c) => !isOlderThan(c.last_sync_at, 24)
  ).length;

  return (
    <div className="dashboard dho-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">District Operations</p>
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
        <KPICard label="Critical Alerts" value={criticalAlerts} icon="Bell" iconColor="#ff3b30" trend={criticalAlerts > 3 ? { direction: "up", value: `${criticalAlerts} active`, isPositive: false } : undefined} />
        <KPICard label="Predicted Cases" value={totalPredicted} icon="ChartBar" iconColor="#40916C" />
        <KPICard label="CHWs Online" value={`${chwsOnline}/${chwPerformance.length}`} icon="Users" iconColor="#2D6A4F" />
        <KPICard label="Districts" value={districts.length} icon="MapPin" iconColor="#40916C" />
      </div>
      <section>
        <AlertCommandCenter
          alerts={alerts}
          onAction={(alert, action) => {
            dispatch(submitAlertAction({ alertId: alert.alert_id, action }))
              .unwrap()
              .then(() => toast.show(ACTION_TOASTS[action], { type: "success" }))
              .catch(() =>
                toast.show("Action failed — check your connection and try again.", {
                  type: "error",
                })
              );
          }}
        />
      </section>
      <section>
        <LeafletMap
          districts={mapDistricts}
          role="dho"
          layers={layers}
          onRefresh={refetchLayers}
          onRefreshWeather={refetchLayers}
          onSelectDistrict={(props) => {
            dispatch(selectDistrict(props?.district_id ?? null));
          }}
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
