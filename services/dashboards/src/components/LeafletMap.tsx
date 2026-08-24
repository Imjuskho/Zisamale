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
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import { useAppSelector } from "../hooks/useRedux";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

import { useLanguage } from "./design/LanguageContext";
import { t } from "../i18n";
import { Icon } from "./design/Icon";
import { useToast } from "./design/Toast";
import { api } from "../services/api";

import type {
  ClimateOverlay,
  ClimateOverlayType,
  ReferralRequest,
  MapLayer,
  UserRole,
  DistrictRiskInput,
  ReferralRoute,
} from "../types";
import type { MapLayers } from "../hooks/useMapLayers";
import {
  riskToColor,
  riskToLabel,
  RISK_NODATA_HEX,
} from "../design/riskScale";
export { riskToColor, riskToLabel } from "../design/riskScale";

import {
  mergeRiskData,
  MALAWI_CENTER,
  DEFAULT_ZOOM,
  DISTRICT_BOUNDS,
  CLIMATE_DATA_LIVE,
  OSM_TILE_URL,
  DARK_TILE_URL,
  OSM_ATTRIBUTION,
  type DistrictRiskProps as DistrictProps,
  type DistrictFeature,
} from "./map/districtGeo";
import {
  FacilityMarkers,
  CHWMarkers,
  CommunityPinMarkers,
  OutbreakHeatLayer,
  ReferralRouteLines,
  ClimateOverlayCircles,
  SupplyTruckMarkers,
  NutritionMarkers,
  MaternityHomeMarkers,
  TBAMarkers,
  ImmunizationRoutes,
  ColdChainMarkers,
} from "./map/markerLayers";
import { MapLegend } from "./map/MapLegend";
import { getFacilities as getRealFacilities, type Facility as RealFacility } from "../services/facilityService";
import { RealFacilityPanel } from "./map/RealFacilityPanel";
import { ReferralEngine } from "./map/ReferralEngine";
import { CHWPresenceLayer } from "./map/CHWPresenceLayer";
import { CommunityVoicePins } from "./map/CommunityVoicePins";
import { OutbreakTimeSlider } from "./map/OutbreakTimeSlider";
import { ClimateOverlayPanel } from "./map/ClimateOverlay";
import { MapToolbar } from "./map/MapToolbar";
import { ImmunizationLayer } from "./map/ImmunizationLayer";
import { MaternityLayer } from "./map/MaternityLayer";
import { CHWCoverageHeatmap } from "./map/CHWCoverageHeatmap";
import { InterventionSimulator } from "./map/InterventionSimulator";
import { SupplyChainLayer } from "./map/SupplyChainLayer";
import { NutritionLayer } from "./map/NutritionLayer";
import { HealthWeatherPanel } from "./map/HealthWeatherPanel";

type DistrictRiskProps = DistrictProps;

/* ------------------------------------------------------------------ */
/* Map controller — card→map fly-to and national reset                 */
/* ------------------------------------------------------------------ */

function MapController({ selectedId, zoom }: { selectedId: string | null; zoom: number }) {
  const map = useMap();
  const hadSelection = useRef(false);
  useEffect(() => { map.setZoom(zoom); }, [map, zoom]);
  useEffect(() => {
    if (selectedId) {
      hadSelection.current = true;
      const bounds = DISTRICT_BOUNDS[selectedId];
      if (bounds) {
        map.flyToBounds(bounds, {
          padding: [80, 80],
          maxZoom: 10,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    } else if (hadSelection.current) {
      // Deselection → ease back to the national view
      hadSelection.current = false;
      map.flyTo(MALAWI_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }
  }, [map, selectedId]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export interface LeafletMapProps {
  districts?: DistrictRiskInput[];
  /** All map-layer datasets, fetched by the page via `useMapLayers()`. */
  layers?: MapLayers;
  chwPerformance?: any[];
  referralRoutes?: ReferralRoute[];
  currentPredictedCases?: number;
  center?: [number, number];
  zoom?: number;
  height?: number;
  showLegend?: boolean;
  role?: UserRole;
  /** Controlled district selection (slug id). When provided, map + panel follow it. */
  selectedDistrictId?: string | null;
  /** Fires when selection changes from inside the map (click / Close). */
  onSelectedDistrictChange?: (districtId: string | null) => void;
  onSelectDistrict?: (props: DistrictRiskProps | null) => void;
  onRefer?: (facility: RealFacility) => void;
  onCheckInRequest?: (chwId: string) => void;
  onVerifyPin?: (pinId: string) => void;
  onDismissPin?: (pinId: string) => void;
  onReportPin?: (type: string) => void;
  onSimulateIntervention?: (actCount: number, ta: string) => void;
  onRefreshWeather?: () => void;
  /** Re-fetches page data (alerts, layers, facilities) on Refresh click. */
  onRefresh?: () => void;
}

export function LeafletMap({
  districts,
  layers,
  center = MALAWI_CENTER,
  zoom = DEFAULT_ZOOM,
  height = 520,
  showLegend = true,
  role,
  selectedDistrictId,
  onSelectedDistrictChange,
  onSelectDistrict,
  onRefer,
  onCheckInRequest,
  onVerifyPin,
  onDismissPin,
  onReportPin,
  onSimulateIntervention,
  onRefreshWeather,
  onRefresh,
  referralRoutes = [],
  currentPredictedCases = 0,
  chwPerformance = [],
}: LeafletMapProps) {
  const {
    chws = [],
    communityPins = [],
    outbreakPredictions = [],
    villages = [],
    coldChain = [],
    outreachRoutes = [],
    maternityHomes = [],
    tbas = [],
    supplyTrucks = [],
    nutritionData = [],
    healthWeather = null,
  } = layers ?? {};
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRiskProps | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<RealFacility | null>(null);
  const [referralRequest, setReferralRequest] = useState<ReferralRequest | null>(null);
  const [registryFacilities, setRegistryFacilities] = useState<RealFacility[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(
    new Set(["districts", "facilities"])
  );
  const [predictionWeek, setPredictionWeek] = useState(0);
  const [activeClimateOverlays, setActiveClimateOverlays] = useState<Set<ClimateOverlayType>>(new Set());
  const [overlayData, setOverlayData] = useState<Partial<Record<ClimateOverlayType, ClimateOverlay[]>>>({});
  const [printMode, setPrintMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markerEpoch, setMarkerEpoch] = useState(0);
  const darkMode = useAppSelector((s: any) => s.theme.darkMode);

  // Facility registry (live API with embedded fallback) drives markers,
  // the details panel, and referral routing.
  useEffect(() => {
    let cancelled = false;
    getRealFacilities().then((f) => {
      if (!cancelled) setRegistryFacilities(f);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const { language } = useLanguage();
  const toast = useToast();

  const data = useMemo(() => mergeRiskData(districts), [districts]);

  // Toast when a district becomes selected (card click, map click, or dot nav).
  // Deduped per selection so StrictMode double-invoke and re-renders stay quiet.
  const lastToastedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedDistrict) {
      lastToastedRef.current = null;
      return;
    }
    if (selectedDistrict.district_id === lastToastedRef.current) return;
    lastToastedRef.current = selectedDistrict.district_id;
    const message =
      language === "ny"
        ? `Kusonyeza ${selectedDistrict.name} — zipatala ${selectedDistrict.facility_count} pa mapu`
        : `Showing ${selectedDistrict.name} — ${selectedDistrict.facility_count} facilities on map`;
    toast.show(message, { type: "info" });
  }, [selectedDistrict, language, toast]);

  const selectRef = useRef<(props: DistrictRiskProps) => void>(() => undefined);
  selectRef.current = (props) => {
    setSelectedDistrict(props);
    onSelectDistrict?.(props);
    onSelectedDistrictChange?.(props.district_id);
  };

  const clearSelectionRef = useRef<() => void>(() => undefined);
  clearSelectionRef.current = () => {
    setSelectedDistrict(null);
    onSelectDistrict?.(null);
    onSelectedDistrictChange?.(null);
  };

  // Follow external (controlled) selection, e.g. from the scorecard carousel
  useEffect(() => {
    if (selectedDistrictId === undefined) return;
    if (selectedDistrictId === null) {
      setSelectedDistrict((prev) => (prev ? null : prev));
      return;
    }
    const feature = data.features.find(
      (f) => f.properties.district_id === selectedDistrictId
    );
    if (feature && feature.properties.district_id !== selectedDistrict?.district_id) {
      setSelectedDistrict(feature.properties);
    }
  }, [selectedDistrictId, data]);

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
      const dimmed = !!selectedDistrict && !isSelected;
      return {
        color: isSelected ? "#2D7D46" : "#475569",
        weight: isSelected ? 3 : 1,
        fillColor: props ? riskToColor(props.risk_score) : RISK_NODATA_HEX,
        fillOpacity: dimmed ? 0.12 : 0.65,
        className: dimmed ? "district-polygon--dimmed" : undefined,
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

  // Fetch each overlay type once, when it is first activated; cached after.
  useEffect(() => {
    if (activeClimateOverlays.size === 0) return;
    const cancels: Array<() => void> = [];
    for (const overlay of activeClimateOverlays) {
      if (overlayData[overlay]) continue;
      let cancelled = false;
      api
        .getClimateOverlays(overlay)
        .then((points) => {
          if (!cancelled) setOverlayData((cache) => ({ ...cache, [overlay]: points }));
        })
        .catch(() => undefined);
      cancels.push(() => {
        cancelled = true;
      });
    }
    return () => cancels.forEach((fn) => fn());
  }, [activeClimateOverlays, overlayData]);

  const handlePrint = useCallback(() => {
    window.print();
    setPrintMode(true);
    setTimeout(() => setPrintMode(false), 1000);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Pull fresh data from the server, then remount marker layers
    onRefresh?.();
    setMarkerEpoch((e) => e + 1);
    setLastUpdate(Date.now());
    setTimeout(() => setIsRefreshing(false), 600);
  }, [onRefresh]);

  const handleExportSMS = useCallback(() => {
    const activeFacilities = registryFacilities.filter(
      (f) => f.operational_status !== "Closed" && f.operational_status !== "Not Functional"
    );
    const topFacilities = activeFacilities.slice(0, 3).map((f) => {
      const beds = f.beds_available;
      const status = f.beds_available == null ? "beds unknown" : `${beds} beds available`;
      return `${f.name}: ${status}, status ${f.operational_status ?? "unverified"}`;
    });
    const sms = `Zisamale Health Status:\n${topFacilities.join("\n")}`;
    navigator.clipboard
      ?.writeText(sms)
      .then(() => toast.show("SMS summary copied to clipboard.", { type: "success" }))
      .catch(() =>
        toast.show("Copy failed — your browser blocked clipboard access. Try again or copy manually.", {
          type: "error",
        })
      );
  }, [registryFacilities, toast]);

  function handleSelectFacility(facility: RealFacility) {
    setReferralRequest(null);
    setSelectedFacility(facility);
    onRefer?.(facility);
  }

  // Facility popup buttons are plain HTML inside a Leaflet popup, so they
  // communicate via window events. Bridge those events to panel state here.
  useEffect(() => {
    const findFacility = (event: Event): RealFacility | null => {
      const facilityId = (event as CustomEvent<{ facilityId?: string }>).detail?.facilityId;
      return registryFacilities.find((f) => String(f.id) === String(facilityId)) ?? null;
    };
    const openReferral = (e: Event) => {
      const facility = findFacility(e);
      if (!facility) return;
      setSelectedFacility(null);
      setReferralRequest({
        patient_lat: facility.latitude,
        patient_lng: facility.longitude,
        condition: "obstetric",
        intervention_required: "general",
        urgency: "urgent",
      });
    };
    const openDetails = (e: Event) => {
      const facility = findFacility(e);
      if (!facility) return;
      setReferralRequest(null);
      setSelectedFacility(facility);
    };
    window.addEventListener("zisamale:refer", openReferral);
    window.addEventListener("zisamale:view-facility", openDetails);
    return () => {
      window.removeEventListener("zisamale:refer", openReferral);
      window.removeEventListener("zisamale:view-facility", openDetails);
    };
  }, [registryFacilities]);

  const referralFacilities = useMemo(() => {
    if (!referralRequest) return [];
    return registryFacilities.filter((f) => f.operational_status !== "Closed");
  }, [referralRequest, registryFacilities]);

  return (
    <div className={`leaflet-map moyo-map ${printMode ? "moyo-map--print" : ""}`}>
      <div className="moyo-map-header">
        <div className="moyo-map-title-row">
          <h2>{t("moyoMapTitle", language)}</h2>
          <span className="moyo-map-tagline">{t("moyoMapTagline", language)}</span>
        </div>
        <p className="moyo-map-subtitle">{t("moyoMapSubtitle", language)}</p>
        <div className="moyo-map-status">
          <span className="relative flex h-2 w-2 moyo-live-dot">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>
            {t("live", language)} • {t("lastSync", language)}{" "}
            {new Date(lastUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            type="button"
            className="moyo-refresh-btn"
            onClick={handleRefresh}
            aria-label={t("refresh", language)}
          >
            <Icon name="ArrowsClockwise" size={12} className={isRefreshing ? "animate-spin" : ""} />
            {t("refresh", language)}
          </button>
        </div>
      </div>

      <div className="moyo-map-body">
        <div className="leaflet-map-container" style={{ position: "relative", height }}>
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url={darkMode ? DARK_TILE_URL : OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

            {/* District risk choropleth (keyed so style changes re-apply) */}
            {activeLayers.has("districts") && (
              <GeoJSON
                key={selectedDistrict?.district_id ?? "national"}
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
              <FacilityMarkers
                key={markerEpoch}
                facilities={registryFacilities}
                onSelect={setSelectedFacility}
                districtFilter={selectedDistrict?.name ?? null}
              />
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
            {activeLayers.has("outbreak") && (
              <OutbreakHeatLayer predictions={outbreakPredictions} week={predictionWeek} />
            )}

            {/* Referral route lines */}
            {referralRoutes.length > 0 && (
              <ReferralRouteLines routes={referralRoutes} />
            )}

            {/* Supply chain truck markers */}
            {activeLayers.has("supply_chain") && <SupplyTruckMarkers trucks={supplyTrucks} />}

            {/* Nutrition village markers */}
            {activeLayers.has("nutrition") && <NutritionMarkers data={nutritionData} />}

            {/* Maternity waiting home markers */}
            {activeLayers.has("maternity") && <MaternityHomeMarkers homes={maternityHomes} />}

            {/* TBA markers */}
            {activeLayers.has("tba") && <TBAMarkers tbas={tbas} />}

            {/* Immunization micro-planning: outreach routes + village coverage */}
            {activeLayers.has("immunization") && (
              <ImmunizationRoutes villages={villages} outreachRoutes={outreachRoutes} />
            )}

            {/* Cold chain: vaccine fridge status markers */}
            {activeLayers.has("cold_chain") && <ColdChainMarkers units={coldChain} />}

            {/* Climate overlay surfaces (live climate_daily pipeline) */}
            {CLIMATE_DATA_LIVE && activeClimateOverlays.size > 0 && (
              <ClimateOverlayCircles
                data={overlayData}
                active={activeClimateOverlays}
              />
            )}

            <MapController zoom={zoom} selectedId={selectedDistrict?.district_id ?? null} />
          </MapContainer>

          {/* Selected district summary — card→map sync feedback */}
          {selectedDistrict && (
            <aside className="moyo-district-panel" role="status">
              <header className="moyo-district-panel-header">
                <div>
                  <strong>{selectedDistrict.name}</strong>
                  <span
                    className="moyo-district-risk-chip"
                    style={{ backgroundColor: riskToColor(selectedDistrict.risk_score) }}
                  >
                    {riskToLabel(selectedDistrict.risk_score)}{" "}
                    {Math.round(selectedDistrict.risk_score * 100)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => clearSelectionRef.current()}
                  aria-label="Close district panel"
                >
                  <Icon name="X" size={14} />
                </button>
              </header>
              <div className="moyo-district-panel-body">
                <span>Facilities: {selectedDistrict.facility_count}</span>
                <span>Risk score: {(selectedDistrict.risk_score * 10).toFixed(1)}/10</span>
              </div>
            </aside>
          )}

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

          {/* Climate overlay panel — hidden until live climate pipeline exists */}
          {CLIMATE_DATA_LIVE && (
            <ClimateOverlayPanel
              activeOverlays={activeClimateOverlays}
              onToggle={toggleClimateOverlay}
            />
          )}

          {/* Outbreak time slider */}
          {activeLayers.has("outbreak") && (
            <OutbreakTimeSlider
              predictions={outbreakPredictions}
              currentWeek={predictionWeek}
              onWeekChange={setPredictionWeek}
            />
          )}

          {/* Immunization micro-planning panel */}
          {(activeLayers.has("immunization") || activeLayers.has("cold_chain")) && (
            <ImmunizationLayer
              villages={villages}
              coldChain={coldChain}
              outreachRoutes={outreachRoutes}
            />
          )}

          {/* Maternity & TBA panel */}
          {(activeLayers.has("maternity") || activeLayers.has("tba")) && (
            <MaternityLayer
              waitingHomes={maternityHomes}
              tbas={tbas}
            />
          )}

          {/* CHW coverage heatmap (DHO/MoHP view) */}
          {(role === "dho" || role === "mohp" || role === "supervisor") && chwPerformance.length > 0 && (
            <CHWCoverageHeatmap chws={chwPerformance} />
          )}

          {/* Intervention simulator (DHO/MoHP) */}
          {(role === "dho" || role === "mohp") && (
            <InterventionSimulator
              currentPredictedCases={currentPredictedCases}
              onSimulate={onSimulateIntervention}
            />
          )}

          {/* Supply chain panel */}
          {activeLayers.has("supply_chain") && (
            <SupplyChainLayer trucks={supplyTrucks} />
          )}

          {/* Nutrition surveillance panel */}
          {activeLayers.has("nutrition") && (
            <NutritionLayer data={nutritionData} />
          )}

          {/* Health Weather daily briefing */}
          {(role === "dho" || role === "mohp" || role === "phim") && (
            <HealthWeatherPanel
              briefing={healthWeather}
              onRefresh={onRefreshWeather}
            />
          )}
        </div>
      </div>

      {/* Facility slide-out panel */}
      {selectedFacility && (
        <RealFacilityPanel
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          onRefer={(facility) => {
            setReferralRequest({
              patient_lat: center[0],
              patient_lng: center[1],
              condition: "obstetric",
              intervention_required: "general",
              urgency: "urgent",
            });
            void facility;
            setSelectedFacility(null);
          }}
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
