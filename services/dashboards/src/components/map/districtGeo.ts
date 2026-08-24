/**
 * DISTRICT GEO — Malawi district geometry, sample fabric, and view constants.
 *
 * Everything the map needs to draw districts and fly between them lives
 * here, so LeafletMap.tsx can stay an orchestrator instead of a data file.
 */
import type {
  Feature,
  FeatureCollection,
  Polygon,
} from "geojson";
import type { DistrictRiskInput } from "../../types";

export interface DistrictRiskProps {
  district_id: string;
  name: string;
  risk_score: number;
  facility_count: number;
}

export type DistrictFeature = Feature<Polygon, DistrictRiskProps>;

interface DistrictMeta {
  name: string;
  centroid: [number, number];
  risk: number;
  facilities: number;
}

const DISTRICT_META: DistrictMeta[] = [
  { name: "Chitipa", centroid: [-10.05, 33.3], risk: 0.22, facilities: 18 },
  { name: "Karonga", centroid: [-9.93, 33.93], risk: 0.35, facilities: 21 },
  { name: "Rumphi", centroid: [-11.02, 33.9], risk: 0.28, facilities: 16 },
  { name: "Mzimba", centroid: [-11.9, 33.6], risk: 0.41, facilities: 34 },
  { name: "Nkhata Bay", centroid: [-11.6, 34.3], risk: 0.31, facilities: 14 },
  { name: "Likoma", centroid: [-12.05, 34.73], risk: 0.18, facilities: 4 },
  { name: "Kasungu", centroid: [-13.03, 33.48], risk: 0.52, facilities: 29 },
  { name: "Nkhotakota", centroid: [-12.9, 34.3], risk: 0.57, facilities: 19 },
  { name: "Ntchisi", centroid: [-13.5, 33.9], risk: 0.44, facilities: 12 },
  { name: "Dowa", centroid: [-13.65, 33.93], risk: 0.49, facilities: 17 },
  { name: "Salima", centroid: [-13.8, 34.45], risk: 0.63, facilities: 20 },
  { name: "Lilongwe", centroid: [-13.97, 33.77], risk: 0.71, facilities: 52 },
  { name: "Mchinji", centroid: [-13.75, 32.95], risk: 0.38, facilities: 15 },
  { name: "Dedza", centroid: [-14.3, 34.3], risk: 0.55, facilities: 22 },
  { name: "Ntcheu", centroid: [-14.85, 34.6], risk: 0.47, facilities: 18 },
  { name: "Mangochi", centroid: [-14.5, 35.3], risk: 0.82, facilities: 27 },
  { name: "Balaka", centroid: [-14.9, 34.95], risk: 0.66, facilities: 13 },
  { name: "Machinga", centroid: [-15.05, 35.5], risk: 0.74, facilities: 23 },
  { name: "Zomba", centroid: [-15.4, 35.3], risk: 0.69, facilities: 26 },
  { name: "Phalombe", centroid: [-15.72, 35.7], risk: 0.77, facilities: 14 },
  { name: "Chiradzulu", centroid: [-15.68, 35.15], risk: 0.61, facilities: 11 },
  { name: "Blantyre", centroid: [-15.8, 35.0], risk: 0.84, facilities: 41 },
  { name: "Thyolo", centroid: [-16.1, 35.1], risk: 0.79, facilities: 24 },
  { name: "Mulanje", centroid: [-16.0, 35.6], risk: 0.86, facilities: 25 },
  { name: "Mwanza", centroid: [-16.0, 34.5], risk: 0.42, facilities: 8 },
  { name: "Neno", centroid: [-15.5, 34.55], risk: 0.51, facilities: 10 },
  { name: "Chikwawa", centroid: [-16.3, 34.8], risk: 0.88, facilities: 19 },
  { name: "Nsanje", centroid: [-16.9, 35.0], risk: 0.92, facilities: 16 },
];

function hexRing([lat, lon]: [number, number], radius = 0.26): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push([lat + radius * Math.sin(angle), lon + radius * Math.cos(angle) * 0.85]);
  }
  points.push(points[0]);
  return points;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function buildSampleGeoJSON(): FeatureCollection<Polygon, DistrictRiskProps> {
  return {
    type: "FeatureCollection",
    features: DISTRICT_META.map((meta, index) => ({
      type: "Feature",
      id: `mw-${index}`,
      geometry: { type: "Polygon", coordinates: [hexRing(meta.centroid)] },
      properties: {
        district_id: slugify(meta.name),
        name: meta.name,
        risk_score: meta.risk,
        facility_count: meta.facilities,
      },
    })),
  };
}

const MALAWI_DISTRICTS_GEOJSON = buildSampleGeoJSON();

/** Bounding boxes per district (slug → [[south,west],[north,east]]) for card→map fly-to. */
export const DISTRICT_BOUNDS: Record<string, [[number, number], [number, number]]> = (() => {
  const bounds: Record<string, [[number, number], [number, number]]> = {};
  for (const feature of MALAWI_DISTRICTS_GEOJSON.features) {
    let south = 90;
    let north = -90;
    let west = 180;
    let east = -180;
    for (const [lat, lng] of feature.geometry.coordinates[0]) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
    bounds[feature.properties.district_id] = [
      [south, west],
      [north, east],
    ];
  }
  return bounds;
})();

export function mergeRiskData(
  districts?: DistrictRiskInput[]
): FeatureCollection<Polygon, DistrictRiskProps> {
  if (!districts || districts.length === 0) return MALAWI_DISTRICTS_GEOJSON;
  const overrides = new Map(districts.map((d) => [d.name.toLowerCase(), d] as const));
  return {
    ...MALAWI_DISTRICTS_GEOJSON,
    features: MALAWI_DISTRICTS_GEOJSON.features.map((feature) => {
      const override = overrides.get(feature.properties.name.toLowerCase());
      if (!override) return feature;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...(override.district_id ? { district_id: override.district_id } : {}),
          risk_score: override.risk_score,
          ...(override.facility_count !== undefined ? { facility_count: override.facility_count } : {}),
        },
      };
    }),
  };
}

/* ── View constants ─────────────────────────────────────────────── */

export const MALAWI_CENTER: [number, number] = [-13.9625, 33.7741];
export const DEFAULT_ZOOM = 7;

/**
 * Live climate pipeline: overlays derive from the climate_daily table via
 * GET /api/v1/map/climate-overlays and are fetched on first toggle.
 */
export const CLIMATE_DATA_LIVE = true;
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
