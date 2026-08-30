import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../src/pages/HomePage";
import { LanguageProvider } from "../src/components/design/LanguageContext";
import { DistrictProvider } from "../src/components/design/DistrictContext";

const districtPayload = {
  districts: [
    {
      district_id: "d1",
      district_name: "Nsanje",
      region: "south",
      facility_count: 12,
      risk_level: "high",
      active_alerts: 2,
    },
  ],
};

const guidePayload = {
  guides: [
    {
      guide_id: "g1",
      title: "Cholera at home",
      title_chichewa: "Kolera panyumba",
      category: "cholera",
      audience: "community",
      severity: "emergency",
      what_it_is: "x",
      what_to_do_now: ["a"],
      updated_at: null,
    },
  ],
};

function stubFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/districts")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(districtPayload) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(guidePayload) });
  }) as unknown as typeof fetch;
}

describe("HomePage", () => {
  beforeEach(() => stubFetch());

  it("renders the welcome, district prompt, and most urgent guide in default Chichewa", async () => {
    render(
      <LanguageProvider>
        <DistrictProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </DistrictProvider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Sankhani boma lanu").length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      // Chichewa is the default reading language → guide card shows Chichewa.
      expect(screen.getByText("Kolera panyumba")).toBeTruthy();
    });
  });
});