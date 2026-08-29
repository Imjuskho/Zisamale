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
  region?: string | null;
  malaria_risk_level: "low" | "medium" | "high" | null;
  active_alerts: number;
  stockout_count: number | null;
  maternal_mortality_ratio: number | null;
  under5_mortality_rate: number | null;
  essential_service_coverage: number | null;
  facility_count?: number | null;
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

// ── Surveillance honesty: provenance + freshness on data payloads ──

export type DataSourceKind = "dhis2" | "ichis" | "lmis" | "chw" | "climate";

export type FreshnessScore = "live" | "recent" | "stale" | "historic";

export interface DataSourceMeta {
  source: DataSourceKind;
  /** ISO8601 of the newest underlying record; null = never synced. */
  last_sync_at: string | null;
  record_count: number;
  expected_count: number;
  freshness_score: FreshnessScore;
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

/* ================================================================== */
/* SAMALA-AI: KNOWLEDGE TRANSLATION & SELF-CARE                       */
/* ================================================================== */

export type HealthTopic =
  | "hiv"
  | "malaria"
  | "maternal_health"
  | "child_health"
  | "nutrition"
  | "diarrhea"
  | "pneumonia"
  | "mental_health"
  | "ncd"
  | "family_planning"
  | "acute_poisoning"
  | "tb"
  | "digital_health";

export type AssetType =
  | "chw_brief"
  | "video"
  | "audio"
  | "poster"
  | "flipbook"
  | "sms"
  | "infographic"
  | "community_talk";

export type ContentSeverity = "info" | "warning" | "emergency";

export type StudyStatus = "discovered" | "under_review" | "approved" | "synthesized" | "deployed";

export type ConsentStatus = "pending" | "granted" | "denied" | "withdrawn";

export type DeploymentMethod =
  | "home_visit"
  | "community_meeting"
  | "clinic"
  | "school"
  | "radio"
  | "sms"
  | "poster";

export interface ResearchStudy {
  study_id: string;
  title: string;
  authors: string[];
  journal: string | null;
  doi: string | null;
  publication_year: number | null;
  study_design: string | null;
  sample_size: number | null;
  study_period_start: string | null;
  study_period_end: string | null;
  patient_demographics: Record<string, unknown> | null;
  key_statistical_findings: Array<Record<string, unknown>> | null;
  limitations: string[] | null;
  references_cited: string[] | null;
  study_district: string | null;
  study_ta: string | null;
  health_topic: HealthTopic;
  audience: string | null;
  consent_status: ConsentStatus;
  status: StudyStatus;
  discovered_at: string | null;
}

export interface KnowledgeAsset {
  asset_id: string;
  study_id: string | null;
  title: string;
  title_chichewa: string | null;
  key_finding: string;
  key_finding_chichewa: string | null;
  actionable_takeaways: string[];
  actionable_takeaways_chichewa: string[];
  evidence_refs: Array<Record<string, unknown>>;
  asset_type: AssetType;
  health_topic: HealthTopic;
  audience: string | null;
  severity: ContentSeverity;
  media_url: string | null;
  audio_url: string | null;
  poster_url: string | null;
  confidence_level: string | null;
  status: "draft" | "review" | "approved" | "deployed";
  synthesized_at: string | null;
}

export interface KnowledgeDeployment {
  deployment_id: string;
  asset_id: string;
  chw_id: string | null;
  delivery_method: DeploymentMethod;
  households_reached: number;
  individuals_reached: number;
  deployed_at: string | null;
  knowledge_pre_score: number | null;
  knowledge_post_score: number | null;
  behavior_change_score: number | null;
  cases_identified: number;
  referrals_made: number;
  outcomes_tracked: Record<string, unknown>;
}

export interface SelfCareGuide {
  guide_id: string;
  title: string;
  title_chichewa: string | null;
  category: HealthTopic;
  audience: string | null;
  severity: ContentSeverity;
  what_it_is: string | null;
  what_it_is_chichewa: string | null;
  what_to_do_now: string[];
  what_to_do_now_chichewa: string[];
  what_not_to_do: string[];
  what_not_to_do_chichewa: string[];
  when_to_seek_help: string | null;
  when_to_seek_help_chichewa: string | null;
  prevention: string[];
  prevention_chichewa: string[];
  treatment_limitations: string[];
  treatment_limitations_chichewa: string[];
  clinical_decision_points: Array<Record<string, unknown>>;
  clinical_decision_points_chichewa: Array<Record<string, unknown>>;
  illustration_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  source: string | null;
  last_reviewed: string | null;
}

export interface CommunityHealthTalk {
  talk_id: string;
  title: string;
  title_chichewa: string | null;
  study_id: string | null;
  duration_minutes: number;
  talking_points: string[];
  talking_points_chichewa: string[];
  discussion_questions: string[];
  pledge_card_text: string | null;
  pledge_card_text_chichewa: string | null;
  health_topic: HealthTopic;
  status: "draft" | "review" | "approved";
}

export interface SAMALASummary {
  total_studies: number;
  studies_by_status: Record<string, number>;
  total_assets: number;
  assets_by_type: Record<string, number>;
  total_deployments: number;
  households_reached: number;
  avg_knowledge_change: number | null;
  topic_coverage: Record<string, number>;
  total_referrals: number;
}

export type MHReferralStatus =
  | "identified"
  | "referred"
  | "in_care"
  | "followed_up"
  | "resolved"
  | "lost_to_followup";

export interface MentalHealthReferral {
  referral_id: string;
  study_id: string | null;
  asset_id: string | null;
  deployment_id: string | null;
  individual_name: string | null;
  age: number | null;
  sex: string | null;
  village_name: string | null;
  ta_name: string | null;
  district: string | null;
  risk_factors: string[];
  trigger_event: string | null;
  presenting_concern: string | null;
  referred_to: string | null;
  referral_date: string | null;
  follow_up_date: string | null;
  outcome: string | null;
  status: MHReferralStatus;
  chw_id: string | null;
  created_at: string | null;
}

export interface TopicSummary {
  health_topic: string;
  study_count: number;
  asset_count: number;
  asset_types: Record<string, number>;
  guide_count: number;
  talk_count: number;
  deployment_count: number;
  households_reached: number;
}

export interface DeploymentHeatmapCell {
  district_id: string;
  district_name: string;
  deployment_count: number;
  households_reached: number;
  individuals_reached: number;
  delivery_methods: Record<string, number>;
}

export interface ImpactTrajectoryPoint {
  deployment_id: string;
  asset_id: string;
  deployed_at: string | null;
  pre_score: number;
  post_score: number;
  delta: number;
  behavior_change_score: number | null;
  district_id: string | null;
  delivery_method: string;
}

export interface PipelineNode {
  id: string;
  label: string;
  type: "study" | "asset" | "deployment";
  status?: string;
  topic?: string;
  asset_type?: string;
}

export interface PipelineLink {
  source: string;
  target: string;
  value: number;
}

export interface ContextualAssetsResponse {
  household_id: string;
  matched_assets: KnowledgeAsset[];
  matched_guides: SelfCareGuide[];
  topic_hints: string[];
}

export interface TalkPrintKit {
  title: string;
  title_chichewa: string | null;
  topic: string;
  duration_minutes: number;
  source_study: { title: string | null; authors: string[]; journal: string | null } | null;
  talking_points: string[];
  talking_points_chichewa: string[];
  discussion_questions: string[];
  pledge_card_text: string | null;
  pledge_card_text_chichewa: string | null;
}

export interface GuidePosterData {
  title: string;
  title_chichewa: string | null;
  category: string;
  severity: string;
  what_it_is: string | null;
  what_it_is_chichewa: string | null;
  what_to_do_now: string[];
  what_to_do_now_chichewa: string[];
  what_not_to_do: string[];
  what_not_to_do_chichewa: string[];
  when_to_seek_help: string | null;
  when_to_seek_help_chichewa: string | null;
  prevention: string[];
  prevention_chichewa: string[];
}

export interface FlipbookPage {
  page_number: number;
  type: "talking_point" | "discussion_question" | "pledge_card";
  content_en: string;
  content_ny: string;
}

export interface TalkFlipbookData {
  title: string;
  title_chichewa: string | null;
  topic: string;
  total_pages: number;
  pages: FlipbookPage[];
}

export interface MonthlyBrief {
  period: string;
  pipeline: { studies_total: number; studies_deployed: number; assets_total: number; guides_total: number; talks_total: number };
  reach: { deployments: number; households_reached: number; individuals_reached: number };
  impact: { avg_knowledge_change: number; assessments_count: number };
  topic_coverage: Record<string, number>;
  top_topics: Array<[string, number]>;
}
