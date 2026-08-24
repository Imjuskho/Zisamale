import type { DistrictSummary } from "../../types";
import { RiskBadge } from "./RiskBadge";
import { Icon } from "./Icon";

interface DistrictScorecardProps {
  districts: DistrictSummary[];
  onSelect?: (districtId: string) => void;
}

const RISK_SCORE: Record<string, number> = {
  high: 8,
  medium: 5,
  low: 2,
};

function StockIcon({ count }: { count: number }) {
  if (count === 0) return <Icon name="CheckCircle" size={14} color="#2d7d46" />;
  if (count <= 2) return <Icon name="Warning" size={14} color="#e65100" />;
  return <Icon name="XCircle" size={14} color="#c62828" />;
}

export function DistrictScorecard({ districts, onSelect }: DistrictScorecardProps) {
  return (
    <div className="district-scorecard">
      <h2>District Health Scorecard</h2>
      <div className="scorecard-grid">
        {districts.map((d) => (
          <article
            key={d.district_id}
            className="scorecard-card card"
            onClick={() => onSelect?.(d.district_id)}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(d.district_id);
                    }
                  }
                : undefined
            }
          >
            <div className="scorecard-header">
              <h3 className="scorecard-name">{d.district_name}</h3>
              <RiskBadge score={RISK_SCORE[d.malaria_risk_level] ?? 5} size="sm" />
            </div>

            <div className="scorecard-metrics">
              <div className="scorecard-metric">
                <span className="scorecard-metric-label">MMR</span>
                <span className="scorecard-metric-value">{d.maternal_mortality_ratio}</span>
              </div>
              <div className="scorecard-metric">
                <span className="scorecard-metric-label">U5MR</span>
                <span className="scorecard-metric-value">{d.under5_mortality_rate}</span>
              </div>
              <div className="scorecard-metric">
                <span className="scorecard-metric-label">Coverage</span>
                <span className="scorecard-metric-value">
                  {Math.round(d.essential_service_coverage * 100)}%
                </span>
              </div>
            </div>

            <div className="scorecard-footer">
              <span className="scorecard-alerts flex items-center gap-1">
                <Icon name="Bell" size={14} color={d.active_alerts > 0 ? "#c62828" : "#999"} />
                {d.active_alerts} alert{d.active_alerts === 1 ? "" : "s"}
              </span>
              <span className="scorecard-stock flex items-center gap-1">
                <StockIcon count={d.stockout_count} />
                {d.stockout_count} stockout{d.stockout_count === 1 ? "" : "s"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
