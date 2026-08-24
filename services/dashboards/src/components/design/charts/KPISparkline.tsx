interface KPISparklineProps {
  data: number[];
  color?: string;
  trendDirection?: "up" | "down" | "flat";
  height?: number;
  width?: number;
}

/**
 * Pure SVG sparkline — no Recharts dependency.
 * 120x40px mini line chart for KPI cards.
 */
export function KPISparkline({
  data,
  color,
  trendDirection,
  height = 40,
  width = 120,
}: KPISparklineProps) {
  if (data.length < 2) return null;

  const strokeColor =
    color ??
    (trendDirection === "down"
      ? "#2d7d46"
      : trendDirection === "up"
        ? "#c62828"
        : "#999");

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 4;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 8) + 4;
      const y = padY + ((range - (v - min)) / range) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="kpi-sparkline" style={{ width, height }} aria-hidden="true">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
