/** Types for the /api/v1/public seam — deliberately narrow, family-facing
 * shapes that mirror what the router actually serves. */

export interface PublicGuide {
  guide_id: string;
  title: string;
  title_chichewa: string | null;
  category: string;
  audience: string | null;
  severity: "info" | "warning" | "emergency";
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
  illustration_url: string | null;
  audio_url: string | null;
  updated_at: string | null;
}

export type PublicRiskLevel = "low" | "medium" | "high" | null;

export interface PublicDistrict {
  district_id: string;
  district_name: string;
  region: string | null;
  facility_count: number;
  risk_level: PublicRiskLevel;
  active_alerts: number;
}

export interface PublicFacility {
  facility_id: string;
  name: string;
  facility_type: string;
  latitude: number | null;
  longitude: number | null;
  has_maternity: boolean;
  has_lab: boolean;
  has_pharmacy: boolean;
  catchment_population: number | null;
  district_name: string | null;
}

export interface PublicGuideList {
  guides: PublicGuide[];
  source: string;
}

export interface PublicGuideEnvelope {
  guide: PublicGuide;
  source: string;
}

export interface PublicDistrictList {
  districts: PublicDistrict[];
  source: string;
  cached_at?: number;
}

export interface PublicFacilityList {
  facilities: PublicFacility[];
  source: string;
}