import { describe, it, expect } from "vitest";
import { generateLaymanSummary } from "../src/utils/laymanProcessor";
import type { ResearchStudy } from "../src/types";

describe("laymanProcessor", () => {
  const mockStudy: ResearchStudy = {
    study_id: "test-study-1",
    title: "Efficacy of LLINs in reducing Plasmodium falciparum transmission in Nsanje",
    authors: ["Chirwa M", "Phiri T"],
    journal: "Malaria Journal",
    doi: "10.1186/s12936-024-001",
    publication_year: 2024,
    study_design: "Cluster randomized trial",
    sample_size: 1500,
    study_period_start: "2023-01-01",
    study_period_end: "2023-12-31",
    patient_demographics: { age: "under 5" },
    key_statistical_findings: [{ odds_ratio: 0.22, p_value: 0.001 }],
    limitations: ["Rainfall variability"],
    references_cited: [],
    study_district: "Nsanje",
    study_ta: "Ndamera",
    health_topic: "malaria",
    audience: "community",
    consent_status: "granted",
    status: "approved",
    discovered_at: "2024-01-01T00:00:00Z",
  };

  it("generates English layman summary with actionable steps and myths", () => {
    const summary = generateLaymanSummary(mockStudy, "en");
    expect(summary.plainTitle).toContain("MALARIA");
    expect(summary.coreFinding).toContain("Nsanje");
    expect(summary.actionableSteps.length).toBeGreaterThan(0);
    expect(summary.mythsAndFacts.length).toBeGreaterThan(0);
    expect(summary.numbersExplained.length).toBeGreaterThan(0);
    expect(summary.shareableSnippet).toContain("HEALTH UPDATE");
  });

  it("generates Chichewa layman summary with local advice", () => {
    const summary = generateLaymanSummary(mockStudy, "ny");
    expect(summary.plainTitle).toContain("MALARIA");
    expect(summary.coreFinding).toContain("Nsanje");
    expect(summary.actionableSteps[0]).toContain("chindandalala");
    expect(summary.shareableSnippet).toContain("ZAUMOYO KU MUDZI");
  });
});
