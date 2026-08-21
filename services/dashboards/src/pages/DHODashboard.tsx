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

  return (
    <div className="dashboard dho-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>District Health Office Dashboard</h1>
          <p>
            {user?.district || "District"} Health Office
            <span
              className={`ws-status ws-${wsStatus}`}
              style={{ marginLeft: 12, fontSize: 12 }}
              role="status"
            >
              Live updates: {wsStatus}
            </span>
          </p>
        </div>
      </header>
      {loading && <div className="loading">Loading...</div>}
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
