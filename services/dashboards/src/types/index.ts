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

export interface DistrictRiskInput {
  district_id?: string;
  name: string;
  risk_score: number;
  facility_count?: number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T & string)[];
  emptyMessage?: string;
}

/* ================================================================== */
/* MOYO MAP — Spatial Health Intelligence Types                       */
/* ================================================================== */

export type FacilityType = "district_hospital" | "community_hospital" | "health_centre" | "health_post" | "private";

export type FacilityStatus = "operational" | "partial" | "closed";

export type StaffPresence = "present" | "on_break" | "absent";

export interface FacilityStaff {
  role: string;
  name: string;
  status: StaffPresence;
}

export interface FacilityBed {
  ward: string;
  available: number;
  total: number;
}

export interface FacilityStock {
  commodity: string;
  level: number;
  status: "good" | "amber" | "critical";
}

export interface RoadCondition {
  route: string;
  status: "passable" | "flooded" | "4wd_only" | "blocked";
  note?: string;
}

export interface Facility {
  facility_id: string;
  name: string;
  facility_type: FacilityType;
  lat: number;
  lng: number;
  status: FacilityStatus;
  beds: FacilityBed[];
  stock: FacilityStock[];
  staff: FacilityStaff[];
  roads: RoadCondition[];
  emergency_receiving?: boolean;
  last_updated: string;
  phone?: string;
}

export type CHWPresenceLevel = "ghost" | "area" | "precise";

export interface CHWLocation {
  chw_id: string;
  chw_name: string;
  lat: number | null;
  lng: number | null;
  ta_name: string;
  last_sync_at: string;
  presence_level: CHWPresenceLevel;
  visits_today: number;
  status: "active" | "stale" | "emergency";
}

export type CommunityPinType =
  | "dry_water_point"
  | "drug_stockout"
  | "road_blocked"
  | "disease_report"
  | "good_news";

export type CommunityPinStatus = "pending" | "verified" | "dismissed";

export interface CommunityPin {
  pin_id: string;
  pin_type: CommunityPinType;
  description: string;
  lat: number;
  lng: number;
  village: string;
  status: CommunityPinStatus;
  reported_at: string;
  verified_by?: string;
}

export interface OutbreakPrediction {
  week_offset: number;
  lat: number;
  lng: number;
  risk_score: number;
  disease: string;
}

export type ClimateOverlayType = "rainfall" | "flood" | "temperature" | "vegetation";

export interface ClimateOverlay {
  overlay_type: ClimateOverlayType;
  lat: number;
  lng: number;
  value: number;
  label: string;
}

export interface ReferralRequest {
  patient_lat: number;
  patient_lng: number;
  condition: string;
  intervention_required: string;
  urgency: "immediate" | "urgent" | "routine";
}

export interface ReferralResult {
  facility: Facility;
  distance_km: number;
  eta_minutes: number;
  road_status: RoadCondition;
  score: number;
  capabilities_matched: boolean;
  beds_available: boolean;
  stock_available: boolean;
  staff_present: boolean;
  recommended: boolean;
}

export type MapLayer =
  | "districts"
  | "facilities"
  | "chw_presence"
  | "community_pins"
  | "outbreak预测"
  | "rainfall"
  | "flood"
  | "temperature"
  | "immunization"
  | "maternity";
