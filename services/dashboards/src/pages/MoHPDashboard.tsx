import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchNationalOverview } from "../store/dashboardSlice";
import { NationalOverview } from "../components/common/NationalOverview";
import { LeafletMap, type DistrictRiskInput } from "../components/LeafletMap";
import { NLGExecutiveSummary } from "../components/NLGExecutiveSummary";

const LEVEL_TO_RISK = { low: 0.22, medium: 0.47, high: 0.86 } as const;

export function MoHPDashboard() {
  const dispatch = useAppDispatch();
  const { districts, alerts, forecast } = useAppSelector((s) => s.dashboard);

  useEffect(() => {
    dispatch(fetchNationalOverview());
  }, [dispatch]);

  const mapDistricts = useMemo<DistrictRiskInput[]>(
    () =>
      districts.map((d) => ({
        district_id: d.district_id,
        name: d.district_name,
        risk_score: LEVEL_TO_RISK[d.malaria_risk_level],
      })),
    [districts]
  );

  return (
    <div className="dashboard mohp-dashboard">
      <header className="dashboard-header">
        <h1>Ministry of Health Dashboard</h1>
        <p>National Surveillance &amp; Policy Tracking</p>
      </header>
      <section>
        <NationalOverview districts={districts} />
      </section>
      <section>
        <LeafletMap districts={mapDistricts} height={520} />
      </section>
      <section className="executive-summary">
        <NLGExecutiveSummary
          alerts={alerts}
          districts={districts}
          forecast={forecast?.commodity_needs ?? null}
        />
      </section>
    </div>
  );
}
