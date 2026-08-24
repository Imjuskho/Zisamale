/**
 * MAP LEGEND — floating collapsible accordion describing every layer's
 * visual language. Colors come from the shared risk scale so legend,
 * polygons, and badges can never drift apart.
 */
import { useState } from "react";

import { RISK_HEX, RISK_NODATA_HEX } from "../../design/riskScale";

const LEGEND_SECTIONS = [
  {
    id: "risk",
    label: "District Risk",
    items: [
      { label: "Low (<30%)", color: RISK_HEX.low },
      { label: "Moderate (30\u201360%)", color: RISK_HEX.medium },
      { label: "High (60\u201380%)", color: RISK_HEX.high },
      { label: "Critical (>80%)", color: RISK_HEX.critical },
      { label: "No data", color: RISK_NODATA_HEX },
    ],
  },
  {
    id: "facility_type",
    label: "Facility Type",
    items: [
      { label: "District Hospital", color: "#1e40af", shape: "pin" as const },
      { label: "Community Hospital", color: "#0f7b8a", shape: "pin" as const },
      { label: "Health Centre", color: "#2d7d46", shape: "pin" as const },
      { label: "Private", color: "#7c3aed", shape: "pin" as const },
    ],
  },
  {
    id: "facility_status",
    label: "Facility Status",
    items: [
      { label: "Operational", color: "#22c55e", shape: "ring" as const },
      { label: "Partial", color: "#f59e0b", shape: "ring" as const },
      { label: "Closed", color: "#ef4444", shape: "ring" as const },
    ],
  },
  {
    id: "chw",
    label: "CHW Presence",
    items: [
      { label: "Active", color: "#0f7b8a" },
      { label: "Stale (>48h)", color: "#e65100" },
      { label: "Emergency", color: "#c62828" },
    ],
  },
  {
    id: "other",
    label: "Other Layers",
    items: [
      { label: "Supply Truck", color: "#2d7d46", shape: "hex" as const },
      { label: "Nutrition Hotspot", color: "#e65100" },
      { label: "Maternity Home", color: "#7c3aed", shape: "pin" as const },
      { label: "Community Report", color: "#2d7d46" },
    ],
  },
];

function LegendSwatch({ item }: { item: { color: string; shape?: "pin" | "ring" | "hex" } }) {
  if (item.shape === "pin") {
    return (
      <svg width="12" height="14" viewBox="0 0 12 14">
        <path d="M6 0C2.69 0 0 2.69 0 6c0 4.5 6 8 6 8s6-3.5 6-8c0-3.31-2.69-6-6-6z" fill={item.color} />
        <circle cx="6" cy="6" r="2.5" fill="#fff" />
      </svg>
    );
  }
  if (item.shape === "ring") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill={item.color} stroke="#fff" strokeWidth="1.5" />
      </svg>
    );
  }
  if (item.shape === "hex") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12">
        <rect x="1" y="1" width="10" height="10" rx="2" fill={item.color} />
      </svg>
    );
  }
  return <span className="map-legend-swatch" style={{ backgroundColor: item.color }} />;
}

export function MapLegend() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem("moyo-legend-open") !== "false";
    } catch {
      return true;
    }
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["risk", "facility_type"])
  );

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem("moyo-legend-open", String(next)); } catch {}
  }

  return (
    <div className={`map-legend ${open ? "map-legend--open" : "map-legend--closed"}`} role="region" aria-label="Risk color legend">
      <button className="map-legend-header" onClick={toggleOpen} aria-expanded={open}>
        <span className="map-legend-header-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Legend
        </span>
        <svg className={`map-legend-chevron ${open ? "map-legend-chevron--up" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="map-legend-body">
          {LEGEND_SECTIONS.map((section) => {
            const expanded = expandedSections.has(section.id);
            return (
              <div key={section.id} className="map-legend-section">
                <button
                  className={`map-legend-section-toggle ${expanded ? "map-legend-section-toggle--open" : ""}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={expanded}
                >
                  <span>{section.label}</span>
                  <svg className="map-legend-section-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {expanded && (
                  <div className="map-legend-section-items">
                    {section.items.map((item) => (
                      <span key={item.label} className="map-legend-item">
                        <LegendSwatch item={item as any} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
