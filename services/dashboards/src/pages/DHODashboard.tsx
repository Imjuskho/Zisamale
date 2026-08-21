import { useEffect, useState } from "react";
import { useAppSelector } from "../hooks/useRedux";
import { AlertCard } from "../components/design/AlertCard";
import { KPICard } from "../components/design/KPICard";
import { EmptyState } from "../components/design/EmptyState";
import { SyncIndicator } from "../components/design/SyncIndicator";
import type { Alert, AlertActionType } from "../types";

export function DHODashboard() {
  const { user } = useAppSelector((s) => s.auth);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const districtId = user?.district ?? "00000000-0000-0000-0000-000000000002";

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("zisamale-token") ?? "";
        const res = await fetch(`/api/v1/district/${districtId}/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts ?? []);
        }
      } catch {
        // silently handle — will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [districtId]);

  function handleAction(alertId: string, action: AlertActionType) {
    setAlerts((prev) =>
      prev.map((a) =>
        a.alert_id === alertId
          ? { ...a, response_status: action === "dismiss" ? "resolved" : "acknowledged" }
          : a
      )
    );
  }

  const unackCount = alerts.filter((a) => a.response_status === "pending").length;
  const criticalCount = alerts.filter((a) => a.alert_level === "red").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline font-bold text-zisamale-dark">Alert Command Center</h1>
          <p className="text-body text-neutral mt-1">
            {alerts.length} alerts • {unackCount} unacknowledged
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncIndicator status="synced" />
          <div className="text-right">
            <p className="text-body font-medium">{user?.name}</p>
            <p className="text-caption text-neutral">District: Nsanje</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="ACTIVE ALERTS" value={alerts.length} icon="🔔" />
        <KPICard label="CRITICAL" value={criticalCount} icon="🔴" trend={criticalCount > 0 ? { direction: "up", value: "needs action", isPositive: false } : undefined} />
        <KPICard label="CHWs ACTIVE" value="12" icon="👥" />
        <KPICard label="STOCKOUTS" value="2" icon="📦" trend={{ direction: "up", value: "2 this week", isPositive: false }} />
      </div>

      {/* Alert List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title font-semibold text-zisamale-dark">
            Alerts ({alerts.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse h-40" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No active alerts"
            subtitle="All clear in your district right now."
          />
        ) : (
          <div className="space-y-4">
            {alerts
              .sort((a, b) => b.risk_score - a.risk_score)
              .map((alert) => (
                <AlertCard
                  key={alert.alert_id}
                  alert={alert}
                  onAction={handleAction}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
