import { Icon, type IconName } from "./Icon";

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: IconName;
  iconColor?: string;
  trend?: { direction: "up" | "down" | "flat"; value: string; isPositive: boolean };
  className?: string;
}

export function KPICard({
  label,
  value,
  unit,
  icon,
  iconColor,
  trend,
  className = "",
}: KPICardProps) {
  return (
    <div className={`card rounded-xl ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-label font-medium text-neutral uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span
            className="kpi-icon-container"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: iconColor ? `${iconColor}14` : "#f0f0f0",
              flexShrink: 0,
            }}
          >
            <Icon name={icon} size={20} color={iconColor ?? "#666"} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-data font-bold text-zisamale-dark">{value}</span>
        {unit && <span className="text-caption text-neutral">{unit}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <Icon
            name={trend.direction === "down" ? "TrendDown" : trend.direction === "up" ? "TrendUp" : "Minus"}
            size={14}
            color={trend.isPositive ? "#2d7d46" : "#c62828"}
          />
          <span
            className={`text-caption font-medium ${
              trend.isPositive ? "text-risk-low" : "text-risk-critical"
            }`}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
