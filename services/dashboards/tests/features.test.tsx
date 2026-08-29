import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { BrowserRouter } from "react-router-dom";
import { dashboardReducer, authReducer, themeReducer } from "../src/store/dashboardSlice";
import { ThemeToggle } from "../src/components/ThemeToggle";
import { Sidebar } from "../src/components/Sidebar";
import { LoginPage } from "../src/pages/LoginPage";
import type { User } from "../src/types";

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
    expect(screen.getByRole("link", { name: /risk map/i })).toHaveAttribute("href", "/dho");
  });

  it("shows MoHP link for mohp role", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "mohp", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "mohp" } } }));
    expect(screen.getByRole("link", { name: /trends/i })).toHaveAttribute("href", "/mohp");
  });

  it("hides DHO link for mohp role", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "mohp", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "mohp" } } }));
    expect(screen.queryByRole("link", { name: /risk map/i })).not.toBeInTheDocument();
  });

  it("shows theme toggle", () => {
    renderWithStore(<Sidebar />, createStore({ auth: { role: "dho", isAuthenticated: true, user: { id: "1", name: "Test", email: "t@t.com", role: "dho" } } }));
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Zisamale");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
  });

  it("does not present an ineffective role selector", () => {
    renderWithStore(<LoginPage />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
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
