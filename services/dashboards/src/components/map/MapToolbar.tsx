import { useEffect, useRef, useState } from "react";
import type { MapLayer } from "../../types";
import { Icon } from "../design/Icon";

interface MapToolbarProps {
  activeLayers: Set<MapLayer>;
  onToggleLayer: (layer: MapLayer) => void;
  onPrint?: () => void;
  onExportSMS?: () => void;
  role?: string;
}

interface LayerDef {
  id: MapLayer;
  label: string;
  description: string;
  icon: string;
  color: string;
  roles?: string[];
  defaultOn?: boolean;
  live?: boolean;
}

/**
 * Every entry renders real content on the map — dead toggles are removed
 * (kill-or-fix rule). Rainfall/flood return with the climate pipeline.
 */
const LAYERS: LayerDef[] = [
  {
    id: "districts",
    label: "District Risk",
    description: "AI-predicted malaria outbreak risk",
    icon: "ChartBar",
    color: "#ff3b30",
    defaultOn: true,
  },
  {
    id: "facilities",
    label: "Health Facilities",
    description: "Hospitals, health centres, clinics",
    icon: "Hospital",
    color: "#1e40af",
    defaultOn: true,
    live: true,
  },
  {
    id: "chw_presence",
    label: "CHW Presence",
    description: "Community health worker sync locations",
    icon: "Users",
    color: "#0066cc",
    roles: ["dho", "mohp", "supervisor"],
  },
  {
    id: "community_pins",
    label: "Community Reports",
    description: "Citizen-reported issues and good news",
    icon: "Megaphone",
    color: "#2d7d46",
  },
  {
    id: "outbreak",
    label: "Outbreak Prediction",
    description: "4-week forecast heat surface",
    icon: "TrendUp",
    color: "#ff3b30",
    roles: ["dho", "mohp", "phim"],
  },
  {
    id: "immunization",
    label: "Immunization",
    description: "Micro-planning villages & outreach routes",
    icon: "Syringe",
    color: "#2d7d46",
    roles: ["dho", "mohp"],
  },
  {
    id: "cold_chain",
    label: "Cold Chain",
    description: "Vaccine fridge status monitoring",
    icon: "Package",
    color: "#0066cc",
    roles: ["dho", "mohp"],
  },
  {
    id: "maternity",
    label: "Maternity Homes",
    description: "Waiting home capacity & status",
    icon: "Baby",
    color: "#7c3aed",
    roles: ["dho", "chw"],
  },
  {
    id: "tba",
    label: "TBAs",
    description: "Registered traditional birth attendants",
    icon: "Person",
    color: "#7c3aed",
    roles: ["dho", "chw"],
  },
  {
    id: "supply_chain",
    label: "Supply Trucks",
    description: "Live delivery tracking & cold chain",
    icon: "Truck",
    color: "#2d7d46",
    roles: ["dho", "mohp", "phim"],
  },
  {
    id: "nutrition",
    label: "Nutrition",
    description: "Stunting & wasting surveillance hotspots",
    icon: "Drop",
    color: "#ff9500",
    roles: ["dho", "mohp"],
  },
];

export function MapToolbar({ activeLayers, onToggleLayer, onPrint, onExportSMS, role }: MapToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const visibleLayers = LAYERS.filter((l) => !l.roles || !role || l.roles.includes(role));

  // Close on outside click / Escape
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setExpanded(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [expanded]);

  function resetToDefaults() {
    const defaults = visibleLayers.filter((l) => l.defaultOn).map((l) => l.id);
    for (const id of activeLayers) {
      if (!defaults.includes(id)) onToggleLayer(id);
    }
    for (const id of defaults) {
      if (!activeLayers.has(id)) onToggleLayer(id);
    }
  }

  return (
    <div className="map-toolbar" ref={rootRef}>
      <button className="map-toolbar-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-haspopup="true">
        <Icon name="Stack" size={16} />
        <span>Layers</span>
        <span className={`map-toolbar-count ${activeLayers.size > 0 ? "map-toolbar-count--active" : ""}`}>
          {activeLayers.size}
        </span>
      </button>

      {expanded && (
        <div className="map-toolbar-panel map-toolbar-panel--rich animate-fade-in">
          <h4 className="map-toolbar-heading">Map Layers</h4>

          <div className="map-toolbar-layers">
            {visibleLayers.map((layer) => {
              const active = activeLayers.has(layer.id);
              return (
                <label key={layer.id} className={`map-layer-row ${active ? "map-layer-row--active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleLayer(layer.id)}
                    className="map-layer-checkbox"
                    aria-label={layer.label}
                  />
                  <span className="map-layer-icon" style={{ backgroundColor: `${layer.color}1f` }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Icon name={layer.icon as any} size={16} color={layer.color} />
                  </span>
                  <span className="map-layer-text">
                    <span className="map-layer-label">{layer.label}</span>
                    <span className="map-layer-description">{layer.description}</span>
                  </span>
                  {layer.live && (
                    <span className="relative flex h-2 w-2" title="Live data">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="map-toolbar-actions">
            <button className="map-action-btn" onClick={resetToDefaults}>
              <Icon name="ArrowsClockwise" size={14} /> Reset to defaults
            </button>
            {onPrint && (
              <button className="map-action-btn" onClick={onPrint}>
                <Icon name="FileText" size={14} /> Print map
              </button>
            )}
            {onExportSMS && (
              <button className="map-action-btn" onClick={onExportSMS}>
                <Icon name="Share" size={14} /> SMS Summary
              </button>
            )}
          </div>

          <div className="map-toolbar-footer">
            {activeLayers.size} of {visibleLayers.length} active
          </div>
        </div>
      )}
    </div>
  );
}
