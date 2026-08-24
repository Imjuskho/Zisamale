import type { DistrictSummary } from "../../types";

interface Props {
  districts: DistrictSummary[];
}

const RISK_COLORS: Record<string, string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#16a34a",
};

export function NationalOverview({ districts }: Props) {
  return (
    <div className="national-overview">
      <h2>National Overview</h2>
      <table className="district-table">
        <thead>
          <tr>
            <th>District</th>
            <th>Malaria Risk</th>
            <th>Active Alerts</th>
            <th>Stockouts</th>
            <th>MMR</th>
            <th>U5MR</th>
            <th>Service Coverage</th>
          </tr>
        </thead>
        <tbody>
          {districts.map((d) => (
            <tr key={d.district_id}>
              <td className="district-name">{d.district_name}</td>
              <td>
                <span
                  className="risk-pill"
                  style={{
                    display: "inline-block",
                    backgroundColor: RISK_COLORS[d.malaria_risk_level],
                    color: "#fff",
                    borderRadius: 12,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {d.malaria_risk_level}
                </span>
              </td>
              <td>{d.active_alerts}</td>
              <td>{d.stockout_count}</td>
              <td>{d.maternal_mortality_ratio}</td>
              <td>{d.under5_mortality_rate}</td>
              <td>{(d.essential_service_coverage * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
