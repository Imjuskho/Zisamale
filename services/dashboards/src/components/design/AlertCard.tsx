import type { Alert, AlertActionType } from "../../types";
import { RiskBadge } from "./RiskBadge";
import { Icon, type IconName } from "./Icon";

interface AlertCardProps {
  alert: Alert;
  onAction?: (alertId: string, action: AlertActionType) => void;
}

function alertBorderColor(level: string) {
  if (level === "red") return "border-risk-critical";
  if (level === "yellow") return "border-risk-medium";
  return "border-risk-low";
}

function diseaseIcon(disease: string): IconName {
  const d = disease.toLowerCase();
  if (d.includes("malaria")) return "Warning"; // mosquito risk
  if (d.includes("cholera")) return "Drop";
  if (d.includes("measles")) return "Baby";
  if (d.includes("maternal") || d.includes("pregnan")) return "FirstAid";
  if (d.includes("child") || d.includes("under")) return "Baby";
  return "ChartBar";
}

function diseaseIconColor(disease: string): string {
  const d = disease.toLowerCase();
  if (d.includes("malaria")) return "#c62828";
  if (d.includes("cholera")) return "#0f7b8a";
  if (d.includes("measles")) return "#e65100";
  return "#666";
}

function alertStatusStyle(status: string) {
  if (status === "resolved") return "bg-risk-low-light text-risk-low";
  if (status === "in_progress") return "bg-info-light text-info";
  if (status === "acknowledged") return "bg-zisamale-teal-light text-zisamale-teal";
  return "bg-risk-critical-light text-risk-critical";
}

export function AlertCard({ alert, onAction }: AlertCardProps) {
  const isUnack = alert.response_status === "pending";
  const iconName = diseaseIcon(alert.disease);
  const iconColor = diseaseIconColor(alert.disease);

  return (
    <div
      className={`card rounded-xl border-l-4 ${alertBorderColor(alert.alert_level)} ${
        isUnack ? "ring-1 ring-risk-critical/30" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${iconColor}14`,
              flexShrink: 0,
            }}
          >
            <Icon name={iconName} size={22} color={iconColor} />
          </span>
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
        <span className="flex items-center gap-1">
          <Icon name="ChartBar" size={14} />
          Confidence: {Math.round((alert.confidence_interval?.[1] ?? 0.5) * 100)}%
        </span>
        <span>|</span>
        <span className="flex items-center gap-1">
          <Icon name="CalendarBlank" size={14} />
          {new Date(alert.generated_at).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`text-caption font-medium px-3 py-1 rounded-full ${alertStatusStyle(alert.response_status)}`}>
          {alert.response_status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {isUnack && onAction && (
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => onAction(alert.alert_id, "acknowledge")} className="btn-primary text-sm py-2.5 flex items-center gap-2">
            <Icon name="CheckCircle" size={16} />
            ACKNOWLEDGE
          </button>
          <button onClick={() => onAction(alert.alert_id, "deploy_drrt")} className="btn-secondary text-sm py-2.5 flex items-center gap-2">
            <Icon name="Users" size={16} />
            DEPLOY DRRT
          </button>
          <button onClick={() => onAction(alert.alert_id, "request_supplies")} className="btn-ghost text-sm flex items-center gap-2">
            <Icon name="Package" size={16} />
            REQUEST SUPPLIES
          </button>
        </div>
      )}

      {!isUnack && (
        <p className="text-caption text-neutral italic flex items-center gap-1">
          <Icon name="CheckCircle" size={14} />
          Acknowledged — {alert.response_status.replace("_", " ")}
        </p>
      )}
    </div>
  );
}
