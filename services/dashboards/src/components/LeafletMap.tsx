/**
 * MOYO MAP — Spatial Health Intelligence System
 *
 * The primary decision-making interface for Zisamale.
 * Integrates facility intelligence, CHW presence, community voice,
 * outbreak prediction, climate overlays, and smart referral routing.
 *
 * Tiles: OpenStreetMap raster tiles — free, no API key required.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Polygon,
} from "geojson";
import "leaflet/dist/leaflet.css";

import type {
  Facility,
  CHWLocation,
  CommunityPin,
  OutbreakPrediction,
  ClimateOverlayType,
  ReferralRequest,
  MapLayer,
  UserRole,
  DistrictRiskInput,
} from "../types";
import { createFacilityIcon } from "./map/FacilityIntelligenceMarker";
import { FacilityPanel } from "./map/FacilityPanel";
import { ReferralEngine } from "./map/ReferralEngine";
import { CHWPresenceLayer } from "./map/CHWPresenceLayer";
import { CommunityVoicePins } from "./map/CommunityVoicePins";
import { OutbreakTimeSlider } from "./map/OutbreakTimeSlider";
import { ClimateOverlayPanel } from "./map/ClimateOverlay";
import { MapToolbar } from "./map/MapToolbar";

/* ------------------------------------------------------------------ */
/* GeoJSON helpers (from original LeafletMap)                          */
/* ------------------------------------------------------------------ */

interface DistrictRiskProps {
  district_id: string;
  name: string;
  risk_score: number;
  facility_count: number;
}

type DistrictFeature = Feature<Polygon, DistrictRiskProps>;

const COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  nodata: "#94a3b8",
} as const;

function riskToColor(risk: number): string {
  if (risk < 0.3) return COLORS.green;
  if (risk < 0.6) return COLORS.yellow;
  if (risk < 0.8) return COLORS.orange;
  return COLORS.red;
}

function riskToLabel(risk: number): string {
  if (risk < 0.3) return "Low";
  if (risk < 0.6) return "Moderate";
  if (risk < 0.8) return "High";
  return "Critical";
}

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

const MALAWI_DISTRICTS_GEOJSON = buildSampleGeoJSON();

const DISTRICT_CENTERS: Record<string, [number, number]> = Object.fromEntries(
  DISTRICT_META.map((m) => [slugify(m.name), m.centroid])
);

function mergeRiskData(districts?: DistrictRiskInput[]): FeatureCollection<Polygon, DistrictRiskProps> {
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

/* ------------------------------------------------------------------ */
/* Map controller                                                     */
/* ------------------------------------------------------------------ */

export const MALAWI_CENTER: [number, number] = [-13.9625, 33.7741];
const DEFAULT_ZOOM = 7;
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function MapController({ zoom, selectedId }: { zoom: number; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => { map.setZoom(zoom); }, [map, zoom]);
  useEffect(() => {
    if (!selectedId) return;
    const center = DISTRICT_CENTERS[selectedId];
    if (center) map.flyTo(center, Math.max(zoom, 9), { duration: 0.8 });
  }, [map, selectedId, zoom]);
  return null;
}

function FacilityMarkers({ facilities, onSelect }: { facilities: Facility[]; onSelect: (f: Facility) => void }) {
  return (
    <>
      {facilities.map((facility) => (
        <Marker
          key={facility.facility_id}
          position={[facility.lat, facility.lng]}
          icon={createFacilityIcon(facility)}
          eventHandlers={{
            click: () => onSelect(facility),
          }}
        >
          <Popup>
            <strong>{facility.name}</strong>
            <br />
            {facility.facility_type.replace(/_/g, " ")}
            <br />
            {facility.status}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function CHWMarkers({ chws }: { chws: CHWLocation[] }) {
  return (
    <>
      {chws
        .filter((c) => c.presence_level !== "ghost" && c.lat != null && c.lng != null)
        .map((chw) => {
          const isStale = Math.round((Date.now() - new Date(chw.last_sync_at).getTime()) / 3600000) > 48;
          const isEmergency = chw.status === "emergency";
          const color = isEmergency ? "#c62828" : isStale ? "#e65100" : "#0f7b8a";

          return (
            <div key={chw.chw_id}>
              <Marker
                position={[chw.lat!, chw.lng!]}
                icon={L.divIcon({
                  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 ${isEmergency ? "12px" : "6px"} ${color}40;"></div>`,
                  className: "",
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                })}
              >
                <Popup>
                  <strong>{chw.chw_name}</strong><br />
                  {chw.ta_name}<br />
                  Visits today: {chw.visits_today}<br />
                  Last sync: {new Date(chw.last_sync_at).toLocaleString()}
                </Popup>
              </Marker>
            </div>
          );
        })}
    </>
  );
}

function CommunityPinMarkers({ pins }: { pins: CommunityPin[] }) {
  const COLORS: Record<string, string> = {
    dry_water_point: "#0f7b8a",
    drug_stockout: "#c62828",
    road_blocked: "#e65100",
    disease_report: "#c62828",
    good_news: "#2d7d46",
  };

  const ICONS: Record<string, string> = {
    dry_water_point: "💧",
    drug_stockout: "💊",
    road_blocked: "🚧",
    disease_report: "⚠️",
    good_news: "✅",
  };

  return (
    <>
      {pins.filter((p) => p.status !== "dismissed").map((pin) => (
        <Marker
          key={pin.pin_id}
          position={[pin.lat, pin.lng]}
          icon={L.divIcon({
            html: `<div style="width:24px;height:24px;border-radius:50%;background:${COLORS[pin.pin_type]};display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${ICONS[pin.pin_type]}</div>`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
        >
          <Popup>
            <strong>{pin.pin_type.replace(/_/g, " ")}</strong><br />
            {pin.description}<br />
            <em>{pin.village}</em> — {pin.status}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function OutbreakHeatLayer({ predictions, week }: { predictions: OutbreakPrediction[]; week: number }) {
  const weekPreds = predictions.filter((p) => p.week_offset === week);

  return (
    <>
      {weekPreds.map((pred, i) => {
        const size = Math.max(20, pred.risk_score * 80);
        const color = pred.risk_score > 0.7 ? "#c62828" : pred.risk_score > 0.4 ? "#e65100" : "#f9a825";
        return (
          <Marker
            key={`outbreak-${i}`}
            position={[pred.lat, pred.lng]}
            icon={L.divIcon({
              html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.4;animation:moyo-pulse 2s infinite;"></div>`,
              className: "",
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            })}
          >
            <Popup>
              {pred.disease} — Risk: {Math.round(pred.risk_score * 100)}%
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

function MapLegend() {
  const items = [
    { label: "Low (<30%)", color: COLORS.green },
    { label: "Moderate (30–60%)", color: COLORS.yellow },
    { label: "High (60–80%)", color: COLORS.orange },
    { label: "Critical (>80%)", color: COLORS.red },
    { label: "No data", color: COLORS.nodata },
  ];

  const facilityLegend = [
    { label: "District Hospital", color: "#1e40af" },
    { label: "Community Hospital", color: "#0f7b8a" },
    { label: "Health Centre", color: "#2d7d46" },
    { label: "Private", color: "#7c3aed" },
  ];

  return (
    <div className="map-legend" aria-label="Map legend">
      <div className="map-legend-section">
        <span className="map-legend-title">District Risk</span>
        {items.map((item) => (
          <span key={item.label} className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="map-legend-section">
        <span className="map-legend-title">Facilities</span>
        {facilityLegend.map((item) => (
          <span key={item.label} className="map-legend-item">
            <span className="map-legend-dot" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="map-legend-section">
        <span className="map-legend-title">Facility Status</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#22c55e" }} /> Operational</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#f59e0b" }} /> Partial</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#ef4444" }} /> Closed</span>
      </div>
      <div className="map-legend-section">
        <span className="map-legend-title">CHW Presence</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#0f7b8a" }} /> Active</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#e65100" }} /> Stale (&gt;48h)</span>
        <span className="map-legend-item"><span className="map-legend-dot" style={{ backgroundColor: "#c62828" }} /> Emergency</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export interface LeafletMapProps {
  districts?: DistrictRiskInput[];
  facilities?: Facility[];
  chws?: CHWLocation[];
  communityPins?: CommunityPin[];
  outbreakPredictions?: OutbreakPrediction[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  showLegend?: boolean;
  role?: UserRole;
  onSelectDistrict?: (props: DistrictRiskProps) => void;
  onRefer?: (facility: Facility) => void;
  onCall?: (facility: Facility) => void;
  onCheckInRequest?: (chwId: string) => void;
  onVerifyPin?: (pinId: string) => void;
  onDismissPin?: (pinId: string) => void;
  onReportPin?: (type: string) => void;
}

export function LeafletMap({
  districts,
  facilities = [],
  chws = [],
  communityPins = [],
  outbreakPredictions = [],
  center = MALAWI_CENTER,
  zoom = DEFAULT_ZOOM,
  height = 520,
  showLegend = true,
  role,
  onSelectDistrict,
  onRefer,
  onCall,
  onCheckInRequest,
  onVerifyPin,
  onDismissPin,
  onReportPin,
}: LeafletMapProps) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRiskProps | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [referralRequest, setReferralRequest] = useState<ReferralRequest | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(
    new Set(["districts", "facilities"])
  );
  const [predictionWeek, setPredictionWeek] = useState(0);
  const [activeClimateOverlays, setActiveClimateOverlays] = useState<Set<ClimateOverlayType>>(new Set());
  const [printMode, setPrintMode] = useState(false);

  const data = useMemo(() => mergeRiskData(districts), [districts]);

  const selectRef = useRef<(props: DistrictRiskProps) => void>(() => undefined);
  selectRef.current = (props) => {
    setSelectedDistrict(props);
    onSelectDistrict?.(props);
  };

  const onEachFeature = useCallback(
    (feature: DistrictFeature, layer: Layer) => {
      layer.bindPopup(`<strong>${feature.properties.name}</strong><br/>Risk: ${riskToLabel(feature.properties.risk_score)} (${Math.round(feature.properties.risk_score * 100)}%)<br/>Facilities: ${feature.properties.facility_count}`);
      layer.on("click", () => selectRef.current(feature.properties));
    },
    []
  );

  const styleFn = useCallback(
    (feature?: Feature<Geometry, DistrictRiskProps>): PathOptions => {
      const props = feature?.properties;
      const isSelected = !!props && props.district_id === selectedDistrict?.district_id;
      return {
        color: isSelected ? "#0284c7" : "#475569",
        weight: isSelected ? 3 : 1,
        fillColor: props ? riskToColor(props.risk_score) : COLORS.nodata,
        fillOpacity: 0.65,
      };
    },
    [selectedDistrict]
  );

  function toggleLayer(layer: MapLayer) {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }

  function toggleClimateOverlay(overlay: ClimateOverlayType) {
    setActiveClimateOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(overlay)) next.delete(overlay);
      else next.add(overlay);
      return next;
    });
  }

  const handlePrint = useCallback(() => {
    window.print();
    setPrintMode(true);
    setTimeout(() => setPrintMode(false), 1000);
  }, []);

  const handleExportSMS = useCallback(() => {
    const activeFacilities = facilities.filter((f) => f.status !== "closed");
    const topFacilities = activeFacilities.slice(0, 3).map((f) => {
      const beds = f.beds.reduce((s, b) => s + b.available, 0);
      const hasMgSO4 = f.stock.some((s) => s.commodity.toLowerCase().includes("mgso4") && s.status !== "critical");
      const road = f.roads.find((r) => r.route === "Primary");
      return `${f.name}: ${beds} beds, MgSO4 ${hasMgSO4 ? "YES" : "NO"}, Road ${road?.status.replace("_", " ") ?? "unknown"}`;
    });
    const sms = `Zisamale Health Status:\n${topFacilities.join("\n")}`;
    navigator.clipboard?.writeText(sms).then(() => alert("SMS summary copied to clipboard."));
  }, [facilities]);

  function handleSelectFacility(facility: Facility) {
    setReferralRequest(null);
    setSelectedFacility(null);
    onRefer?.(facility);
  }

  const referralFacilities = useMemo(() => {
    if (!referralRequest) return facilities;
    return facilities.filter((f) => f.status !== "closed");
  }, [referralRequest, facilities]);

  return (
    <div className={`leaflet-map moyo-map ${printMode ? "moyo-map--print" : ""}`}>
      <div className="moyo-map-header">
        <h2>Moyo Map — Spatial Health Intelligence</h2>
        <span className="moyo-map-subtitle">Real-time decision support for health delivery</span>
      </div>

      <div className="moyo-map-body">
        <div className="leaflet-map-container" style={{ position: "relative", height }}>
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

            {/* District risk choropleth */}
            {activeLayers.has("districts") && (
              <GeoJSON
                data={data}
                style={styleFn as (feature?: Feature<Geometry, GeoJsonProperties>) => PathOptions}
                onEachFeature={onEachFeature as (
                  feature: Feature<Geometry, GeoJsonProperties>,
                  layer: Layer
                ) => void}
              />
            )}

            {/* Facility intelligence markers */}
            {activeLayers.has("facilities") && (
              <FacilityMarkers facilities={facilities} onSelect={setSelectedFacility} />
            )}

            {/* CHW presence layer */}
            {activeLayers.has("chw_presence") && (
              <CHWMarkers chws={chws} />
            )}

            {/* Community voice pins */}
            {activeLayers.has("community_pins") && (
              <CommunityPinMarkers pins={communityPins} />
            )}

            {/* Outbreak prediction heat */}
            {activeLayers.has("outbreak预测") && (
              <OutbreakHeatLayer predictions={outbreakPredictions} week={predictionWeek} />
            )}

            <MapController zoom={zoom} selectedId={selectedDistrict?.district_id ?? null} />
          </MapContainer>

          {showLegend && <MapLegend />}

          {/* Toolbar overlay */}
          <MapToolbar
            activeLayers={activeLayers}
            onToggleLayer={toggleLayer}
            onPrint={handlePrint}
            onExportSMS={handleExportSMS}
            role={role}
          />

          {/* CHW Presence sidebar */}
          {activeLayers.has("chw_presence") && (
            <CHWPresenceLayer
              chws={chws}
              supervisorView={role === "dho" || role === "mohp"}
              onCheckInRequest={onCheckInRequest}
            />
          )}

          {/* Community Voice sidebar */}
          {activeLayers.has("community_pins") && (
            <CommunityVoicePins
              pins={communityPins}
              onVerify={onVerifyPin}
              onDismiss={onDismissPin}
              onReport={onReportPin as any}
            />
          )}

          {/* Climate overlay panel */}
          <ClimateOverlayPanel
            activeOverlays={activeClimateOverlays}
            onToggle={toggleClimateOverlay}
          />

          {/* Outbreak time slider */}
          {activeLayers.has("outbreak预测") && (
            <OutbreakTimeSlider
              predictions={outbreakPredictions}
              currentWeek={predictionWeek}
              onWeekChange={setPredictionWeek}
            />
          )}
        </div>
      </div>

      {/* Facility slide-out panel */}
      {selectedFacility && (
        <FacilityPanel
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          onRefer={() => {
            setReferralRequest({
              patient_lat: center[0],
              patient_lng: center[1],
              condition: "obstetric",
              intervention_required: "general",
              urgency: "urgent",
            });
            setSelectedFacility(null);
          }}
          onCall={onCall}
        />
      )}

      {/* Referral engine overlay */}
      {referralRequest && (
        <ReferralEngine
          request={referralRequest}
          facilities={referralFacilities}
          onSelectFacility={handleSelectFacility}
          onDismiss={() => setReferralRequest(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Re-export subcomponents for convenience                             */
/* ------------------------------------------------------------------ */
export { FacilityPanel } from "./map/FacilityPanel";
export { ReferralEngine } from "./map/ReferralEngine";
export { CHWPresenceLayer } from "./map/CHWPresenceLayer";
export { CommunityVoicePins } from "./map/CommunityVoicePins";
export { OutbreakTimeSlider } from "./map/OutbreakTimeSlider";
export { ClimateOverlayPanel } from "./map/ClimateOverlay";
export { MapToolbar } from "./map/MapToolbar";
