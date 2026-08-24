import { useState, useMemo } from "react";
import { Icon } from "../design/Icon";

interface InterventionSimulatorProps {
  currentPredictedCases: number;
  onSimulate?: (actCount: number, deploymentTa: string) => void;
}

const TAS = ["TA Ndamera", "TA Mbenje", "TA Mkwicho", "TA Malemia", "TA Bavumbula"];

export function InterventionSimulator({ currentPredictedCases, onSimulate }: InterventionSimulatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [actCount, setActCount] = useState(5000);
  const [selectedTA, setSelectedTA] = useState(TAS[0]);

  const simulatedReduction = useMemo(() => {
    const base = actCount / 10000;
    const capped = Math.min(base, 0.45);
    return Math.round(capped * 100);
  }, [actCount]);

  const simulatedCases = useMemo(() => {
    return Math.round(currentPredictedCases * (1 - simulatedReduction / 100));
  }, [currentPredictedCases, simulatedReduction]);

  const costPerCase = useMemo(() => {
    const costMwk = actCount * 450;
    const casesAverted = currentPredictedCases - simulatedCases;
    return casesAverted > 0 ? Math.round(costMwk / casesAverted) : 0;
  }, [actCount, currentPredictedCases, simulatedCases]);

  return (
    <div className="intervention-simulator">
      <button className="intervention-toggle" onClick={() => setExpanded(!expanded)}>
        <Icon name="Calculator" size={16} />
        <span>Intervention Simulator</span>
        <Icon name={expanded ? "Minus" : "Plus"} size={14} />
      </button>

      {expanded && (
        <div className="intervention-panel">
          <p className="intervention-desc">
            What if you pre-position supplies? Adjust the slider to see predicted impact.
          </p>

          <div className="intervention-control">
            <label className="intervention-label">
              ACTs to pre-position: <strong>{actCount.toLocaleString()}</strong>
            </label>
            <input
              type="range"
              min={0}
              max={20000}
              step={500}
              value={actCount}
              onChange={(e) => setActCount(Number(e.target.value))}
              className="intervention-slider"
            />
            <div className="intervention-slider-labels">
              <span>0</span>
              <span>10K</span>
              <span>20K</span>
            </div>
          </div>

          <div className="intervention-control">
            <label className="intervention-label">Deploy to:</label>
            <select
              className="intervention-select"
              value={selectedTA}
              onChange={(e) => setSelectedTA(e.target.value)}
            >
              {TAS.map((ta) => (
                <option key={ta} value={ta}>{ta}</option>
              ))}
            </select>
          </div>

          <div className="intervention-results">
            <div className="intervention-result">
              <span className="intervention-result-label">Predicted cases</span>
              <span className="intervention-result-value">
                {currentPredictedCases} → <strong style={{ color: simulatedReduction > 0 ? "#2d7d46" : "#666" }}>{simulatedCases}</strong>
              </span>
            </div>
            <div className="intervention-result">
              <span className="intervention-result-label">Reduction</span>
              <span className="intervention-result-value" style={{ color: simulatedReduction > 0 ? "#2d7d46" : "#666" }}>
                {simulatedReduction > 0 ? `-${simulatedReduction}%` : "No change"}
              </span>
            </div>
            <div className="intervention-result">
              <span className="intervention-result-label">Cost per case averted</span>
              <span className="intervention-result-value">
                MWK {costPerCase.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            className="btn-primary intervention-apply"
            onClick={() => onSimulate?.(actCount, selectedTA)}
            disabled={actCount === 0}
          >
            <Icon name="ArrowRight" size={14} />
            Apply to Prediction Model
          </button>
        </div>
      )}
    </div>
  );
}
