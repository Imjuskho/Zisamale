import { useState } from "react";
import type { ClimateOverlayType } from "../../types";
import { Icon } from "../design/Icon";

interface ClimateOverlayProps {
  activeOverlays: Set<ClimateOverlayType>;
  onToggle: (overlay: ClimateOverlayType) => void;
}

const OVERLAYS: { type: ClimateOverlayType; label: string; icon: string; color: string; description: string }[] = [
  { type: "rainfall", label: "Rainfall (7-day)", icon: "Drop", color: "#0f7b8a", description: "Rainfall forecast — cholera risk" },
  { type: "flood", label: "Flood Extent", icon: "Warning", color: "#c62828", description: "Active flood zones from DHM" },
  { type: "temperature", label: "Temperature", icon: "Sun", color: "#e65100", description: "Heat stress — pregnancy risk" },
  { type: "vegetation", label: "Vegetation Index", icon: "CheckCircle", color: "#2d7d46", description: "Food security predictor" },
];

export function ClimateOverlayPanel({ activeOverlays, onToggle }: ClimateOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="climate-overlay-panel">
      <button className="climate-overlay-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Cloud" size={16} />
        <span>Climate Layers ({activeOverlays.size})</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="climate-overlay-options">
          {OVERLAYS.map((ov) => {
            const active = activeOverlays.has(ov.type);
            return (
              <button
                key={ov.type}
                className={`climate-option ${active ? "climate-option--active" : ""}`}
                onClick={() => onToggle(ov.type)}
                aria-pressed={active}
                title={ov.description}
              >
                <span className="climate-option-check">
                  {active && <Icon name="CheckCircle" size={14} color={ov.color} />}
                </span>
                <Icon name={ov.icon as any} size={16} color={active ? ov.color : "#999"} />
                <span className="climate-option-label">{ov.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
