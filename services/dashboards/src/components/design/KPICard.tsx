import { Icon, type IconName } from "./Icon";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import type { DataSourceMeta } from "../../types";

interface KPICardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: IconName;
  iconColor?: string;
  trend?: { direction: "up" | "down" | "flat"; value: string; isPositive: boolean };
  /** Small context line under the value ("All clear", "Awaiting data", …). */
  context?: string;
  /** Provenance + age chip; renders when the payload declares it. */
  freshness?: DataSourceMeta;
  className?: string;
}

export function KPICard({
  label,
  value,
  unit,
  icon,
  iconColor,
  trend,
  context,
  freshness,
  className = "",
}: KPICardProps) {
  const isMissing = value === null || value === undefined || value === "";
  const isZero = !isMissing && Number(value) === 0;
  return (
    <div className={`card rounded-2xl hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-neutral uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span
            className="kpi-icon-container size-9 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.04] dark:border-white/[0.06] shadow-sm"
            style={{
              backgroundColor: iconColor ? `${iconColor}14` : "var(--color-bg-muted)",
            }}
          >
            <Icon name={icon} size={18} color={iconColor ?? "var(--color-text-muted)"} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        {isMissing ? (
          <span className="text-data font-bold text-neutral-tertiary" aria-label="Awaiting data">
            —
          </span>
        ) : (
          <span
            className={`text-data font-bold tabular-nums tracking-tight ${
              isZero ? "text-risk-low" : "text-apple-ink"
            }`}
          >
            {value}
          </span>
        )}
        {unit && <span className="text-caption font-medium text-neutral">{unit}</span>}
      </div>

      {(context || trend || freshness) && (
        <div className="mt-2 space-y-1.5 pt-1 border-t border-black/[0.03] dark:border-white/[0.04]">
          {freshness && (
            <div className="mt-1">
              <DataFreshnessBadge meta={freshness} showSource />
            </div>
          )}
          {context && <p className="kpi-context text-caption text-neutral text-pretty">{context}</p>}
          {trend && (
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold kpi-trend-value ${
                trend.isPositive
                  ? "bg-risk-low/10 text-risk-low"
                  : "bg-risk-critical/10 text-risk-critical"
              }`}
            >
              <Icon
                name={trend.direction === "down" ? "TrendDown" : trend.direction === "up" ? "TrendUp" : "Minus"}
                size={13}
                color={trend.isPositive ? "#34c759" : "#ff3b30"}
              />
              <span className="tabular-nums font-semibold">
                {trend.value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
