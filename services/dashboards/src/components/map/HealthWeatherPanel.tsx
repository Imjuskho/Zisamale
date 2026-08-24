import { useState } from "react";
import type { HealthWeatherBriefing } from "../../types";
import { Icon } from "../design/Icon";

interface HealthWeatherPanelProps {
  briefing: HealthWeatherBriefing | null;
  onRefresh?: () => void;
}

export function HealthWeatherPanel({ briefing, onRefresh }: HealthWeatherPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!briefing) return null;

  const alertColor = briefing.alert_level === "red" ? "#c62828" : briefing.alert_level === "yellow" ? "#e65100" : "#2d7d46";

  return (
    <div className="health-weather-panel">
      <button className="health-weather-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Lightning" size={16} />
        <span>Health Weather</span>
        <span className="health-weather-badge" style={{ backgroundColor: alertColor }} />
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="health-weather-content">
          <div className="health-weather-header">
            <span className="health-weather-date">
              {new Date(briefing.generated_at).toLocaleDateString()}
            </span>
            {onRefresh && (
              <button className="health-weather-refresh" onClick={onRefresh}>
                <Icon name="CloudArrowUp" size={14} /> Refresh
              </button>
            )}
          </div>

          <div className="health-weather-district">{briefing.district}</div>

          <p className="health-weather-summary">{briefing.risk_summary}</p>

          {briefing.action_items.length > 0 && (
            <div className="health-weather-actions">
              <strong>Today's Actions:</strong>
              {briefing.action_items.map((item, i) => (
                <div key={i} className="health-weather-action">
                  <Icon name="ArrowRight" size={12} color={alertColor} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
