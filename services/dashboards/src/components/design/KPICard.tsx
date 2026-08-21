interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { direction: "up" | "down" | "flat"; value: string; isPositive: boolean };
  icon?: string;
  className?: string;
}

export function KPICard({ label, value, unit, trend, icon, className = "" }: KPICardProps) {
  return (
    <div className={`card rounded-xl ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-label font-medium text-neutral uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-data font-bold text-zisamale-dark">{value}</span>
        {unit && <span className="text-caption text-neutral">{unit}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={`text-caption font-medium ${
              trend.isPositive ? "text-risk-low" : "text-risk-critical"
            }`}
          >
            {trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→"}{" "}
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
