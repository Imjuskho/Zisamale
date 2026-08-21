import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { BrowserRouter } from "react-router-dom";
import { dashboardReducer, authReducer, themeReducer } from "../src/store/dashboardSlice";
import { RiskMap } from "../src/components/RiskMap";
import { DataTable } from "../src/components/DataTable";
import { NLGSummary } from "../src/components/NLGSummary";
import { PDFExport } from "../src/components/PDFExport";
import { ThemeToggle } from "../src/components/ThemeToggle";
import { Sidebar } from "../src/components/Sidebar";
import { LoginPage } from "../src/pages/LoginPage";
import type { Alert, DistrictSummary, RiskMapDistrict, User } from "../src/types";

function createStore(preloaded?: { auth?: Partial<ReturnType<typeof authReducer>>; theme?: Partial<ReturnType<typeof themeReducer>> }) {
  return configureStore({
    reducer: {
      dashboard: dashboardReducer,
      auth: authReducer,
      theme: themeReducer,
    },
    preloadedState: {
      dashboard: {
        alerts: [],
        districts: [],
        trends: null,
        forecast: null,
        loading: false,
        error: null,
        selectedAlertId: null,
        chwPerformance: [],
        chwHouseholds: {},
        map: { selectedDistrictId: null, zoomLevel: 7 },
        wsStatus: "disconnected" as const,
      },
      auth: {
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
        ...preloaded?.auth,
      },
      theme: {
        darkMode: false,
        ...preloaded?.theme,
      },
    },
  });
}

function renderWithStore(ui: React.ReactElement, store?: ReturnType<typeof createStore>) {
  const s = store ?? createStore();
  return render(
    <Provider store={s}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
}

const mockRiskDistricts: RiskMapDistrict[] = [
  { district_id: "nsanje-001", district_name: "Nsanje", risk_score: 8.5, alert_count: 3 },
  { district_id: "blantyre-001", district_name: "Blantyre", risk_score: 4.2, alert_count: 1 },
];

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

describe("RiskMap", () => {
  it("renders the map heading", () => {
    renderWithStore(<RiskMap districts={mockRiskDistricts} />);
    expect(screen.getByText("District Risk Map")).toBeInTheDocument();
  });

  it("renders all districts in SVG", () => {
    renderWithStore(<RiskMap districts={mockRiskDistricts} />);
    expect(screen.getByText("Nsanje")).toBeInTheDocument();
    expect(screen.getByText("Blantyre")).toBeInTheDocument();
  });

  it("shows legend items", () => {
    renderWithStore(<RiskMap districts={mockRiskDistricts} />);
    expect(screen.getByText(/Low \(0-3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Critical \(7-10\)/)).toBeInTheDocument();
  });

  it("calls onSelectDistrict on click", () => {
    const onSelect = vi.fn();
    renderWithStore(<RiskMap districts={mockRiskDistricts} onSelectDistrict={onSelect} />);
    const nsanje = screen.getByText("Nsanje");
    fireEvent.click(nsanje.closest("g")!);
    expect(onSelect).toHaveBeenCalledWith(mockRiskDistricts[0]);
  });

  it("shows tooltip on hover", () => {
    renderWithStore(<RiskMap districts={mockRiskDistricts} />);
    const nsanje = screen.getByText("Nsanje");
    fireEvent.mouseEnter(nsanje.closest("g")!);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText(/8\.5/)).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  type Row = {
    name: string;
    value: number;
  };

  const columns = [
    { key: "name" as const, label: "Name", sortable: true },
    { key: "value" as const, label: "Value", sortable: true },
  ];

  const data: Row[] = [
    { name: "Alpha", value: 30 },
    { name: "Beta", value: 10 },
    { name: "Gamma", value: 20 },
  ];

  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText(/Name/)).toBeInTheDocument();
    expect(screen.getByText(/Value/)).toBeInTheDocument();
  });

  it("renders all rows", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("sorts by clicking column header", () => {
    render(<DataTable columns={columns} data={data} />);
    fireEvent.click(screen.getByText(/Value/));
    const cells = screen.getAllByRole("cell");
    expect(cells[0].textContent).toBe("Beta");
    expect(cells[1].textContent).toBe("10");
    expect(cells[2].textContent).toBe("Gamma");
    expect(cells[3].textContent).toBe("20");
    expect(cells[4].textContent).toBe("Alpha");
    expect(cells[5].textContent).toBe("30");
  });

  it("filters by search input", () => {
    render(<DataTable columns={columns} data={data} searchable />);
    fireEvent.change(screen.getByLabelText("Search table"), { target: { value: "Beta" } });
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("paginates data", () => {
    const bigData = Array.from({ length: 25 }, (_, i) => ({ name: `Item ${i}`, value: i }));
    render(<DataTable columns={columns} data={bigData} pageSize={10} />);
    expect(screen.getByText("Item 0")).toBeInTheDocument();
    expect(screen.queryByText("Item 10")).not.toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText("Item 10")).toBeInTheDocument();
  });
});

describe("NLGSummary", () => {
  it("generates summary for empty data", () => {
    renderWithStore(<NLGSummary alerts={[]} districts={[]} forecast={null} />);
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText(/no active disease alerts/)).toBeInTheDocument();
  });

  it("summarizes alerts and districts", () => {
    renderWithStore(
      <NLGSummary alerts={mockAlerts} districts={mockDistricts} forecast={null} />
    );
    expect(screen.getByText(/1 active alert/)).toBeInTheDocument();
    expect(screen.getByText(/high malaria risk/)).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  it("renders toggle button", () => {
    renderWithStore(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it("toggles dark mode", () => {
    renderWithStore(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();
  });
});

describe("Sidebar", () => {
  it("shows DHO link for dho role", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "dho", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "dho" } } }));
    expect(screen.getByText("DHO Dashboard")).toBeInTheDocument();
  });

  it("shows MoHP link for mohp role", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "mohp", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "mohp" } } }));
    expect(screen.getByText("MoHP Dashboard")).toBeInTheDocument();
  });

  it("hides DHO link for mohp role", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "mohp", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "mohp" } } }));
    expect(screen.queryByText("DHO Dashboard")).not.toBeInTheDocument();
  });

  it("shows theme toggle", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "dho", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "dho" } } }));
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });
});

describe("PDFExport", () => {
  it("renders export button", () => {
    const ref = { current: document.createElement("div") };
    render(<PDFExport targetRef={ref} />);
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export dashboard to pdf/i })).toBeInTheDocument();
  });
});

describe("LoginPage", () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });
  });

  it("renders login form", () => {
    renderWithStore(<LoginPage />);
    expect(screen.getByText("Zisamale Login")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
  });

  it("shows role options", () => {
    renderWithStore(<LoginPage />);
    expect(screen.getByText("District Health Officer")).toBeInTheDocument();
    expect(screen.getByText("Ministry of Health Policy")).toBeInTheDocument();
    expect(screen.getByText("Community Health Worker")).toBeInTheDocument();
  });

  it("validates empty fields", async () => {
    renderWithStore(<LoginPage />);
    fireEvent.click(screen.getByText("Sign In"));
    expect(await screen.findByText("Email and password are required")).toBeInTheDocument();
  });
});

describe("authSlice", () => {
  it("has correct initial state", () => {
    const store = createStore();
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });

  it("login sets auth state", () => {
    const store = createStore();
    const user: User = { id: "1", name: "Admin", email: "a@a.com", role: "dho" };
    store.dispatch({ type: "auth/login", payload: { user, token: "jwt-123" } });
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe("Admin");
    expect(state.token).toBe("jwt-123");
    expect(state.role).toBe("dho");
  });

  it("logout clears auth state", () => {
    const store = createStore();
    const user: User = { id: "1", name: "Admin", email: "a@a.com", role: "dho" };
    store.dispatch({ type: "auth/login", payload: { user, token: "jwt-123" } });
    store.dispatch({ type: "auth/logout" });
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

describe("themeSlice", () => {
  it("toggles dark mode", () => {
    const store = createStore();
    expect(store.getState().theme.darkMode).toBe(false);
    store.dispatch({ type: "theme/toggleDarkMode" });
    expect(store.getState().theme.darkMode).toBe(true);
    store.dispatch({ type: "theme/toggleDarkMode" });
    expect(store.getState().theme.darkMode).toBe(false);
  });
});
