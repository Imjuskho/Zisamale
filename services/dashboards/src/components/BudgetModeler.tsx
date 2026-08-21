import { useMemo, useState } from "react";
import type { BudgetScenarioInput, BudgetScenarioOutput } from "../types";

/* ------------------------------------------------------------------ */
/* Model assumptions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Transparent, client-side policy model. Constants are documented so MoHP
 * analysts can audit every figure; when `POST /api/v1/chuma/budget-model`
 * is available, outputs should be cross-checked against the server model.
 */
export const MODEL_ASSUMPTIONS = {
  /** Share of malaria deaths avoidable with a reliable commodity supply. */
  preventableFraction: 0.55,
  /** DALYs averted per under-5 malaria death avoided (age-weighted avg). */
  dalysPerDeath: 32,
  /** DALYs averted per non-fatal case avoided (disability weight x duration). */
  dalysPerCaseAverted: 0.012,
  /** Malaria deaths per 100k population per year at current national baseline. */
  deathsPer100kPerYear: 0.9,
} as const;

/** Rough district populations (2023 estimates) — replaced by API data when live. */
const DISTRICT_POPULATIONS: Record<string, number> = {
  Chitipa: 240_000,
  Karonga: 320_000,
  Rumphi: 260_000,
  Mzimba: 940_000,
  "Nkhata Bay": 270_000,
  Likoma: 15_000,
  Kasungu: 880_000,
  Nkhotakota: 420_000,
  Ntchisi: 380_000,
  Dowa: 780_000,
  Salima: 520_000,
  Lilongwe: 1_900_000,
  Mchinji: 360_000,
  Dedza: 830_000,
  Ntcheu: 660_000,
  Mangochi: 1_060_000,
  Balaka: 430_000,
  Machinga: 730_000,
  Zomba: 760_000,
  Phalombe: 440_000,
  Chiradzulu: 330_000,
  Blantyre: 1_280_000,
  Thyolo: 720_000,
  Mulanje: 680_000,
  Mwanza: 110_000,
  Neno: 150_000,
  Chikwawa: 560_000,
  Nsanje: 310_000,
};

const COMMODITIES: Record<
  string,
  { unitCostMwk: number; annualDemandPer100k: number }
> = {
  "ACT (AL)": { unitCostMwk: 1_200, annualDemandPer100k: 180_000 },
  "Malaria RDT": { unitCostMwk: 350, annualDemandPer100k: 260_000 },
  ITN: { unitCostMwk: 3_200, annualDemandPer100k: 55_000 },
  "SP (IPTp)": { unitCostMwk: 90, annualDemandPer100k: 42_000 },
  Amoxicillin: { unitCostMwk: 450, annualDemandPer100k: 150_000 },
};

/** Baseline effective coverage of the commodity pipeline per district. */
const BASELINE_COVERAGE: Record<string, number> = {
  Chitipa: 0.62, Karonga: 0.58, Rumphi: 0.6, Mzimba: 0.54,
  "Nkhata Bay": 0.61, Likoma: 0.66, Kasungu: 0.52, Nkhotakota: 0.49,
  Ntchisi: 0.51, Dowa: 0.53, Salima: 0.47, Lilongwe: 0.58,
  Mchinji: 0.56, Dedza: 0.5, Ntcheu: 0.55, Mangochi: 0.38,
  Balaka: 0.45, Machinga: 0.43, Zomba: 0.48, Phalombe: 0.41,
  Chiradzulu: 0.52, Blantyre: 0.57, Thyolo: 0.46, Mulanje: 0.44,
  Mwanza: 0.59, Neno: 0.5, Chikwawa: 0.36, Nsanje: 0.33,
};

export const DISTRICT_NAMES = Object.keys(DISTRICT_POPULATIONS).sort();
export const COMMODITY_NAMES = Object.keys(COMMODITIES);

export const BUDGET_MIN_MWK = 5_000_000;
export const BUDGET_MAX_MWK = 800_000_000;
export const BUDGET_STEP_MWK = 5_000_000;

/* ------------------------------------------------------------------ */
/* Pure model                                                          */
/* ------------------------------------------------------------------ */

export function computeBudgetScenario(
  input: Pick<BudgetScenarioInput, "budgetMwk" | "district" | "commodity">
): BudgetScenarioOutput {
  const population = DISTRICT_POPULATIONS[input.district] ?? 500_000;
  const commodity = COMMODITIES[input.commodity] ?? COMMODITIES["ACT (AL)"];
  const coverageBefore = BASELINE_COVERAGE[input.district] ?? 0.5;

  const annualDemand = (population / 100_000) * commodity.annualDemandPer100k;
  const requiredBudgetMwk = annualDemand * commodity.unitCostMwk;
  // Diminishing returns: each extra MWK buys less marginal coverage.
  const adequacy = requiredBudgetMwk > 0 ? input.budgetMwk / requiredBudgetMwk : 1;
  const marginalGain = adequacy / (adequacy + 0.6);
  const coverageAfter = Math.min(0.97, coverageBefore + (0.97 - coverageBefore) * marginalGain);

  const gapClosed =
    coverageAfter > coverageBefore
      ? (coverageAfter - coverageBefore) / (1 - coverageBefore)
      : 0;
  const stockoutReductionPct = Math.round(Math.min(95, gapClosed * 100));

  const baselineDeaths = (population / 100_000) * MODEL_ASSUMPTIONS.deathsPer100kPerYear;
  const livesSaved = Math.round(baselineDeaths * MODEL_ASSUMPTIONS.preventableFraction * gapClosed);
  const casesAverted = Math.round(annualDemand * 0.12 * gapClosed);
  const dalysAverted =
    livesSaved * MODEL_ASSUMPTIONS.dalysPerDeath +
    casesAverted * MODEL_ASSUMPTIONS.dalysPerCaseAverted;
  const costPerDalY = dalysAverted > 0 ? input.budgetMwk / dalysAverted : Number.POSITIVE_INFINITY;

  return {
    requiredBudgetMwk,
    coverageBefore,
    coverageAfter,
    stockoutReductionPct,
    livesSaved,
    casesAverted,
    dalysAverted,
    costPerDalY,
  };
}

function formatMwk(value: number): string {
  if (!Number.isFinite(value)) return "\u2014";
  if (value >= 1_000_000) return `MK ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `MK ${Math.round(value / 1_000)}K`;
  return `MK ${Math.round(value)}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface ScenarioPanelProps {
  label: string;
  input: BudgetScenarioInput;
  output: BudgetScenarioOutput;
  onChange: (patch: Partial<BudgetScenarioInput>) => void;
}

function ScenarioPanel({ label, input, output, onChange }: ScenarioPanelProps) {
  return (
    <fieldset className="budget-scenario" style={{ flex: 1, minWidth: 280 }}>
      <legend>
        <strong>{label}</strong>
      </legend>

      <label htmlFor={`${label}-district`}>District</label>
      <br />
      <select
        id={`${label}-district`}
        value={input.district}
        onChange={(e) => onChange({ district: e.target.value })}
      >
        {DISTRICT_NAMES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <br />
      <label htmlFor={`${label}-commodity`}>Commodity</label>
      <br />
      <select
        id={`${label}-commodity`}
        value={input.commodity}
        onChange={(e) => onChange({ commodity: e.target.value })}
      >
        {COMMODITY_NAMES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <br />
      <label htmlFor={`${label}-budget`}>
        Budget: <strong>{formatMwk(input.budgetMwk)}</strong>{" "}
        ({input.budgetMwk.toLocaleString()} MWK)
      </label>
      <br />
      <input
        id={`${label}-budget`}
        type="range"
        min={BUDGET_MIN_MWK}
        max={BUDGET_MAX_MWK}
        step={BUDGET_STEP_MWK}
        value={input.budgetMwk}
        onChange={(e) => onChange({ budgetMwk: Number(e.target.value) })}
        style={{ width: "100%" }}
      />

      <dl className="scenario-output" aria-label={`${label} projected impact`}>
        <dt>Projected stockout reduction</dt>
        <dd data-testid={`${label}-stockout-reduction`}>{output.stockoutReductionPct}%</dd>
        <dt>Lives saved (annual)</dt>
        <dd data-testid={`${label}-lives-saved`}>{output.livesSaved.toLocaleString()}</dd>
        <dt>Cost per DALY averted</dt>
        <dd data-testid={`${label}-cost-per-daly`}>
          {Number.isFinite(output.costPerDalY)
            ? `${formatMwk(output.costPerDalY)} (${output.costPerDalY.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWK)`
            : "\u2014"}
        </dd>
        <dt>Coverage (before &rarr; after)</dt>
        <dd>
          {Math.round(output.coverageBefore * 100)}% &rarr;{" "}
          {Math.round(output.coverageAfter * 100)}%
        </dd>
        <dt>Full-coverage budget need</dt>
        <dd>{formatMwk(output.requiredBudgetMwk)}</dd>
      </dl>
    </fieldset>
  );
}

export function BudgetModeler() {
  const [scenarioA, setScenarioA] = useState<BudgetScenarioInput>({
    label: "Scenario A",
    budgetMwk: 120_000_000,
    district: "Nsanje",
    commodity: "ACT (AL)",
  });
  const [scenarioB, setScenarioB] = useState<BudgetScenarioInput>({
    label: "Scenario B",
    budgetMwk: 250_000_000,
    district: "Nsanje",
    commodity: "ITN",
  });

  const outputA = useMemo(() => computeBudgetScenario(scenarioA), [scenarioA]);
  const outputB = useMemo(() => computeBudgetScenario(scenarioB), [scenarioB]);

  const comparison = useMemo(() => {
    const a = outputA.costPerDalY;
    const b = outputB.costPerDalY;
    if (!Number.isFinite(a) && !Number.isFinite(b)) {
      return "Neither scenario averts enough DALYs to rank cost-effectiveness.";
    }
    const better = a <= b ? "A" : "B";
    const betterOut = a <= b ? outputA : outputB;
    const worseOut = a <= b ? outputB : outputA;
    if (!Number.isFinite(worseOut.costPerDalY)) {
      return `Scenario ${better} is more cost-effective at ${formatMwk(betterOut.costPerDalY)} per DALY averted.`;
    }
    const ratio = worseOut.costPerDalY / betterOut.costPerDalY;
    return `Scenario ${better} is more cost-effective: ${formatMwk(
      betterOut.costPerDalY
    )} vs ${formatMwk(worseOut.costPerDalY)} per DALY (${ratio.toFixed(1)}x better).`;
  }, [outputA, outputB]);

  return (
    <div className="budget-modeler">
      <h2>CHUMA Budget Modeler</h2>
      <p className="model-note" style={{ fontSize: 12 }}>
        Indicative planning tool. Assumptions:{" "}
        {Math.round(MODEL_ASSUMPTIONS.preventableFraction * 100)}% of malaria
        deaths are supply-preventable; {MODEL_ASSUMPTIONS.dalysPerDeath} DALYs
        per death averted. Validate against the server model before committing funds.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <ScenarioPanel
          label="Scenario A"
          input={scenarioA}
          output={outputA}
          onChange={(patch) => setScenarioA((s) => ({ ...s, ...patch }))}
        />
        <ScenarioPanel
          label="Scenario B"
          input={scenarioB}
          output={outputB}
          onChange={(patch) => setScenarioB((s) => ({ ...s, ...patch }))}
        />
      </div>
      <p className="scenario-comparison" role="status" style={{ fontWeight: 600 }}>
        {comparison}
      </p>
    </div>
  );
}
