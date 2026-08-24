import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type {
  CHWLocation,
  ColdChainFacility,
  CommunityPin,
  HealthWeatherBriefing,
  MaternityWaitingHome,
  NutritionDataPoint,
  OutbreakPrediction,
  OutreachRoute,
  SupplyTruck,
  TraditionalBirthAttendant,
  Village,
} from "../types";

/**
 * All MOYO map-layer datasets, fetched once per mount.
 * Every dataset is independent: one failing or forbidden endpoint leaves
 * that layer empty instead of blanking the whole map.
 */
export interface MapLayers {
  chws: CHWLocation[];
  communityPins: CommunityPin[];
  outbreakPredictions: OutbreakPrediction[];
  villages: Village[];
  outreachRoutes: OutreachRoute[];
  coldChain: ColdChainFacility[];
  maternityHomes: MaternityWaitingHome[];
  tbas: TraditionalBirthAttendant[];
  supplyTrucks: SupplyTruck[];
  nutritionData: NutritionDataPoint[];
  healthWeather: HealthWeatherBriefing | null;
}

const EMPTY_LAYERS: MapLayers = {
  chws: [],
  communityPins: [],
  outbreakPredictions: [],
  villages: [],
  outreachRoutes: [],
  coldChain: [],
  maternityHomes: [],
  tbas: [],
  supplyTrucks: [],
  nutritionData: [],
  healthWeather: null,
};

export function useMapLayers(): {
  layers: MapLayers;
  loading: boolean;
  errors: string[];
  refetch: () => Promise<void>;
} {
  const [layers, setLayers] = useState<MapLayers>(EMPTY_LAYERS);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const results = await Promise.allSettled([
      api.getCHWPresence(),
      api.getCommunityPins(),
      api.getOutbreakPredictions(),
      api.getImmunizationVillages(),
      api.getOutreachRoutes(),
      api.getColdChain(),
      api.getMaternityHomes(),
      api.getTBAs(),
      api.getSupplyTrucks(),
      api.getNutritionData(),
      api.getWeatherBriefing(),
    ]);

    const failed = results
      .map((r) => (r.status === "rejected" ? String(r.reason?.message ?? "failed") : null))
      .filter((v): v is string => v !== null);

    const value = <T,>(i: number, fallback: T): T =>
      results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<T>).value : fallback;

    if (!alive.current) return;
    setLayers({
      chws: value(0, EMPTY_LAYERS.chws),
      communityPins: value(1, EMPTY_LAYERS.communityPins),
      outbreakPredictions: value(2, EMPTY_LAYERS.outbreakPredictions),
      villages: value(3, EMPTY_LAYERS.villages),
      outreachRoutes: value(4, EMPTY_LAYERS.outreachRoutes),
      coldChain: value(5, EMPTY_LAYERS.coldChain),
      maternityHomes: value(6, EMPTY_LAYERS.maternityHomes),
      tbas: value(7, EMPTY_LAYERS.tbas),
      supplyTrucks: value(8, EMPTY_LAYERS.supplyTrucks),
      nutritionData: value(9, EMPTY_LAYERS.nutritionData),
      healthWeather: value(10, EMPTY_LAYERS.healthWeather),
    });
    setErrors(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  return { layers, loading, errors, refetch: load };
}

export default useMapLayers;
