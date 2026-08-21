import type { ReactNode } from "react";

export interface Alert {
  alert_id: string;
  disease: string;
  ta_name: string;
  risk_score: number;
  alert_level: "green" | "yellow" | "red";
  predicted_cases: number;
  confidence_interval: [number, number];
  generated_at: string;
  valid_until: string | null;
  recommended_actions: string[];
  response_status: "pending" | "acknowledged" | "in_progress" | "resolved";
}

export interface DistrictSummary {
  district_id: string;
  district_name: string;
  malaria_risk_level: "low" | "medium" | "high";
  active_alerts: number;
  stockout_count: number;
  maternal_mortality_ratio: number;
  under5_mortality_rate: number;
  essential_service_coverage: number;
}

export interface CaseTrend {
  week: string;
  cases: number;
  ci_lower?: number;
  ci_upper?: number;
}

export interface CommodityForecast {
  commodity: string;
  district: string;
  predicted_consumption: number;
  recommended_order: number;
  stockout_risk: number;
}

export type UserRole = "dho" | "mohp" | "chw" | "phim";

export type AlertActionType =
  | "acknowledge"
  | "deploy_drrt"
  | "request_supplies"
  | "dismiss";

export interface CHWPerformance {
  chw_id: string;
  chw_name: string;
  catchment_population: number;
  visits_this_week: number;
  expected_visits_weekly: number;
  high_risk_cases: number;
  referrals_open: number;
  /** ISO 8601 timestamp of the last successful mobile sync. */
  last_sync_at: string;
  households?: Household[];
}

export interface Household {
  household_id: string;
  head_of_household: string;
  members: number;
  under_five: number;
  high_risk: boolean;
  last_visit_at: string | null;
}

export interface MapState {
  selectedDistrictId: string | null;
  zoomLevel: number;
}

export type WsStatus = "disconnected" | "connecting" | "connected" | "error";

export interface BudgetScenarioInput {
  label: string;
  budgetMwk: number;
  district: string;
  commodity: string;
}

export interface BudgetScenarioOutput {
  requiredBudgetMwk: number;
  coverageBefore: number;
  coverageAfter: number;
  stockoutReductionPct: number;
  livesSaved: number;
  casesAverted: number;
  dalysAverted: number;
  costPerDalY: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district?: string;
}

export interface DashboardState {
  alerts: Alert[];
  districts: DistrictSummary[];
  trends: {
    actual: CaseTrend[];
    predicted: CaseTrend[];
    accuracy: { auc_roc: number; sensitivity: number; specificity: number } | null;
  } | null;
  forecast: {
    commodity_needs: CommodityForecast[];
    executive_summary: string;
  } | null;
  loading: boolean;
  error: string | null;
  selectedAlertId: string | null;
  chwPerformance: CHWPerformance[];
  chwHouseholds: Record<string, Household[]>;
  map: MapState;
  wsStatus: WsStatus;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
}

export interface ThemeState {
  darkMode: boolean;
}

export interface AppState {
  dashboard: DashboardState;
  auth: AuthState;
  theme: ThemeState;
}

export interface RiskMapDistrict {
  district_id: string;
  district_name: string;
  risk_score: number;
  alert_count: number;
}

export interface ColumnDef<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T & string)[];
  emptyMessage?: string;
}
