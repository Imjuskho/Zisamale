import {
  RISK_BG_CLASSES,
  RISK_BORDER_CLASSES,
  toneFromScore0to10,
} from "../../design/riskScale";
import { useT } from "./LanguageContext";
import type { StringKey } from "../../i18n";

const TONE_LABEL_KEY: Record<string, StringKey> = {
  low: "riskLow",
  medium: "riskMedium",
  high: "riskHigh",
  critical: "riskCritical",
};

function riskColor(score: number): string {
  return RISK_BG_CLASSES[toneFromScore0to10(score)];
}

function useRiskLabel(): (score: number) => string {
  const t = useT();
  return (score: number) => t(TONE_LABEL_KEY[toneFromScore0to10(score)]);
}

interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskBadge({ score, size = "md", showLabel = false }: RiskBadgeProps) {
  const riskLabel = useRiskLabel();
  const sizeClasses = {
    sm: "w-10 h-10 text-base",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-[2px] flex items-center justify-center font-bold ${riskColor(score)} ${sizeClasses[size]}`}
        style={{ border: "3px solid var(--color-surface-card)" }}
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
  const tone = toneFromScore0to10(score);
  const borderColor = RISK_BORDER_CLASSES[tone];
  const riskLabel = useRiskLabel();

  return (
    <div className={`card border-2 ${borderColor} rounded-xl`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-caption font-medium text-neutral uppercase tracking-wider">
          RISK SCORE
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <RiskBadge score={score} size="lg" />
        <div>
          <div className="text-title font-semibold text-apple-ink">
            {riskLabel(score)}
          </div>
          <div className="h-1.5 bg-neutral-light rounded-[2px] mt-2 w-40">
            <div
              className={`h-1.5 rounded-[2px] transition-[width,background-color] duration-500 ease-out ${RISK_BG_CLASSES[tone].split(" ")[0]}`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="mb-4">
          <div className="text-caption font-medium text-neutral mb-2">
            Main reasons:
          </div>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-body text-apple-ink flex items-start gap-2">
                <span className="text-neutral mt-1">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        {onRefer && (
          <button type="button" onClick={onRefer} className="btn-danger flex-1">
            REFER IMMEDIATELY
          </button>
        )}
        {onOverride && (
          <button type="button" onClick={onOverride} className="btn-ghost">
            Override
          </button>
        )}
      </div>
    </div>
  );
}
