import { useState } from "react";
import type { NutritionDataPoint } from "../../types";
import { Icon } from "../design/Icon";

interface NutritionLayerProps {
  data: NutritionDataPoint[];
}

function stuntingColor(rate: number): string {
  if (rate < 0.2) return "#2d7d46";
  if (rate < 0.3) return "#f9a825";
  return "#c62828";
}

export function NutritionLayer({ data }: NutritionLayerProps) {
  const [expanded, setExpanded] = useState(false);

  const hotspots = data.filter((d) => d.stunting_rate >= 0.3 || d.wasting_rate >= 0.15);
  const rutfNeeded = data.filter((d) => d.rutf_needed);

  return (
    <div className="nutrition-layer">
      <button className="nutrition-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Drop" size={16} />
        <span>Nutrition ({hotspots.length} hotspots)</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="nutrition-panel">
          {rutfNeeded.length > 0 && (
            <div className="nutrition-alert">
              <Icon name="Warning" size={14} color="#e65100" />
              {rutfNeeded.length} village(s) need RUTF supplies
            </div>
          )}

          <div className="nutrition-list">
            {data.sort((a, b) => b.stunting_rate - a.stunting_rate).slice(0, 20).map((dp) => (
              <div key={dp.village_id} className="nutrition-row">
                <span className="nutrition-dot" style={{ backgroundColor: stuntingColor(dp.stunting_rate) }} />
                <div className="nutrition-info">
                  <span className="nutrition-village">{dp.village_name}</span>
                  <span className="nutrition-stats">
                    Stunting: {Math.round(dp.stunting_rate * 100)}% · Wasting: {Math.round(dp.wasting_rate * 100)}% · MUAC screenings: {dp.muac_screenings}
                  </span>
                </div>
                {dp.rutf_needed && (
                  <span className="nutrition-rutf-badge">RUTF</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
