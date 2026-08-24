import type { Household } from "../../types";
import { RiskBadge } from "./RiskBadge";

interface PatientCardProps {
  household: Household;
  riskScore: number;
  onSelect?: (household: Household) => void;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / 86_400_000);
}

export function PatientCard({ household, riskScore, onSelect }: PatientCardProps) {
  const days = daysSince(household.last_visit_at);
  const isOverdue = days !== null && days > 14;
  const neverVisited = days === null;

  return (
    <div
      className={`card patient-card ${household.high_risk ? "patient-card-high-risk" : ""}`}
      onClick={() => onSelect?.(household)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(household);
              }
            }
          : undefined
      }
    >
      <div className="patient-card-header">
        <div>
          <h4 className="patient-card-name">{household.head_of_household}</h4>
          <p className="patient-card-meta">
            {household.members} members &middot; {household.under_five} under 5
          </p>
        </div>
        <RiskBadge score={riskScore} size="sm" />
      </div>

      <div className="patient-card-footer">
        <span
          className={`patient-visit-status ${
            neverVisited ? "status-critical" : isOverdue ? "status-warning" : "status-ok"
          }`}
        >
          {neverVisited
            ? "Never visited"
            : isOverdue
              ? `${days} days overdue`
              : `Visited ${days === 0 ? "today" : `${days}d ago`}`}
        </span>
        {household.high_risk && <span className="high-risk-tag">High Risk</span>}
      </div>
    </div>
  );
}
