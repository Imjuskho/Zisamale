import type {
  Alert,
  AlertActionType,
  BudgetScenarioInput,
  BudgetScenarioOutput,
  CaseTrend,
  CHWPerformance,
  CommodityForecast,
  DistrictSummary,
  Household,
  WsStatus,
} from "../types";

const API_BASE: string =
  import.meta.env.VITE_API_URL ?? import.meta.env.REACT_APP_API_URL ?? "";

const TOKEN_KEY = "zisamale-token";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;
const RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: "http" | "network" | "offline";

  constructor(message: string, code: "http" | "network" | "offline", status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* JWT token management                                                */
/* ------------------------------------------------------------------ */

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null; // localStorage unavailable (SSR / tests)
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/* ------------------------------------------------------------------ */
/* Offline detection                                                   */
/* ------------------------------------------------------------------ */

let online =
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    online = true;
  });
  window.addEventListener("offline", () => {
    online = false;
  });
}

export function isOnline(): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return online;
}

type ConnectionListener = (online: boolean) => void;

export function onConnectionChange(listener: ConnectionListener): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleOnline = () => listener(true);
  const handleOffline = () => listener(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/* ------------------------------------------------------------------ */
/* Core request helper: typed, authenticated, retrying                 */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Number of automatic retries for network errors / 5xx. Default 3. */
  retries?: number;
  /** Attach Authorization header. Default true. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    retries = MAX_RETRIES,
    authenticated = true,
    signal,
  } = options;

  if (!isOnline()) {
    throw new ApiError(
      "You are offline. Changes will need to be retried once connectivity returns.",
      "offline"
    );
  }

  let attempt = 0;
  for (;;) {
    try {
      const headers: Record<string, string> = authenticated
        ? authHeaders()
        : { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";

      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }

      if (RETRYABLE_HTTP_STATUS.has(response.status) && attempt < retries) {
        attempt += 1;
        await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }

      const errorBody = await response.json().catch(() => null);
      const message =
        (errorBody && (errorBody.detail ?? errorBody.message)) ||
        `API error: ${response.status}`;
      throw new ApiError(String(message), "http", response.status);
    } catch (err) {
      const isApiError = err instanceof ApiError;
      // Only genuine network failures are retried; HTTP errors were already
      // retried above when eligible.
      if (isApiError || attempt >= retries) throw err;
      attempt += 1;
      await delay(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Response types                                                      */
/* ------------------------------------------------------------------ */

export interface LoginResponse {
  access_token: string;
  role: string;
  user_id: string;
  chw_id?: string | null;
  district_id?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    district?: string | null;
    chw_id?: string | null;
  };
}

export interface NationalOverviewResponse {
  districts: DistrictSummary[];
  national_summary: Record<string, number | string>;
}

export interface SurveillanceTrendsResponse {
  actual_cases: CaseTrend[];
  predicted_cases: CaseTrend[];
  model_accuracy: {
    auc_roc: number;
    sensitivity: number;
    specificity: number;
  } | null;
}

export interface ForecastResponse {
  commodity_needs: CommodityForecast[];
  executive_summary: string;
  forecast_period: string[];
}

/* ------------------------------------------------------------------ */
/* API endpoints                                                       */
/* ------------------------------------------------------------------ */

export const api = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: { username, password },
      authenticated: false,
      retries: 1,
    });
    tokenStore.set(data.access_token);
    return data;
  },

  logout(): void {
    tokenStore.clear();
  },

  getDistrictAlerts(districtId: string): Promise<Alert[]> {
    return request<{ alerts: Alert[] }>(
      `/api/v1/district/${encodeURIComponent(districtId)}/alerts`
    ).then((data) => data.alerts);
  },

  getNationalOverview(): Promise<NationalOverviewResponse> {
    return request<NationalOverviewResponse>("/api/v1/national/overview");
  },

  getSurveillanceTrends(districtId: string): Promise<SurveillanceTrendsResponse> {
    return request<SurveillanceTrendsResponse>(
      `/api/v1/district/${encodeURIComponent(districtId)}/surveillance/trends`
    );
  },

  getForecast(scenario: string): Promise<ForecastResponse> {
    return request<ForecastResponse>(
      `/api/v1/national/forecast?scenario=${encodeURIComponent(scenario)}`
    );
  },

  postAlertAction(
    alertId: string,
    action: AlertActionType,
    payload: Record<string, unknown> = {}
  ): Promise<Alert> {
    return request<Alert>(`/api/v1/alerts/${encodeURIComponent(alertId)}/actions`, {
      method: "POST",
      body: { action, ...payload },
    });
  },

  getCHWPerformance(districtId?: string): Promise<CHWPerformance[]> {
    const query = districtId ? `?district=${encodeURIComponent(districtId)}` : "";
    return request<{ chws: CHWPerformance[] }>(`/api/v1/chw/performance${query}`).then(
      (data) => data.chws
    );
  },

  getCHWHouseholds(chwId: string): Promise<Household[]> {
    return request<{ households: Household[] }>(
      `/api/v1/chw/${encodeURIComponent(chwId)}/households`
    ).then((data) => data.households);
  },

  runBudgetModel(input: BudgetScenarioInput): Promise<BudgetScenarioOutput> {
    return request<BudgetScenarioOutput>("/api/v1/chuma/budget-model", {
      method: "POST",
      body: input,
    });
  },
};

/* ------------------------------------------------------------------ */
/* Real-time alert WebSocket                                           */
/* ------------------------------------------------------------------ */

export interface AlertSocketHandlers {
  onAlert?: (alert: Alert) => void;
  onStatus?: (status: WsStatus) => void;
}

export interface AlertSocket {
  close: () => void;
}

function defaultWsUrl(): string {
  const token = tokenStore.get();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  if (API_BASE) {
    return `${API_BASE.replace(/^http/, "ws")}/api/v1/ws/alerts${qs}`;
  }
  if (typeof location !== "undefined") {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/api/v1/ws/alerts${qs}`;
  }
  return `/api/v1/ws/alerts${qs}`;
}

/**
 * Opens a WebSocket for real-time alerts with exponential-backoff reconnect.
 * Returns a handle whose `close()` tears the socket down permanently.
 */
export function connectAlertSocket(
  handlers: AlertSocketHandlers,
  opts: { url?: string } = {}
): AlertSocket {
  const url = opts.url ?? defaultWsUrl();
  let ws: WebSocket | null = null;
  let closedByUser = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function scheduleReconnect() {
    if (closedByUser) return;
    const waitMs = Math.min(15_000, 1000 * 2 ** attempts);
    attempts += 1;
    timer = setTimeout(connect, waitMs);
  }

  function connect() {
    if (closedByUser || typeof WebSocket === "undefined") return;
    handlers.onStatus?.("connecting");
    try {
      ws = new WebSocket(url);
    } catch {
      handlers.onStatus?.("error");
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      handlers.onStatus?.("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
        if (payload && (payload.alert_id || payload.type === "alert")) {
          handlers.onAlert?.(payload as unknown as Alert);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      handlers.onStatus?.("error");
    };

    ws.onclose = () => {
      handlers.onStatus?.("disconnected");
      scheduleReconnect();
    };
  }

  connect();

  return {
    close() {
      closedByUser = true;
      if (timer) clearTimeout(timer);
      ws?.close();
      handlers.onStatus?.("disconnected");
    },
  };
}
