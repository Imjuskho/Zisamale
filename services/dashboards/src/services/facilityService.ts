/**
 * FACILITY SERVICE — offline-first facility data layer
 *
 * Single read path with two declared adapters:
 *   1. LIVE    — `api.getRegistryFacilities()` (authenticated, retrying)
 *   2. EMBEDDED— curated `public/data/facilities.json` snapshot
 *
 * The live API is tried first; any failure falls back to the embedded
 * dataset. No values are fabricated in either path.
 *
 * Data sources: Zipatala MHFR, DHIS2, OpenStreetMap/HDX
 */

import { api } from "./api";
import type { RegistryFacility, RegistryFacilityStatus, RegistryFacilityType } from "../types";

/* ── Types (canonical definitions live in types/index.ts) ───────── */

export type FacilityType = RegistryFacilityType;
export type FacilityStatus = RegistryFacilityStatus;
export type Facility = RegistryFacility;

/* ── Marker config ──────────────────────────────────────────────── */

export const FACILITY_CONFIG: Record<FacilityType, { color: string; size: number; label: string; strokeWidth: number }> = {
  district_hospital: { color: "#1565C0", size: 16, label: "DH", strokeWidth: 3 },
  community_hospital: { color: "#0F7B8A", size: 14, label: "CH", strokeWidth: 2.5 },
  health_centre: { color: "#2D7D46", size: 12, label: "HC", strokeWidth: 2 },
  health_post: { color: "#2D7D46", size: 10, label: "HP", strokeWidth: 2 },
  private: { color: "#7C3AED", size: 12, label: "P", strokeWidth: 2 },
};

export const STATUS_CONFIG: Record<FacilityStatus, { opacity: number; pulse: boolean }> = {
  Functional: { opacity: 1, pulse: false },
  Partial: { opacity: 0.75, pulse: false },
  "Not Functional": { opacity: 0.4, pulse: false },
  Closed: { opacity: 0.25, pulse: false },
};

/* ── Haversine distance ─────────────────────────────────────────── */

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Lazy-loaded data cache ─────────────────────────────────────── */

let _cache: Facility[] | null = null;
let _lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadFacilitiesData(): Promise<Facility[]> {
  if (_cache && Date.now() - _lastFetch < CACHE_TTL) return _cache;

  // Adapter 1: live API (real PostgreSQL registry)
  try {
    const facilities = await api.getRegistryFacilities();
    if (facilities.length > 0) {
      _cache = facilities;
      _lastFetch = Date.now();
      return facilities;
    }
  } catch {
    // API unavailable — fall through to the embedded dataset
  }

  // Adapter 2: embedded curated snapshot
  const mod = await import("../../public/data/facilities.json");
  _cache = mod.default as unknown as Facility[];
  _lastFetch = Date.now();
  return _cache;
}

/* ── Data access (returns Promise for lazy loading) ─────────────── */

export async function getFacilities(): Promise<Facility[]> {
  return loadFacilitiesData();
}

export function getFacilitiesSync(): Facility[] {
  return _cache || [];
}

export function getFacilitiesByDistrict(district: string): Facility[] {
  return getFacilitiesSync().filter((f) => f.district === district);
}

export function getFacilitiesByType(type: FacilityType): Facility[] {
  return getFacilitiesSync().filter((f) => f.type === type);
}

export function getNearestFacilities(
  lat: number,
  lng: number,
  type?: FacilityType,
  limit = 5,
): (Facility & { distance: number })[] {
  const all = getFacilitiesSync();
  const filtered = type ? all.filter((f) => f.type === type) : all;
  return filtered
    .map((f) => ({ ...f, distance: haversineDistance(lat, lng, f.latitude, f.longitude) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function getDistrictBounds(district: string): { north: number; south: number; east: number; west: number } | null {
  const facilities = getFacilitiesByDistrict(district);
  if (facilities.length === 0) return null;
  const lats = facilities.map((f) => f.latitude);
  const lngs = facilities.map((f) => f.longitude);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

export function getFacilityCounts(): Record<FacilityType, number> {
  const counts: Record<FacilityType, number> = { district_hospital: 0, community_hospital: 0, health_centre: 0, health_post: 0, private: 0 };
  for (const f of getFacilitiesSync()) {
    counts[f.type]++;
  }
  return counts;
}

export function getDistrictList(): string[] {
  const districts = new Set(getFacilitiesSync().map((f) => f.district));
  return [...districts].sort();
}
