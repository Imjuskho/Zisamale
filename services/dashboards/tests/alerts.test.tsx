import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  AlertCommandCenter,
  formatTimeRemaining,
  outbreakCurve,
} from "../src/components/AlertCommandCenter";
import type { Alert } from "../src/types";

const FIXED_NOW = new Date("2026-08-21T12:00:00Z");

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    alert_id: "alert-1",
    disease: "malaria",
    ta_name: "Makhanga",
    risk_score: 8.2,
    alert_level: "red",
    predicted_cases: 120,
    confidence_interval: [95, 145],
    generated_at: "2026-08-20T10:00:00Z",
    valid_until: "2026-08-24T12:00:00Z",
    recommended_actions: ["Deploy mobile outreach"],
    response_status: "pending",
    ...overrides,
  };
}

const mockAlerts: Alert[] = [
  makeAlert(),
  makeAlert({
    alert_id: "alert-2",
    disease: "cholera",
    ta_name: "Chapananga",
    alert_level: "yellow",
    predicted_cases: 40,
    confidence_interval: [30, 55],
    response_status: "acknowledged",
  }),
];

describe("AlertCommandCenter", () => {
  it("renders all alert cards with key fields", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    expect(screen.getByText("Alert Command Center")).toBeInTheDocument();
    expect(screen.getByText("Makhanga")).toBeInTheDocument();
    expect(screen.getByText("Chapananga")).toBeInTheDocument();
    expect(screen.getAllByText("Predicted cases:").length).toBe(2);
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getAllByTestId("time-remaining").length).toBe(2);
  });

  it("shows time remaining based on valid_until", () => {
    render(<AlertCommandCenter alerts={[mockAlerts[0]]} now={FIXED_NOW} />);
    expect(screen.getByText("3d 0h remaining")).toBeInTheDocument();
  });

  it("filters by disease", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    fireEvent.change(screen.getByLabelText("Disease"), {
      target: { value: "malaria" },
    });
    expect(screen.getByText("Makhanga")).toBeInTheDocument();
    expect(screen.queryByText("Chapananga")).not.toBeInTheDocument();
  });

  it("filters by risk level", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    fireEvent.change(screen.getByLabelText("Risk Level"), {
      target: { value: "red" },
    });
    expect(screen.getByText("Makhanga")).toBeInTheDocument();
    expect(screen.queryByText("Chapananga")).not.toBeInTheDocument();
  });

  it("filters by status", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "acknowledged" },
    });
    expect(screen.queryByText("Makhanga")).not.toBeInTheDocument();
    expect(screen.getByText("Chapananga")).toBeInTheDocument();
  });

  it("dispatches acknowledge action and updates local status", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(
      <AlertCommandCenter alerts={[mockAlerts[0]]} onAction={onAction} now={FIXED_NOW} />
    );
    const acknowledge = screen.getByRole("button", { name: "Acknowledge" });
    fireEvent.click(acknowledge);
    expect(onAction).toHaveBeenCalledWith(mockAlerts[0], "acknowledge");
    const chip = await screen.findByText("Acknowledged", { selector: ".status" });
    expect(chip).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acknowledge" })).toBeDisabled();
  });

  it("dispatches deploy DRRT and request supplies actions", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(
      <AlertCommandCenter alerts={[mockAlerts[0]]} onAction={onAction} now={FIXED_NOW} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Deploy DRRT" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Supplies" }));
    expect(onAction).toHaveBeenNthCalledWith(1, mockAlerts[0], "deploy_drrt");
    expect(onAction).toHaveBeenNthCalledWith(2, mockAlerts[0], "request_supplies");
  });

  it("dismisses an alert and removes its card", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(
      <AlertCommandCenter alerts={[mockAlerts[0]]} onAction={onAction} now={FIXED_NOW} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onAction).toHaveBeenCalledWith(mockAlerts[0], "dismiss");
    expect(screen.queryByText("Makhanga")).not.toBeInTheDocument();
  });

  it("offers undo after dismissing an alert", async () => {
    render(<AlertCommandCenter alerts={[mockAlerts[0]]} now={FIXED_NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Makhanga")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Makhanga")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("offers clear-filters recovery from the filtered empty state", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    fireEvent.change(screen.getByLabelText("Disease"), { target: { value: "measles" } });
    expect(screen.getByText("No alerts match the current filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(screen.getByText("Makhanga")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear all filters" })
    ).not.toBeInTheDocument();
  });

  it("shows a plain empty state when there are no alerts at all", () => {
    render(<AlertCommandCenter alerts={[]} now={FIXED_NOW} />);
    expect(
      screen.getByText(/No alerts right now/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear all filters" })
    ).not.toBeInTheDocument();
  });

  it("renders the outbreak timeline for the selected alert", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    expect(screen.getByText(/Outbreak Timeline — Makhanga/)).toBeInTheDocument();
    const choleraCard = screen.getByText("Chapananga").closest("article")!;
    fireEvent.click(
      within(choleraCard).getByRole("button", { name: "View timeline" })
    );
    expect(screen.getByText(/Outbreak Timeline — Chapananga/)).toBeInTheDocument();
  });

  it("shows empty state when filters match nothing", () => {
    render(<AlertCommandCenter alerts={mockAlerts} now={FIXED_NOW} />);
    fireEvent.change(screen.getByLabelText("Disease"), { target: { value: "measles" } });
    expect(screen.getByText("No alerts match the current filters.")).toBeInTheDocument();
  });
});

describe("formatTimeRemaining", () => {
  it("formats days and hours", () => {
    expect(formatTimeRemaining("2026-08-24T12:00:00Z", FIXED_NOW)).toBe("3d 0h remaining");
  });

  it("formats hours under a day", () => {
    expect(formatTimeRemaining("2026-08-21T20:00:00Z", FIXED_NOW)).toBe("8h remaining");
  });

  it("formats minutes under an hour", () => {
    expect(formatTimeRemaining("2026-08-21T12:45:00Z", FIXED_NOW)).toBe("45m remaining");
  });

  it("reports expired windows", () => {
    expect(formatTimeRemaining("2026-08-20T00:00:00Z", FIXED_NOW)).toBe("Expired");
  });

  it("handles missing expiry", () => {
    expect(formatTimeRemaining(null, FIXED_NOW)).toBe("No expiry");
  });
});

describe("outbreakCurve", () => {
  it("peaks at the current week with the upper confidence bound", () => {
    const curve = outbreakCurve(mockAlerts[0]);
    expect(curve).toHaveLength(8);
    expect(curve[3]).toEqual({ week: "Now", cases: 145 });
  });

  it("is symmetric around the peak", () => {
    const curve = outbreakCurve(mockAlerts[0]);
    expect(curve[2].cases).toBe(curve[4].cases);
    expect(curve[1].cases).toBe(curve[5].cases);
  });
});
