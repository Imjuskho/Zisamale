/**
 * Interactive district risk map built on Leaflet + React-Leaflet.
 *
 * Tiles: OpenStreetMap raster tiles — free, no API key required.
 *
 * OFFLINE TILE CACHING
 * --------------------
 * Leaflet only caches tiles in memory for the current session. For
 * offline-first field deployments (DHO laptops, CHW tablets with
 * intermittent connectivity), persistent caching must happen at the
 * service-worker / HTTP-cache layer:
 *   1. Register a service worker (e.g. Workbox) that intercepts requests to
 *      `tile.openstreetmap.org` and serves them from CacheStorage with a
 *      cache-first strategy.
 *   2. Pre-warm that cache for Malawi's bounding box
 *      [[-17.25, 32.6], [-9.2, 36.0]] at zoom levels 6-10 (a few thousand
 *      tiles, well within CacheStorage quotas).
 *   3. Alternatively, host an MBTiles/tileserver-gl endpoint on the district
 *      LAN and pass `tileUrl="http://<lan-host>/tiles/{z}/{x}/{y}.png"`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Polygon,
} from "geojson";
import "leaflet/dist/leaflet.css";

export interface DistrictRiskProps {
  district_id: string;
  name: string;
  /** Composite risk score in [0, 1]. */
  risk_score: number;
  facility_count: number;
}

type DistrictFeature = Feature<Polygon, DistrictRiskProps>;

/** Input shape callers may use to override sample risk values by name. */
export interface DistrictRiskInput {
  district_id?: string;
  name: string;
  risk_score: number;
  facility_count?: number;
}

/* ------------------------------------------------------------------ */
/* Color scale                                                         */
/* ------------------------------------------------------------------ */

const COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  nodata: "#94a3b8",
} as const;

export function riskToColor(risk: number): string {
  if (risk < 0.3) return COLORS.green;
  if (risk < 0.6) return COLORS.yellow;
  if (risk < 0.8) return COLORS.orange;
  return COLORS.red;
}

export function riskToLabel(risk: number): string {
  if (risk < 0.3) return "Low";
  if (risk < 0.6) return "Moderate";
  if (risk < 0.8) return "High";
  return "Critical";
}

/* ------------------------------------------------------------------ */
/* Simplified sample GeoJSON for Malawi districts                      */
/* ------------------------------------------------------------------ */

interface DistrictMeta {
  name: string;
  centroid: [number, number];
  risk: number;
  facilities: number;
}

/**
 * Approximate district centroids and placeholder risk/facility figures.
 * Replace `risk`/`facilities` at runtime via the `districts` prop; replace
 * these coarse hexagon footprints with real GADM/OSM boundaries when a
 * boundaries endpoint is available (`GET /api/v1/districts/boundaries`).
 */
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
    points.push([
      lat + radius * Math.sin(angle),
      lon + radius * Math.cos(angle) * 0.85,
    ]);
  }
  points.push(points[0]); // close the ring
  return points;
}

function slugify(name: string): string {
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

export const MALAWI_DISTRICTS_GEOJSON = buildSampleGeoJSON();

const DISTRICT_CENTERS: Record<string, [number, number]> = Object.fromEntries(
  DISTRICT_META.map((m) => [slugify(m.name), m.centroid])
);

/** Merge caller-supplied risk data into the sample geometries by name. */
function mergeRiskData(districts?: DistrictRiskInput[]): FeatureCollection<Polygon, DistrictRiskProps> {
  if (!districts || districts.length === 0) return MALAWI_DISTRICTS_GEOJSON;
  const overrides = new Map(
    districts.map((d) => [d.name.toLowerCase(), d] as const)
  );
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
          ...(override.facility_count !== undefined
            ? { facility_count: override.facility_count }
            : {}),
        },
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Map helpers                                                         */
/* ------------------------------------------------------------------ */

export const MALAWI_CENTER: [number, number] = [-13.9625, 33.7741];
const DEFAULT_ZOOM = 7;

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function popupHtml(props: DistrictRiskProps): string {
  const pct = Math.round(props.risk_score * 100);
  return [
    `<strong>${props.name}</strong>`,
    `Risk: ${riskToLabel(props.risk_score)} (${pct}%)`,
    `Facilities: ${props.facility_count}`,
  ].join("<br/>");
}

function MapController({
  zoom,
  selectedId,
}: {
  zoom: number;
  selectedId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.setZoom(zoom);
  }, [map, zoom]);

  useEffect(() => {
    if (!selectedId) return;
    const center = DISTRICT_CENTERS[selectedId];
    if (center) map.flyTo(center, Math.max(zoom, 9), { duration: 0.8 });
  }, [map, selectedId, zoom]);

  return null;
}

export function MapLegend() {
  const items = [
    { label: "Low (<30%)", color: COLORS.green },
    { label: "Moderate (30\u201360%)", color: COLORS.yellow },
    { label: "High (60\u201380%)", color: COLORS.orange },
    { label: "Critical (>80%)", color: COLORS.red },
    { label: "No data", color: COLORS.nodata },
  ];
  return (
    <div
      className="map-legend"
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 8,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
      }}
      aria-label="Risk color legend"
    >
      {items.map((item) => (
        <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 13,
              height: 13,
              borderRadius: 3,
              backgroundColor: item.color,
              border: "1px solid #64748b",
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

interface LeafletMapProps {
  /** Risk overrides merged onto the sample Malawi geometries by name. */
  districts?: DistrictRiskInput[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  tileUrl?: string;
  showLegend?: boolean;
  onSelectDistrict?: (props: DistrictRiskProps) => void;
}

export function LeafletMap({
  districts,
  center = MALAWI_CENTER,
  zoom = DEFAULT_ZOOM,
  height = 480,
  tileUrl = OSM_TILE_URL,
  showLegend = true,
  onSelectDistrict,
}: LeafletMapProps) {
  const [selected, setSelected] = useState<DistrictRiskProps | null>(null);
  const data = useMemo(() => mergeRiskData(districts), [districts]);

  // Keep a stable onEachFeature binding (react-leaflet binds handlers once at
  // layer creation); route through a ref so callbacks never go stale.
  const selectRef = useRef<(props: DistrictRiskProps) => void>(() => undefined);
  selectRef.current = (props) => {
    setSelected(props);
    onSelectDistrict?.(props);
  };

  const onEachFeature = useCallback(
    (feature: DistrictFeature, layer: Layer) => {
      layer.bindPopup(popupHtml(feature.properties));
      layer.on("click", () => selectRef.current(feature.properties));
    },
    []
  );

  const styleFn = useCallback(
    (feature?: Feature<Geometry, DistrictRiskProps>): PathOptions => {
      const props = feature?.properties;
      const isSelected = !!props && props.district_id === selected?.district_id;
      return {
        color: isSelected ? "#0284c7" : "#475569",
        weight: isSelected ? 3 : 1,
        fillColor: props ? riskToColor(props.risk_score) : COLORS.nodata,
        fillOpacity: 0.65,
      };
    },
    [selected]
  );

  function handleInfoPanelDismiss() {
    setSelected(null);
  }

  return (
    <div className="leaflet-map">
      <h2>District Risk Map</h2>
      <div style={{ position: "relative", height }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url={tileUrl} attribution={OSM_ATTRIBUTION} />
          <GeoJSON
            data={data}
            style={styleFn as (feature?: Feature<Geometry, GeoJsonProperties>) => PathOptions}
            onEachFeature={
              onEachFeature as (
                feature: Feature<Geometry, GeoJsonProperties>,
                layer: Layer
              ) => void
            }
          />
          <MapController zoom={zoom} selectedId={selected?.district_id ?? null} />
        </MapContainer>
        {showLegend && <MapLegend />}
        {selected && (
          <div
            className="map-info-panel"
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 1000,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 8,
              padding: "10px 14px",
              minWidth: 180,
              fontSize: 13,
              lineHeight: 1.5,
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }}
          >
            <strong>{selected.name}</strong>
            <br />
            Risk level: {riskToLabel(selected.risk_score)} (
            {Math.round(selected.risk_score * 100)}%)
            <br />
            Facilities: {selected.facility_count}
            <br />
            <button
              type="button"
              onClick={handleInfoPanelDismiss}
              style={{ marginTop: 6, fontSize: 12 }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
