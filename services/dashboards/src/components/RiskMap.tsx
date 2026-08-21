import { useState, useMemo } from "react";
import type { RiskMapDistrict } from "../types";

interface Props {
  districts: RiskMapDistrict[];
  onSelectDistrict?: (district: RiskMapDistrict) => void;
}

interface GridCell {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

const MALAWI_GRID: GridCell[] = [
  { x: 0, y: 0, w: 1, h: 1, label: "Chitipa" },
  { x: 1, y: 0, w: 1, h: 1, label: "Karonga" },
  { x: 0.5, y: 1, w: 1.5, h: 1, label: "Rumphi" },
  { x: 0, y: 2, w: 1.5, h: 1, label: "Mzimba" },
  { x: 1.5, y: 2, w: 1, h: 1, label: "Nkhata Bay" },
  { x: 2.5, y: 2, w: 1, h: 1, label: "Likoma" },
  { x: 0, y: 3, w: 1, h: 1, label: "Kasungu" },
  { x: 1, y: 3, w: 1, h: 1, label: "Nkhotakota" },
  { x: 2, y: 3, w: 1, h: 1, label: "Salima" },
  { x: 0, y: 4, w: 1, h: 1, label: "Ntchisi" },
  { x: 1, y: 4, w: 1, h: 1, label: "Dowa" },
  { x: 2, y: 4, w: 1, h: 1, label: "Mangochi" },
  { x: 0, y: 5, w: 1, h: 1, label: "Mchinji" },
  { x: 1, y: 5, w: 1, h: 1, label: "Lilongwe" },
  { x: 2, y: 5, w: 1, h: 1, label: "Balaka" },
  { x: 0, y: 6, w: 1, h: 1, label: "Dedza" },
  { x: 1, y: 6, w: 1, h: 1, label: "Ntcheu" },
  { x: 2, y: 6, w: 1, h: 1, label: "Machinga" },
  { x: 0, y: 7, w: 1, h: 1, label: "Zomba" },
  { x: 1, y: 7, w: 1, h: 1, label: "Phalombe" },
  { x: 2, y: 7, w: 1, h: 1, label: "Chiradzulu" },
  { x: 0, y: 8, w: 1, h: 1, label: "Blantyre" },
  { x: 1, y: 8, w: 1, h: 1, label: "Thyolo" },
  { x: 2, y: 8, w: 1, h: 1, label: "Mulanje" },
  { x: 0, y: 9, w: 1, h: 1, label: "Mwanza" },
  { x: 1, y: 9, w: 1, h: 1, label: "Chikwawa" },
  { x: 2, y: 9, w: 1, h: 1, label: "Nsanje" },
  { x: 0, y: 10, w: 1, h: 1, label: "Neno" },
];

const CELL_SIZE = 52;
const GAP = 4;
const PADDING = 20;

function riskToColor(score: number): string {
  if (score <= 3) return "#22c55e";
  if (score <= 5) return "#eab308";
  if (score <= 7) return "#f97316";
  return "#ef4444";
}

function riskLabel(score: number): string {
  if (score <= 3) return "Low";
  if (score <= 5) return "Medium";
  if (score <= 7) return "High";
  return "Critical";
}

export function RiskMap({ districts, onSelectDistrict }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, RiskMapDistrict>();
    for (const d of districts) map.set(d.district_name, d);
    return map;
  }, [districts]);

  const svgW = 3 * (CELL_SIZE + GAP) + PADDING * 2;
  const svgH = 11 * (CELL_SIZE + GAP) + PADDING * 2;

  const hoveredDistrict = hovered ? lookup.get(hovered) : null;

  return (
    <div className="risk-map">
      <h2>District Risk Map</h2>
      <div style={{ position: "relative", display: "inline-block" }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label="Malawi district risk map"
        >
          <rect width={svgW} height={svgH} fill="#f8fafc" rx={8} />
          {MALAWI_GRID.map((cell) => {
            const d = lookup.get(cell.label);
            const score = d?.risk_score ?? 0;
            const color = d ? riskToColor(score) : "#e2e8f0";
            const isHovered = hovered === cell.label;
            const cx = PADDING + cell.x * (CELL_SIZE + GAP);
            const cy = PADDING + cell.y * (CELL_SIZE + GAP);
            return (
              <g
                key={cell.label}
                onMouseEnter={() => setHovered(cell.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => d && onSelectDistrict?.(d)}
                style={{ cursor: d ? "pointer" : "default" }}
              >
                <rect
                  x={cx}
                  y={cy}
                  width={CELL_SIZE * cell.w}
                  height={CELL_SIZE * cell.h}
                  rx={4}
                  fill={color}
                  stroke={isHovered ? "#1e293b" : "transparent"}
                  strokeWidth={isHovered ? 2 : 0}
                  opacity={d ? 1 : 0.3}
                />
                <text
                  x={cx + (CELL_SIZE * cell.w) / 2}
                  y={cy + (CELL_SIZE * cell.h) / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={isHovered ? 700 : 500}
                  fill={score > 5 ? "#fff" : "#1e293b"}
                  pointerEvents="none"
                >
                  {cell.label}
                </text>
                {d && d.alert_count > 0 && (
                  <circle
                    cx={cx + CELL_SIZE * cell.w - 8}
                    cy={cy + 8}
                    r={7}
                    fill="#dc2626"
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                )}
                {d && d.alert_count > 0 && (
                  <text
                    x={cx + CELL_SIZE * cell.w - 8}
                    y={cy + 8}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight={700}
                    fill="#fff"
                    pointerEvents="none"
                  >
                    {d.alert_count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredDistrict && (
          <div
            className="risk-map-tooltip"
            role="tooltip"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#1e293b",
              color: "#f8fafc",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              lineHeight: 1.5,
              pointerEvents: "none",
              minWidth: 150,
            }}
          >
            <strong>{hoveredDistrict.district_name}</strong>
            <br />
            Risk: {hoveredDistrict.risk_score.toFixed(1)} ({riskLabel(hoveredDistrict.risk_score)})
            <br />
            Alerts: {hoveredDistrict.alert_count}
          </div>
        )}
      </div>
      <div className="risk-map-legend" style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 13 }}>
        {[
          { label: "Low (0-3)", color: "#22c55e" },
          { label: "Medium (3-5)", color: "#eab308" },
          { label: "High (5-7)", color: "#f97316" },
          { label: "Critical (7-10)", color: "#ef4444" },
          { label: "No data", color: "#e2e8f0" },
        ].map((item) => (
          <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: item.color,
                border: "1px solid #94a3b8",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
