import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type {
  DashboardState,
  AuthState,
  ThemeState,
  Alert,
  AlertActionType,
  User,
  UserRole,
  WsStatus,
} from "../types";
import { api } from "../services/api";

const savedTheme = (() => {
  try {
    return localStorage.getItem("zisamale-dark-mode") === "true";
  } catch {
    return false;
  }
})();

const savedAuth = (() => {
  try {
    const token = localStorage.getItem("zisamale-token");
    const userRaw = localStorage.getItem("zisamale-user");
    const role = localStorage.getItem("zisamale-role") as UserRole | null;
    if (token && userRaw && role) {
      return { token, user: JSON.parse(userRaw) as User, role };
    }
  } catch {
    // ignore
  }
  return null;
})();

const initialDashboard: DashboardState = {
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
  wsStatus: "disconnected",
};

const initialAuth: AuthState = savedAuth
  ? { user: savedAuth.user, token: savedAuth.token, role: savedAuth.role, isAuthenticated: true }
  : { user: null, token: null, role: null, isAuthenticated: false };

const initialTheme: ThemeState = { darkMode: savedTheme };

export const fetchAlerts = createAsyncThunk("dashboard/fetchAlerts", async (districtId: string) => {
  const data = await api.getDistrictAlerts(districtId);
  return data;
});

export const fetchNationalOverview = createAsyncThunk("dashboard/fetchNationalOverview", async () => {
  const data = await api.getNationalOverview();
  return data;
});

export const fetchSurveillanceTrends = createAsyncThunk(
  "dashboard/fetchSurveillanceTrends",
  async (districtId: string) => {
    const data = await api.getSurveillanceTrends(districtId);
    return {
      actual: data.actual_cases ?? [],
      predicted: data.predicted_cases ?? [],
      accuracy: data.model_accuracy ?? null,
    };
  }
);

export const fetchForecast = createAsyncThunk("dashboard/fetchForecast", async (scenario: string) => {
  const data = await api.getForecast(scenario);
  return data;
});

export const fetchCHWPerformance = createAsyncThunk(
  "dashboard/fetchCHWPerformance",
  async (districtId: string | undefined) => {
    return api.getCHWPerformance(districtId);
  }
);

export const fetchCHWHouseholds = createAsyncThunk(
  "dashboard/fetchCHWHouseholds",
  async (chwId: string) => {
    const households = await api.getCHWHouseholds(chwId);
    return { chwId, households };
  }
);

export const submitAlertAction = createAsyncThunk(
  "dashboard/submitAlertAction",
  async ({ alertId, action }: { alertId: string; action: AlertActionType }) => {
    return api.postAlertAction(alertId, action);
  }
);

function upsertAlert(state: DashboardState, alert: Alert) {
  const idx = state.alerts.findIndex((a) => a.alert_id === alert.alert_id);
  if (idx >= 0) state.alerts[idx] = alert;
  else state.alerts.unshift(alert);
}

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: initialDashboard,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectAlert: (state, action: PayloadAction<string | null>) => {
      state.selectedAlertId = action.payload;
    },
    realtimeAlertReceived: (state, action: PayloadAction<Alert>) => {
      upsertAlert(state, action.payload);
    },
    setWsStatus: (state, action: PayloadAction<WsStatus>) => {
      state.wsStatus = action.payload;
    },
    selectDistrict: (state, action: PayloadAction<string | null>) => {
      state.map.selectedDistrictId = action.payload;
    },
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.map.zoomLevel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch alerts";
      })
      .addCase(fetchNationalOverview.fulfilled, (state, action) => {
        state.districts = action.payload.districts;
      })
      .addCase(fetchSurveillanceTrends.fulfilled, (state, action) => {
        state.trends = action.payload;
      })
      .addCase(fetchForecast.fulfilled, (state, action) => {
        state.forecast = action.payload;
      })
      .addCase(fetchCHWPerformance.fulfilled, (state, action) => {
        state.chwPerformance = action.payload;
      })
      .addCase(fetchCHWPerformance.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch CHW performance";
      })
      .addCase(fetchCHWHouseholds.fulfilled, (state, action) => {
        state.chwHouseholds[action.payload.chwId] = action.payload.households;
      })
      .addCase(submitAlertAction.fulfilled, (state, action) => {
        upsertAlert(state, action.payload);
      });
  },
});

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuth,
  reducers: {
    login: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.user.role;
      state.isAuthenticated = true;
      try {
        localStorage.setItem("zisamale-token", action.payload.token);
        localStorage.setItem("zisamale-user", JSON.stringify(action.payload.user));
        localStorage.setItem("zisamale-role", action.payload.user.role);
      } catch {
        // localStorage unavailable
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      try {
        localStorage.removeItem("zisamale-token");
        localStorage.removeItem("zisamale-user");
        localStorage.removeItem("zisamale-role");
      } catch {
        // localStorage unavailable
      }
    },
  },
});

const themeSlice = createSlice({
  name: "theme",
  initialState: initialTheme,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      try {
        localStorage.setItem("zisamale-dark-mode", String(state.darkMode));
      } catch {
        // localStorage unavailable
      }
    },
  },
});

export const {
  clearError,
  selectAlert,
  realtimeAlertReceived,
  setWsStatus,
  selectDistrict,
  setZoomLevel,
} = dashboardSlice.actions;
export const { login, logout } = authSlice.actions;
export const { toggleDarkMode } = themeSlice.actions;

export const dashboardReducer = dashboardSlice.reducer;
export const authReducer = authSlice.reducer;
export const themeReducer = themeSlice.reducer;
