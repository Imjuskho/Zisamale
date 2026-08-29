import { useState } from "react";
import type { CommunityPin, CommunityPinType } from "../../types";
import { Icon } from "../design/Icon";
import { RISK_HEX } from "../../design/riskScale";

interface CommunityVoicePinsProps {
  pins: CommunityPin[];
  onVerify?: (pinId: string) => void;
  onDismiss?: (pinId: string) => void;
  onReport?: (type: CommunityPinType) => void;
}

const PIN_CONFIG: Record<CommunityPinType, { label: string; icon: string; color: string }> = {
  dry_water_point: { label: "Dry Water Point", icon: "Drop", color: "var(--color-primary)" },
  drug_stockout: { label: "Drug Stockout", icon: "Package", color: RISK_HEX.critical },
  road_blocked: { label: "Road Blocked", icon: "Warning", color: RISK_HEX.high },
  disease_report: { label: "Disease Report", icon: "WarningCircle", color: RISK_HEX.critical },
  good_news: { label: "Good News", icon: "CheckCircle", color: RISK_HEX.low },
};

const STATUS_STYLES: Record<string, { bg: string; border: string }> = {
  pending: { bg: "#fef9c3", border: "#d97706" },
  verified: { bg: "#dcfce7", border: "#16a34a" },
  dismissed: { bg: "#f3f4f6", border: "#9ca3af" },
};

export function CommunityVoicePins({ pins, onVerify, onDismiss, onReport }: CommunityVoicePinsProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<CommunityPinType | "all">("all");

  const visiblePins = pins.filter((p) => filter === "all" || p.pin_type === filter);
  const pendingCount = pins.filter((p) => p.status === "pending").length;

  return (
    <div className="community-voice-layer">
      <button type="button" className="community-voice-toggle" aria-expanded={expanded} aria-controls="community-voice-panel" onClick={() => setExpanded(!expanded)}>
        <Icon name="Megaphone" size={16} />
        <span>Community Reports ({pendingCount} pending)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div id="community-voice-panel" className="community-voice-panel">
          <div className="community-voice-filters" role="group" aria-label="Filter community reports">
            <button
              type="button"
              aria-pressed={filter === "all"}
              className={`community-filter-btn ${filter === "all" ? "community-filter-btn--active" : ""}`}
              onClick={() => setFilter("all")}
            >All</button>
            {(Object.keys(PIN_CONFIG) as CommunityPinType[]).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={filter === type}
                className={`community-filter-btn ${filter === type ? "community-filter-btn--active" : ""}`}
                onClick={() => setFilter(type)}
              >
                <Icon name={PIN_CONFIG[type].icon as any} size={12} />
                {PIN_CONFIG[type].label}
              </button>
            ))}
          </div>

          {onReport && (
            <div className="community-report-bar">
              <span className="community-report-label">Report an issue:</span>
              {(Object.keys(PIN_CONFIG) as CommunityPinType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="community-report-btn"
                  onClick={() => onReport(type)}
                  aria-label={`Report ${PIN_CONFIG[type].label}`}
                  title={`Report ${PIN_CONFIG[type].label}`}
                >
                  <Icon name={PIN_CONFIG[type].icon as any} size={14} color={PIN_CONFIG[type].color} />
                </button>
              ))}
            </div>
          )}

          <div className="community-pin-list">
            {visiblePins.length === 0 ? (
              <p className="community-empty">No reports match this filter.</p>
            ) : (
              visiblePins.map((pin) => {
                const cfg = PIN_CONFIG[pin.pin_type];
                const statusStyle = STATUS_STYLES[pin.status];
                return (
                  <div
                    key={pin.pin_id}
                    className={`community-pin-card community-pin-card--${pin.status}`}
                    style={{ borderLeftColor: cfg.color }}
                  >
                    <div className="community-pin-header">
                      <Icon name={cfg.icon as any} size={16} color={cfg.color} />
                      <strong>{cfg.label}</strong>
                      <span className="community-pin-status" style={{ backgroundColor: statusStyle.bg, color: statusStyle.border }}>
                        {pin.status}
                      </span>
                    </div>
                    <p className="community-pin-desc">{pin.description}</p>
                    <div className="community-pin-meta">
                      <span><Icon name="MapPin" size={12} /> {pin.village}</span>
                      <span>{new Date(pin.reported_at).toLocaleDateString()}</span>
                    </div>
                    {pin.status === "pending" && (
                      <div className="community-pin-actions">
                        <button type="button" className="btn-secondary text-xs" onClick={() => onVerify?.(pin.pin_id)}>
                          <Icon name="CheckCircle" size={12} /> Verify
                        </button>
                        <button type="button" className="btn-ghost text-xs" onClick={() => onDismiss?.(pin.pin_id)}>
                          <Icon name="XCircle" size={12} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
