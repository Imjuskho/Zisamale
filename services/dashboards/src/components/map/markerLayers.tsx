/**
 * MARKER LAYERS — one module per map layer family, all behind the same
 * shape: data in, react-leaflet elements out. No fetching, no global state;
 * LeafletMap composes them.
 */
import { Marker, Popup, CircleMarker, Tooltip, Polyline } from "react-leaflet";
import L from "leaflet";

import type {
  CHWLocation,
  ClimateOverlay,
  ClimateOverlayType,
  CommunityPin,
  ColdChainFacility,
  MaternityWaitingHome,
  NutritionDataPoint,
  OutbreakPrediction,
  ReferralRoute,
  SupplyTruck,
  TraditionalBirthAttendant,
  Village,
} from "../../types";
import type { Facility } from "../../services/facilityService";
import { createSimpleFacilityIcon } from "./FacilityIntelligenceMarker";
import { FacilityPopupHTML } from "./FacilityPopup";
import { humanize } from "../../utils/text";

// ── Facilities (live registry) ─────────────────────────────────────

export function FacilityMarkers({
  facilities,
  districtFilter,
}: {
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  /** When set (district name), facilities outside it are dimmed. */
  districtFilter?: string | null;
}) {
  if (facilities.length === 0) return null;

  const filter = districtFilter?.toLowerCase() ?? null;

  return (
    <>
      {facilities.map((facility) => {
        const isActive = !filter || facility.district.toLowerCase() === filter;
        const icon = isActive
          ? createSimpleFacilityIcon(facility)
          : createSimpleFacilityIcon(facility, { className: "facility-marker--dimmed" });
        return (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
            icon={icon}
            zIndexOffset={isActive ? 400 : 0}
          >
            <Popup maxWidth={320} className="facility-popup">
              <div dangerouslySetInnerHTML={{ __html: FacilityPopupHTML(facility) }} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// ── CHW presence ───────────────────────────────────────────────────

export function chwDotColor(chw: CHWLocation): string {
  const isStale =
    Math.round((Date.now() - new Date(chw.last_sync_at).getTime()) / 3600000) > 48;
  if (chw.status === "emergency") return "#c62828";
  return isStale ? "#e65100" : "#0f7b8a";
}

export function CHWMarkers({ chws }: { chws: CHWLocation[] }) {
  return (
    <>
      {chws
        .filter((c) => c.presence_level !== "ghost" && c.lat != null && c.lng != null)
        .map((chw) => {
          const color = chwDotColor(chw);
          const isEmergency = chw.status === "emergency";

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

// ── Community voice pins ───────────────────────────────────────────

const PIN_COLORS: Record<string, string> = {
  dry_water_point: "#0f7b8a",
  drug_stockout: "#c62828",
  road_blocked: "#e65100",
  disease_report: "#c62828",
  good_news: "#2d7d46",
};

const PIN_ICONS: Record<string, string> = {
  dry_water_point: "W",
  drug_stockout: "Rx",
  road_blocked: "X",
  disease_report: "!",
  good_news: "OK",
};

export function CommunityPinMarkers({ pins }: { pins: CommunityPin[] }) {
  return (
    <>
      {pins.filter((p) => p.status !== "dismissed").map((pin) => (
        <Marker
          key={pin.pin_id}
          position={[pin.lat, pin.lng]}
          icon={L.divIcon({
            html: `<div style="width:24px;height:24px;border-radius:50%;background:${PIN_COLORS[pin.pin_type]};display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${PIN_ICONS[pin.pin_type]}</div>`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
        >
          <Popup>
            <strong>{humanize(pin.pin_type)}</strong><br />
            {pin.description}<br />
            <em>{pin.village}</em> — {humanize(pin.status)}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Outbreak prediction heat ───────────────────────────────────────

export function outbreakColor(riskScore: number): string {
  return riskScore > 0.7 ? "#c62828" : riskScore > 0.4 ? "#e65100" : "#f9a825";
}

export function OutbreakHeatLayer({
  predictions,
  week,
}: {
  predictions: OutbreakPrediction[];
  week: number;
}) {
  const weekPreds = predictions.filter((p) => p.week_offset === week);

  return (
    <>
      {weekPreds.map((pred, i) => {
        const size = Math.max(20, pred.risk_score * 80);
        const color = outbreakColor(pred.risk_score);
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

// ── Referral routes ────────────────────────────────────────────────

export function ReferralRouteLines({ routes }: { routes: ReferralRoute[] }) {
  return (
    <>
      {routes.map((route, i) => {
        const color = route.recommended ? "#2d7d46" : route.road_status === "passable" ? "#666" : "#c62828";

        return (
          <div key={`route-${i}`}>
            <Marker
              position={[route.from_lat, route.from_lng]}
              icon={L.divIcon({
                html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color}80;"></div>`,
                className: "",
                iconSize: [12, 12],
                iconAnchor: [6, 6],
              })}
            />
            <Marker
              position={[route.to_lat, route.to_lng]}
              icon={L.divIcon({
                html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;"></div>`,
                className: "",
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              })}
            />
          </div>
        );
      })}
    </>
  );
}

// ── Climate overlays ───────────────────────────────────────────────

const OVERLAY_RADIUS_PX: Record<ClimateOverlayType, (value: number) => number> = {
  rainfall: (v) => Math.round(Math.min(26, Math.max(8, 6 + v / 10))),
  flood: (v) => Math.round(8 + v * 18),
  temperature: (v) => Math.round(Math.min(24, Math.max(8, (v - 15) * 1.6))),
  vegetation: (v) => Math.round(Math.max(7, v * 22)),
};

export function ClimateOverlayCircles({
  data,
  active,
}: {
  data: Partial<Record<ClimateOverlayType, ClimateOverlay[]>>;
  active: Set<ClimateOverlayType>;
}) {
  const points = Array.from(active).flatMap((type) => data[type] ?? []);
  return (
    <>
      {points.map((point, i) => {
        const color = point.color ?? "#1e40af";
        return (
          <CircleMarker
            key={`${point.overlay_type}-${i}`}
            center={[point.lat, point.lng]}
            radius={OVERLAY_RADIUS_PX[point.overlay_type](point.value)}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 1 }}
          >
            <Tooltip direction="top">{point.label}</Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Supply chain ───────────────────────────────────────────────────

export function SupplyTruckMarkers({ trucks }: { trucks: SupplyTruck[] }) {
  return (
    <>
      {trucks.map((truck) => (
        <Marker
          key={truck.truck_id}
          position={[truck.lat, truck.lng]}
          icon={L.divIcon({
            html: `<div style="width:22px;height:22px;border-radius:4px;background:${truck.temperature_breach ? "#c62828" : "#2d7d46"};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;font-family:Inter,sans-serif;">T</div>`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
        >
          <Popup>
            <strong>{truck.driver_name}</strong><br />
            → {truck.destination}<br />
            ETA: {truck.eta_hours}h<br />
            Cargo: {truck.cargo}<br />
            {truck.temperature_breach && <span style={{ color: "#c62828" }}>⚠ Temperature breach!</span>}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Nutrition surveillance ─────────────────────────────────────────

export function NutritionMarkers({ data }: { data: NutritionDataPoint[] }) {
  return (
    <>
      {data.filter((d) => d.stunting_rate >= 0.3).map((dp) => (
        <Marker
          key={dp.village_id}
          position={[dp.lat, dp.lng]}
          icon={L.divIcon({
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#e65100;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>
            <strong>{dp.village_name}</strong><br />
            Stunting: {Math.round(dp.stunting_rate * 100)}%<br />
            Wasting: {Math.round(dp.wasting_rate * 100)}%<br />
            {dp.rutf_needed && <span style={{ color: "#e65100" }}>RUTF needed</span>}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Maternity waiting homes ────────────────────────────────────────

export function maternityHomeColor(status: string): string {
  return status === "open" ? "#0f7b8a" : status === "full" ? "#e65100" : "#999";
}

export function MaternityHomeMarkers({ homes }: { homes: MaternityWaitingHome[] }) {
  return (
    <>
      {homes.map((home) => (
        <Marker
          key={home.mwh_id}
          position={[home.lat, home.lng]}
          icon={L.divIcon({
            html: `<div style="width:20px;height:20px;border-radius:50%;background:${maternityHomeColor(home.status)};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;">H</div>`,
            className: "",
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })}
        >
          <Popup>
            <strong>{home.name}</strong><br />
            Status: {humanize(home.status)}<br />
            {home.occupied}/{home.capacity} occupied
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Traditional birth attendants ───────────────────────────────────

export function TBAMarkers({ tbas }: { tbas: TraditionalBirthAttendant[] }) {
  return (
    <>
      {tbas.filter((t) => t.registered).map((tba) => (
        <Marker
          key={tba.tba_id}
          position={[tba.lat, tba.lng]}
          icon={L.divIcon({
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#0f7b8a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;">TBA</div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })}
        >
          <Popup>
            <strong>{tba.name}</strong><br />
            {tba.village}<br />
            {tba.years_experience} years experience
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── Immunization micro-planning ────────────────────────────────────

export function villageCoverageColor(dpt3Coverage: number): string {
  return dpt3Coverage < 0.4 ? "#c62828" : dpt3Coverage < 0.65 ? "#e65100" : "#2d7d46";
}

export function ImmunizationRoutes({
  villages,
  outreachRoutes,
}: {
  villages: Village[];
  outreachRoutes: import("../../types").OutreachRoute[];
}) {
  return (
    <>
      {outreachRoutes.map((route) => (
        <Polyline
          key={route.route_id}
          positions={route.stops.map((s) => [s.lat, s.lng])}
          pathOptions={{ color: "#2d7d46", weight: 2, dashArray: "6 6", opacity: 0.8 }}
        >
          <Tooltip sticky>
            {route.label} — {route.total_unvaccinated} unvaccinated, ~{route.estimated_hours}h
          </Tooltip>
        </Polyline>
      ))}
      {villages.map((v) => {
        const color = villageCoverageColor(v.dpt3_coverage);
        return (
          <CircleMarker
            key={v.village_id}
            center={[v.lat, v.lng]}
            radius={Math.max(6, Math.min(14, Math.sqrt(v.under5_population) / 3))}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 1 }}
          >
            <Popup>
              <strong>{v.name}</strong><br />
              TA {v.ta_name}<br />
              DPT3: {Math.round(v.dpt3_coverage * 100)}% · Measles: {Math.round(v.measles_coverage * 100)}%<br />
              Under-5 pop (est): {v.under5_population}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Cold chain ─────────────────────────────────────────────────────

export function fridgeStatusColor(status: string): string {
  return status === "working" ? "#2d7d46" : status === "broken" ? "#c62828" : "#999";
}

export function ColdChainMarkers({ units }: { units: ColdChainFacility[] }) {
  return (
    <>
      {units.map((unit) => {
        const bg = fridgeStatusColor(unit.fridge_status);
        return (
          <Marker
            key={`cc-${unit.facility_id}-${unit.name}`}
            position={[unit.lat, unit.lng]}
            icon={L.divIcon({
              html: `<div style="width:20px;height:20px;border-radius:4px;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">❄</div>`,
              className: "",
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            })}
          >
            <Popup>
              <strong>{unit.name}</strong><br />
              Status: {humanize(unit.fridge_status)}<br />
              {unit.last_temperature != null ? `Temp: ${unit.last_temperature}°C` : "No reading"}
              <br />
              {unit.solar_powered ? "Solar powered" : "Grid/gas powered"}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
