import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface DistrictSetting {
  id: string;
  name: string;
}

const STORAGE_KEY = "samala-district";

interface DistrictContextValue {
  district: DistrictSetting | null;
  setDistrict: (d: DistrictSetting) => void;
  clearDistrict: () => void;
}

const DistrictContext = createContext<DistrictContextValue>({
  district: null,
  setDistrict: () => undefined,
  clearDistrict: () => undefined,
});

function readStoredDistrict(): DistrictSetting | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DistrictSetting;
      if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function DistrictProvider({ children }: { children: ReactNode }) {
  const [district, setDistrictState] = useState<DistrictSetting | null>(readStoredDistrict);

  const setDistrict = useCallback((d: DistrictSetting) => {
    setDistrictState(d);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {}
  }, []);

  const clearDistrict = useCallback(() => {
    setDistrictState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ district, setDistrict, clearDistrict }),
    [district, setDistrict, clearDistrict]
  );

  return <DistrictContext.Provider value={value}>{children}</DistrictContext.Provider>;
}

export function useDistrict() {
  return useContext(DistrictContext);
}