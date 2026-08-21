import type { Alert } from "../../types";

interface Props {
  alerts: Alert[];
}

const LEVEL_COLORS: Record<string, string> = {
  red: "#dc2626",
  yellow: "#d97706",
  green: "#16a34a",
};

export function AlertInbox({ alerts }: Props) {
  if (alerts.length === 0) {
    return <div className="alert-inbox empty">No active alerts</div>;
  }

  return (
    <div className="alert-inbox">
      <h2>Alert Inbox</h2>
      <div className="alert-list">
        {alerts.map((alert) => (
          <div key={alert.alert_id} className={`alert-card alert-${alert.alert_level}`}>
            <div className="alert-header">
              <span
                className="alert-badge"
                style={{ backgroundColor: LEVEL_COLORS[alert.alert_level] }}
              >
                {alert.alert_level.toUpperCase()}
              </span>
              <span className="alert-disease">{alert.disease}</span>
              <span className="alert-ta">{alert.ta_name}</span>
            </div>
            <div className="alert-body">
              <div className="alert-stat">
                <label>Risk Score</label>
                <span>{alert.risk_score.toFixed(1)}</span>
              </div>
              <div className="alert-stat">
                <label>Predicted Cases</label>
                <span>{alert.predicted_cases}</span>
              </div>
              <div className="alert-stat">
                <label>95% CI</label>
                <span>
                  [{alert.confidence_interval[0]}, {alert.confidence_interval[1]}]
                </span>
              </div>
            </div>
            <div className="alert-actions">
              <span className={`status status-${alert.response_status}`}>
                {alert.response_status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
