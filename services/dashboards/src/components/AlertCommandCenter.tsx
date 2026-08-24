import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Alert, AlertActionType } from "../types";

export type AlertAction = AlertActionType;

const RISK_STYLES: Record<
  Alert["alert_level"],
  { bg: string; border: string; label: string }
> = {
  red: { bg: "#fee2e2", border: "#dc2626", label: "CRITICAL" },
  yellow: { bg: "#fef9c3", border: "#d97706", label: "ELEVATED" },
  green: { bg: "#dcfce7", border: "#16a34a", label: "LOW" },
};

const ACTIONS: { action: AlertActionType; label: string }[] = [
  { action: "acknowledge", label: "Acknowledge" },
  { action: "deploy_drrt", label: "Deploy DRRT" },
  { action: "request_supplies", label: "Request Supplies" },
  { action: "dismiss", label: "Dismiss" },
];

const LEVEL_ORDER: Record<Alert["alert_level"], number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

const STATUS_LABELS: Record<Alert["response_status"], string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
};

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-testable)                                        */
/* ------------------------------------------------------------------ */

export function formatTimeRemaining(
  validUntil: string | null,
  now: Date = new Date()
): string {
  if (!validUntil) return "No expiry";
  const ms = new Date(validUntil).getTime() - now.getTime();
  if (Number.isNaN(ms)) return "No expiry";
  if (ms <= 0) return "Expired";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h remaining`;
}

/**
 * Deterministic bell-curve projection around the alert's predicted peak.
 * The "Now" point uses the upper confidence bound as the imminent worst case.
 * TODO: replace with the per-alert weekly curve from
 * `GET /api/v1/alerts/{id}/curve` once the backend exposes it.
 */
export function outbreakCurve(alert: Alert): { week: string; cases: number }[] {
  const peak = alert.predicted_cases;
  const upper = alert.confidence_interval?.[1] ?? peak;
  const labels = ["W-3", "W-2", "W-1", "Now", "W+1", "W+2", "W+3", "W+4"];
  return labels.map((week, i) => {
    const x = i - 3;
    const shape = Math.exp(-(x * x) / 2.6);
    const base = i === 3 ? Math.max(upper, peak) : peak;
    return { week, cases: Math.round(base * shape) };
  });
}

function DiseaseIcon({ disease }: { disease: string }) {
  const initials = disease
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  let hash = 0;
  for (const ch of disease) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      className="disease-icon"
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "50%",
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        background: `hsl(${hash} 65% 40%)`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface AlertCommandCenterProps {
  alerts: Alert[];
  onAction?: (alert: Alert, action: AlertActionType) => void | Promise<void>;
  /** Injectable clock for deterministic time-remaining rendering. */
  now?: Date;
}

export function AlertCommandCenter({ alerts, onAction, now }: AlertCommandCenterProps) {
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, Alert["response_status"]>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const diseases = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.disease))).sort(),
    [alerts]
  );

  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((a) => !dismissedIds.has(a.alert_id))
      .filter((a) => diseaseFilter === "all" || a.disease === diseaseFilter)
      .filter((a) => levelFilter === "all" || a.alert_level === levelFilter)
      .filter((a) => statusFilter === "all" || effectiveStatus(a) === statusFilter)
      .sort(
        (a, b) =>
          LEVEL_ORDER[a.alert_level] - LEVEL_ORDER[b.alert_level] ||
          b.predicted_cases - a.predicted_cases
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, dismissedIds, diseaseFilter, levelFilter, statusFilter, statusOverrides]);

  function effectiveStatus(alert: Alert): Alert["response_status"] {
    return statusOverrides[alert.alert_id] ?? alert.response_status;
  }

  async function handleAction(alert: Alert, action: AlertActionType) {
    if (action === "dismiss") {
      setDismissedIds((prev) => new Set(prev).add(alert.alert_id));
    } else {
      const nextStatus: Alert["response_status"] =
        action === "acknowledge" ? "acknowledged" : "in_progress";
      setStatusOverrides((prev) => ({ ...prev, [alert.alert_id]: nextStatus }));
    }
    await onAction?.(alert, action);
  }

  const timelineAlert =
    visibleAlerts.find((a) => a.alert_id === selectedId) ?? visibleAlerts[0] ?? null;

  return (
    <div className="alert-command-center">
      <h2>Alert Command Center</h2>

      <div className="alert-filters" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <label htmlFor="alert-filter-disease">Disease</label>
          <br />
          <select
            id="alert-filter-disease"
            value={diseaseFilter}
            onChange={(e) => setDiseaseFilter(e.target.value)}
          >
            <option value="all">All diseases</option>
            {diseases.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="alert-filter-level">Risk Level</label>
          <br />
          <select
            id="alert-filter-level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">All levels</option>
            <option value="red">Critical</option>
            <option value="yellow">Elevated</option>
            <option value="green">Low</option>
          </select>
        </div>
        <div>
          <label htmlFor="alert-filter-status">Status</label>
          <br />
          <select
            id="alert-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {visibleAlerts.length === 0 ? (
        <p className="alert-empty">No alerts match the current filters.</p>
      ) : (
        <div className="alert-cards" style={{ display: "grid", gap: 12 }}>
          {visibleAlerts.map((alert) => {
            const risk = RISK_STYLES[alert.alert_level];
            const status = effectiveStatus(alert);
            return (
              <article
                key={alert.alert_id}
                className={`alert-command-card alert-${alert.alert_level}`}
                aria-label={`${alert.disease} alert for ${alert.ta_name}`}
                style={{
                  border: `1px solid ${risk.border}`,
                  borderLeftWidth: 5,
                  borderRadius: 8,
                  padding: 12,
                  background: risk.bg,
                }}
              >
                <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <DiseaseIcon disease={alert.disease} />
                  <div style={{ flex: 1 }}>
                    <strong>{alert.ta_name}</strong> &mdash; {alert.disease}
                    <br />
                    <span
                      className="risk-badge"
                      style={{
                        backgroundColor: risk.border,
                        color: "#fff",
                        borderRadius: 4,
                        padding: "1px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {risk.label}
                    </span>{" "}
                    <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>
                  </div>
                  <span className="time-remaining" data-testid="time-remaining">
                    {formatTimeRemaining(alert.valid_until, now)}
                  </span>
                </header>
                <div className="alert-stats" style={{ display: "flex", gap: 18, margin: "10px 0" }}>
                  <span>
                    Risk score: <strong>{alert.risk_score.toFixed(1)}</strong>
                  </span>
                  <span>
                    Predicted cases: <strong>{alert.predicted_cases}</strong>
                  </span>
                  <span>
                    95% CI: [{alert.confidence_interval?.[0] ?? "N/A"}, {alert.confidence_interval?.[1] ?? "N/A"}]
                  </span>
                </div>
                <footer style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ACTIONS.map(({ action, label }) => {
                    const disabled =
                      status === "resolved" ||
                      (action === "acknowledge" && status !== "pending");
                    return (
                      <button
                        key={action}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleAction(alert, action)}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setSelectedId(alert.alert_id)}>
                    View Timeline
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {timelineAlert && (
        <section className="outbreak-timeline" style={{ marginTop: 16 }}>
          <h3>
            Outbreak Timeline &mdash; {timelineAlert.ta_name} ({timelineAlert.disease})
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={outbreakCurve(timelineAlert)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cases"
                name="Predicted cases"
                stroke="#dc2626"
                fill="#fecaca"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
