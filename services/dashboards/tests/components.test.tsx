import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { dashboardReducer } from "../src/store/dashboardSlice";
import { AlertInbox } from "../src/components/alerts/AlertInbox";
import { NationalOverview } from "../src/components/common/NationalOverview";
import type { Alert, DistrictSummary } from "../src/types";

function createTestStore() {
  return configureStore({ reducer: { dashboard: dashboardReducer } });
}

const mockAlerts: Alert[] = [
  {
    alert_id: "alert-1",
    disease: "malaria",
    ta_name: "Makhanga",
    risk_score: 8.2,
    alert_level: "red",
    predicted_cases: 120,
    confidence_interval: [95, 145],
    generated_at: "2026-08-20T10:00:00Z",
    valid_until: "2026-09-03T10:00:00Z",
    recommended_actions: ["Deploy mobile outreach"],
    response_status: "pending",
  },
  {
    alert_id: "alert-2",
    disease: "cholera",
    ta_name: "Thyolo",
    risk_score: 4.5,
    alert_level: "yellow",
    predicted_cases: 35,
    confidence_interval: [20, 50],
    generated_at: "2026-08-20T10:00:00Z",
    valid_until: "2026-09-03T10:00:00Z",
    recommended_actions: ["Enhance community mobilisation"],
    response_status: "acknowledged",
  },
];

const mockDistricts: DistrictSummary[] = [
  {
    district_id: "nsanje-001",
    district_name: "Nsanje",
    malaria_risk_level: "high",
    active_alerts: 3,
    stockout_count: 2,
    maternal_mortality_ratio: 430,
    under5_mortality_rate: 83,
    essential_service_coverage: 0.54,
  },
];

describe("AlertInbox", () => {
  it("renders alerts", () => {
    render(<AlertInbox alerts={mockAlerts} />);
    expect(screen.getByText("Alert Inbox")).toBeInTheDocument();
    expect(screen.getByText("malaria")).toBeInTheDocument();
    expect(screen.getByText("cholera")).toBeInTheDocument();
  });

  it("shows empty state when no alerts", () => {
    render(<AlertInbox alerts={[]} />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
  });

  it("displays risk scores", () => {
    render(<AlertInbox alerts={mockAlerts} />);
    expect(screen.getByText("8.2")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });
});

describe("NationalOverview", () => {
  it("renders district table", () => {
    render(<NationalOverview districts={mockDistricts} />);
    expect(screen.getByText("National Overview")).toBeInTheDocument();
    expect(screen.getByText("Nsanje")).toBeInTheDocument();
  });

  it("shows risk badges", () => {
    render(<NationalOverview districts={mockDistricts} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("formats coverage as percentage", () => {
    render(<NationalOverview districts={mockDistricts} />);
    expect(screen.getByText("54%")).toBeInTheDocument();
  });
});

describe("dashboardSlice", () => {
  it("has correct initial state", () => {
    const store = createTestStore();
    const state = store.getState().dashboard;
    expect(state.alerts).toEqual([]);
    expect(state.districts).toEqual([]);
    expect(state.trends).toBeNull();
    expect(state.forecast).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
