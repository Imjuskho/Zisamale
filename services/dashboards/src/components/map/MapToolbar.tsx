import { useState } from "react";
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
  icon: string;
  color: string;
  roles?: string[];
}

const LAYERS: LayerDef[] = [
  { id: "districts", label: "District Risk", icon: "ChartBar", color: "#ef4444" },
  { id: "facilities", label: "Facility Status", icon: "Hospital", color: "#1e40af" },
  { id: "chw_presence", label: "CHW Presence", icon: "Users", color: "#0f7b8a", roles: ["dho", "mohp", "supervisor"] },
  { id: "community_pins", label: "Community Reports", icon: "Megaphone", color: "#2d7d46" },
  { id: "outbreak预测", label: "Outbreak Prediction", icon: "TrendUp", color: "#c62828", roles: ["dho", "mohp", "phim"] },
  { id: "rainfall", label: "Rainfall", icon: "Drop", color: "#0f7b8a" },
  { id: "flood", label: "Flood Zones", icon: "Warning", color: "#c62828" },
  { id: "immunization", label: "Immunization", icon: "Syringe", color: "#2d7d46", roles: ["dho", "mohp"] },
  { id: "maternity", label: "Maternity/TBA", icon: "Baby", color: "#7c3aed", roles: ["dho", "chw"] },
];

export function MapToolbar({ activeLayers, onToggleLayer, onPrint, onExportSMS, role }: MapToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleLayers = LAYERS.filter((l) => !l.roles || !role || l.roles.includes(role));

  return (
    <div className="map-toolbar">
      <button className="map-toolbar-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Funnel" size={16} />
        <span>Layers ({activeLayers.size})</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="map-toolbar-panel">
          {visibleLayers.map((layer) => {
            const active = activeLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                className={`map-layer-btn ${active ? "map-layer-btn--active" : ""}`}
                onClick={() => onToggleLayer(layer.id)}
                aria-pressed={active}
              >
                <span className="map-layer-check">
                  {active && <Icon name="CheckFat" size={14} color={layer.color} />}
                </span>
                <Icon name={layer.icon as any} size={16} color={active ? layer.color : "#999"} />
                <span>{layer.label}</span>
              </button>
            );
          })}

          <div className="map-toolbar-actions">
            {onPrint && (
              <button className="map-action-btn" onClick={onPrint}>
                <Icon name="FileText" size={14} /> Print Map
              </button>
            )}
            {onExportSMS && (
              <button className="map-action-btn" onClick={onExportSMS}>
                <Icon name="Share" size={14} /> SMS Summary
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
