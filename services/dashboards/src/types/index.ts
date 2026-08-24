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

export type UserRole = "dho" | "mohp" | "chw" | "phim" | "supervisor";

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

/**
 * Facility registry domain model (Zipatala MHFR-derived). Fields the
 * backend does not serve yet stay `null` — the UI renders "Unverified"
 * rather than inventing values.
 */
export type RegistryFacilityType =
  | "district_hospital"
  | "community_hospital"
  | "health_centre"
  | "health_post"
  | "private";

export type RegistryFacilityStatus = "Functional" | "Partial" | "Not Functional" | "Closed";

export interface RegistryFacility {
  id: string;
  name: string;
  type: RegistryFacilityType;
  ownership: string | null;
  district: string;
  traditional_authority: string | null;
  latitude: number;
  longitude: number;
  operational_status: RegistryFacilityStatus | null;
  beds_total: number | null;
  beds_available: number | null;
  services: string[];
  last_verified: string | null;
  data_source: string;
  chw_verified: boolean;
  chw_verified_by: string | null;
  chw_verified_date: string | null;
  mhfrcode: string | null;
  dhis2code: string | null;
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
  color?: string;
}

export interface ReferralRequest {
  patient_lat: number;
  patient_lng: number;
  condition: string;
  intervention_required: string;
  urgency: "immediate" | "urgent" | "routine";
}

export interface ReferralResult {
  facility: RegistryFacility;
  distance_km: number;
  eta_minutes: number;
  score: number;
  capabilities_matched: boolean;
  beds_available: boolean;
  status_ok: boolean;
  recommended: boolean;
}

export type MapLayer =
  | "districts"
  | "facilities"
  | "chw_presence"
  | "community_pins"
  | "outbreak"
  | "rainfall"
  | "flood"
  | "temperature"
  | "vegetation"
  | "immunization"
  | "cold_chain"
  | "maternity"
  | "tba"
  | "supply_chain"
  | "nutrition"
  | "mental_health";

/* ================================================================== */
/* IMMUNIZATION MICRO-PLANNING (Part 6)                               */
/* ================================================================== */

export interface Village {
  village_id: string;
  name: string;
  ta_name: string;
  lat: number;
  lng: number;
  under5_population: number;
  dpt3_coverage: number;
  measles_coverage: number;
  pentavalent_coverage: number;
}

export interface ColdChainFacility {
  facility_id: string;
  name: string;
  lat: number;
  lng: number;
  fridge_status: "working" | "broken" | "none";
  last_temperature: number | null;
  solar_powered: boolean;
}

export interface OutreachRoute {
  route_id: string;
  label: string;
  stops: { lat: number; lng: number; village_name: string; unvaccinated_count: number }[];
  total_unvaccinated: number;
  estimated_hours: number;
}

/* ================================================================== */
/* MATERNAL & TBA INTEGRATION (Part 7)                                */
/* ================================================================== */

export interface MaternityWaitingHome {
  mwh_id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  status: "open" | "full" | "closed";
  linked_facility_id: string;
}

export interface TraditionalBirthAttendant {
  tba_id: string;
  name: string;
  lat: number;
  lng: number;
  years_experience: number;
  registered: boolean;
  linked_facility_id: string;
  village: string;
}

/* ================================================================== */
/* HEALTH WEATHER / SUPPLY CHAIN / NUTRITION (Part 9)                 */
/* ================================================================== */

export interface HealthWeatherBriefing {
  briefing_id: string;
  generated_at: string;
  district: string;
  risk_summary: string;
  action_items: string[];
  alert_level: "green" | "yellow" | "red";
}

export interface SupplyTruck {
  truck_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  heading: number;
  cargo: string;
  destination: string;
  eta_hours: number;
  temperature_breach: boolean;
  last_update: string;
}

export interface NutritionDataPoint {
  village_id: string;
  village_name: string;
  lat: number;
  lng: number;
  stunting_rate: number;
  wasting_rate: number;
  muac_screenings: number;
  rutf_needed: boolean;
}

/* ================================================================== */
/* REFERRAL ROUTING (map route lines)                                 */
/* ================================================================== */

export interface ReferralRoute {
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  road_status: "passable" | "flooded" | "4wd_only" | "blocked";
  distance_km: number;
  eta_minutes: number;
  recommended: boolean;
}
