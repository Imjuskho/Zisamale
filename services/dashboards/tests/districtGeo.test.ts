import { describe, it, expect } from "vitest";
import {
  LEVEL_TO_RISK,
  slugify,
  toMapDistricts,
} from "../src/components/map/districtGeo";
import type { DistrictSummary } from "../src/types";

function summary(overrides: Partial<DistrictSummary>): DistrictSummary {
  return {
    district_id: "00000000-0000-0000-0000-00000000dead",
    district_name: "Nsanje",
    malaria_risk_level: "high",
    active_alerts: 0,
    stockout_count: null,
    maternal_mortality_ratio: null,
    under5_mortality_rate: null,
    essential_service_coverage: null,
    ...overrides,
  };
}

describe("district → map adapter", () => {
  it("derives map ids from the geojson slug, never the registry uuid", () => {
    const [row] = toMapDistricts([summary({ district_name: "Nkhata Bay" })]);
    expect(row.district_id).toBe(slugify("Nkhata Bay"));
    expect(row.district_id).toBe("nkhata-bay");
  });

  it("maps risk levels onto the canonical band representatives", () => {
    const rows = toMapDistricts([
      summary({ district_name: "A", malaria_risk_level: "low" }),
      summary({ district_name: "B", malaria_risk_level: "medium" }),
      summary({ district_name: "C", malaria_risk_level: "high" }),
    ]);
    expect(rows.map((r) => r.risk_score)).toEqual([
      LEVEL_TO_RISK.low,
      LEVEL_TO_RISK.medium,
      LEVEL_TO_RISK.high,
    ]);
  });

  it("skips rows without a risk level instead of painting no-data", () => {
    const rows = toMapDistricts([
      summary({ district_name: "Known", malaria_risk_level: "low" }),
      summary({ district_name: "Unknown", malaria_risk_level: null }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Known"]);
  });

  it("keeps every slug id inside DISTRICT_BOUNDS (fly-to always resolves)", async () => {
    const { DISTRICT_BOUNDS } = await import("../src/components/map/districtGeo");
    const rows = toMapDistricts([
      summary({ district_name: "Nsanje" }),
      summary({ district_name: "Likoma" }),
      summary({ district_name: "Mzimba" }),
    ]);
    for (const row of rows) {
      const id = row.district_id ?? "";
      expect(DISTRICT_BOUNDS[id]).toBeDefined();
    }
  });
});
