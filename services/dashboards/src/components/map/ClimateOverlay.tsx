import { useState } from "react";
import type { ClimateOverlayType } from "../../types";
import { Icon } from "../design/Icon";
import { RISK_HEX } from "../../design/riskScale";

interface ClimateOverlayProps {
  activeOverlays: Set<ClimateOverlayType>;
  onToggle: (overlay: ClimateOverlayType) => void;
}

const OVERLAYS: { type: ClimateOverlayType; label: string; icon: string; color: string; description: string }[] = [
  { type: "rainfall", label: "Rainfall (7-day)", icon: "Drop", color: "var(--color-primary)", description: "Rainfall forecast — cholera risk" },
  { type: "flood", label: "Flood Extent", icon: "Warning", color: RISK_HEX.critical, description: "Active flood zones from DHM" },
  { type: "temperature", label: "Temperature", icon: "Sun", color: RISK_HEX.high, description: "Heat stress — pregnancy risk" },
  { type: "vegetation", label: "Vegetation Index", icon: "CheckCircle", color: RISK_HEX.low, description: "Food security predictor" },
];

export function ClimateOverlayPanel({ activeOverlays, onToggle }: ClimateOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="climate-overlay-panel">
      <button type="button" className="climate-overlay-toggle" aria-expanded={expanded} aria-controls="climate-overlay-options" onClick={() => setExpanded(!expanded)}>
        <Icon name="Cloud" size={16} />
        <span>Climate Layers ({activeOverlays.size})</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div id="climate-overlay-options" className="climate-overlay-options">
          {OVERLAYS.map((ov) => {
            const active = activeOverlays.has(ov.type);
            return (
              <button
                key={ov.type}
                type="button"
                className={`climate-option ${active ? "climate-option--active" : ""}`}
                onClick={() => onToggle(ov.type)}
                aria-pressed={active}
                title={ov.description}
              >
                <span className="climate-option-check">
                  {active && <Icon name="CheckCircle" size={14} color={ov.color} />}
                </span>
                <Icon name={ov.icon as any} size={16} color={active ? ov.color : "var(--color-text-muted)"} />
                <span className="climate-option-label">{ov.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
