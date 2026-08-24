import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/useRedux";
import { fetchForecast } from "../store/dashboardSlice";
import { CommodityForecastChart } from "../components/charts/CommodityForecastChart";
import { BudgetModeler } from "../components/BudgetModeler";

export function CHUMADashboard() {
  const dispatch = useAppDispatch();
  const { forecast } = useAppSelector((s) => s.dashboard);

  useEffect(() => {
    dispatch(fetchForecast("baseline"));
  }, [dispatch]);

  return (
    <div className="dashboard chuma-dashboard">
      <header className="dashboard-header">
        <p className="dashboard-kicker">Policy &amp; Forecasting</p>
        <h1>CHUMA-AI Policy Dashboard</h1>
        <p>Resource Forecasting &amp; Budget Modelling</p>
      </header>
      {forecast && (
        <>
          <section>
            <CommodityForecastChart commodities={forecast.commodity_needs} />
          </section>
          <section className="executive-summary">
            <p>{forecast.executive_summary}</p>
          </section>
        </>
      )}
      <section>
        <BudgetModeler />
      </section>
    </div>
  );
}
