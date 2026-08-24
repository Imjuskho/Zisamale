import type { OutbreakPrediction } from "../../types";
import { Icon } from "../design/Icon";

interface OutbreakTimeSliderProps {
  predictions: OutbreakPrediction[];
  currentWeek: number;
  onWeekChange: (week: number) => void;
  maxWeeks?: number;
}

export function OutbreakTimeSlider({
  predictions,
  currentWeek,
  onWeekChange,
  maxWeeks = 8,
}: OutbreakTimeSliderProps) {
  const weekPredictions = predictions.filter((p) => p.week_offset === currentWeek);
  const avgRisk = weekPredictions.length > 0
    ? weekPredictions.reduce((s, p) => s + p.risk_score, 0) / weekPredictions.length
    : 0;

  const riskColor = avgRisk > 0.7 ? "#c62828" : avgRisk > 0.4 ? "#e65100" : avgRisk > 0.2 ? "#f9a825" : "#2d7d46";
  const riskLabel = avgRisk > 0.7 ? "Critical" : avgRisk > 0.4 ? "High" : avgRisk > 0.2 ? "Moderate" : "Low";

  return (
    <div className="outbreak-time-slider">
      <div className="outbreak-slider-header">
        <Icon name="ChartBar" size={16} />
        <span>Predicted Outbreak Spread</span>
        <span className="outbreak-slider-week">
          {currentWeek === 0 ? "Now" : `Week +${currentWeek}`}
        </span>
      </div>

      <div className="outbreak-slider-row">
        <span className="outbreak-slider-label">Now</span>
        <input
          type="range"
          min={0}
          max={maxWeeks}
          value={currentWeek}
          onChange={(e) => onWeekChange(Number(e.target.value))}
          className="outbreak-slider-input"
          aria-label="Prediction week"
        />
        <span className="outbreak-slider-label">+{maxWeeks} weeks</span>
      </div>

      <div className="outbreak-slider-summary">
        <span className="outbreak-risk-indicator" style={{ backgroundColor: riskColor }}>
          {riskLabel} risk
        </span>
        <span className="outbreak-prediction-count">
          {weekPredictions.length} zones with active predictions
        </span>
      </div>

      <div className="outbreak-slider-ticks">
        {Array.from({ length: maxWeeks + 1 }, (_, i) => {
          const preds = predictions.filter((p) => p.week_offset === i);
          const avg = preds.length > 0 ? preds.reduce((s, p) => s + p.risk_score, 0) / preds.length : 0;
          return (
            <button
              key={i}
              className={`outbreak-tick ${i === currentWeek ? "outbreak-tick--active" : ""}`}
              style={{ backgroundColor: avg > 0 ? `rgba(198, 40, 40, ${Math.min(avg, 1)})` : "#e0e0e0" }}
              onClick={() => onWeekChange(i)}
              aria-label={`Week ${i}`}
            />
          );
        })}
      </div>
    </div>
  );
}
