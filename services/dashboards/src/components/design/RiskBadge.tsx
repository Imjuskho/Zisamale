import { strings } from "../../i18n";

function riskColor(score: number): string {
  if (score >= 9) return "bg-risk-critical text-white";
  if (score >= 7) return "bg-risk-high text-white";
  if (score >= 4) return "bg-risk-medium text-risk-medium";
  return "bg-risk-low text-white";
}

function riskLabel(score: number): string {
  if (score >= 9) return strings.riskCritical.cy;
  if (score >= 7) return strings.riskHigh.cy;
  if (score >= 4) return strings.riskMedium.cy;
  return strings.riskLow.cy;
}

interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskBadge({ score, size = "md", showLabel = false }: RiskBadgeProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-base",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-full flex items-center justify-center font-bold ${riskColor(score)} ${sizeClasses[size]}`}
        style={{ border: "3px solid white" }}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-caption font-medium text-neutral">
          {riskLabel(score)}
        </span>
      )}
    </div>
  );
}

interface RiskCardProps {
  score: number;
  reasons: string[];
  onRefer?: () => void;
  onOverride?: () => void;
}

export function RiskCard({ score, reasons, onRefer, onOverride }: RiskCardProps) {
  const borderColor =
    score >= 9
      ? "border-risk-critical"
      : score >= 7
        ? "border-risk-high"
        : score >= 4
          ? "border-risk-medium"
          : "border-risk-low";

  return (
    <div className={`card border-2 ${borderColor} rounded-xl`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-caption font-medium text-neutral uppercase tracking-wider">
          {strings.riskLow.cy.split("")[0] === "B" ? "RISK SCORE" : "RISK SCORE"}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <RiskBadge score={score} size="lg" />
        <div>
          <div className="text-title font-semibold text-zisamale-dark">
            {riskLabel(score)}
          </div>
          <div className="h-2 bg-neutral-light rounded-full mt-2 w-40">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                score >= 9
                  ? "bg-risk-critical"
                  : score >= 7
                    ? "bg-risk-high"
                    : score >= 4
                      ? "bg-risk-medium"
                      : "bg-risk-low"
              }`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="mb-4">
          <div className="text-caption font-medium text-neutral mb-2">
            ⚠️ Main reasons:
          </div>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-body text-zisamale-dark flex items-start gap-2">
                <span className="text-neutral mt-1">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        {onRefer && (
          <button onClick={onRefer} className="btn-danger flex-1">
            REFER IMMEDIATELY
          </button>
        )}
        {onOverride && (
          <button onClick={onOverride} className="btn-ghost">
            Override
          </button>
        )}
      </div>
    </div>
  );
}
