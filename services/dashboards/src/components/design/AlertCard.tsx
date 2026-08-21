import type { Alert, AlertActionType } from "../../types";
import { RiskBadge } from "./RiskBadge";

interface AlertCardProps {
  alert: Alert;
  onAction?: (alertId: string, action: AlertActionType) => void;
}

function alertBorderColor(level: string) {
  if (level === "red") return "border-risk-critical";
  if (level === "yellow") return "border-risk-medium";
  return "border-risk-low";
}

function diseaseEmoji(disease: string) {
  const d = disease.toLowerCase();
  if (d.includes("malaria")) return "🦟";
  if (d.includes("cholera")) return "💧";
  if (d.includes("measles")) return "🔴";
  if (d.includes("maternal") || d.includes("pregnan")) return "🤰";
  if (d.includes("child") || d.includes("under")) return "👶";
  return "📊";
}

function alertStatusStyle(status: string) {
  if (status === "resolved") return "bg-risk-low-light text-risk-low";
  if (status === "in_progress") return "bg-info-light text-info";
  if (status === "acknowledged") return "bg-zisamale-teal-light text-zisamale-teal";
  return "bg-risk-critical-light text-risk-critical animate-pulse-slow";
}

export function AlertCard({ alert, onAction }: AlertCardProps) {
  const isUnack = alert.response_status === "pending";

  return (
    <div
      className={`card rounded-xl border-l-4 ${alertBorderColor(alert.alert_level)} ${
        isUnack ? "ring-1 ring-risk-critical/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{diseaseEmoji(alert.disease)}</span>
          <div>
            <h3 className="text-title font-semibold text-zisamale-dark uppercase">
              {alert.disease}
            </h3>
            <p className="text-caption text-neutral">
              {alert.ta_name} | Predicted: {alert.predicted_cases} cases
            </p>
          </div>
        </div>
        <RiskBadge score={alert.risk_score} size="md" />
      </div>

      <div className="flex items-center gap-4 text-caption text-neutral mb-4">
        <span>Confidence: {Math.round((alert.confidence_interval?.[1] ?? 0.5) * 100)}%</span>
        <span>|</span>
        <span>Generated: {new Date(alert.generated_at).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`text-caption font-medium px-3 py-1 rounded-full ${alertStatusStyle(alert.response_status)}`}>
          {alert.response_status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {isUnack && onAction && (
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => onAction(alert.alert_id, "acknowledge")} className="btn-primary text-sm py-2.5">
            ACKNOWLEDGE
          </button>
          <button onClick={() => onAction(alert.alert_id, "deploy_drrt")} className="btn-secondary text-sm py-2.5">
            DEPLOY DRRT
          </button>
          <button onClick={() => onAction(alert.alert_id, "request_supplies")} className="btn-ghost text-sm">
            REQUEST SUPPLIES
          </button>
        </div>
      )}

      {!isUnack && (
        <p className="text-caption text-neutral italic">
          Acknowledged — {alert.response_status.replace("_", " ")}
        </p>
      )}
    </div>
  );
}
