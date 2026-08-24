import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { dashboardReducer, themeReducer } from "../src/store/dashboardSlice";
import { LeafletMap } from "../src/components/LeafletMap";
import { riskToColor, riskToLabel, RISK_HEX } from "../src/design/riskScale";

const { fakeMap } = vi.hoisted(() => ({
  fakeMap: {
    setZoom: vi.fn(),
    flyTo: vi.fn(),
    flyToBounds: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tile-layer" data-url={url} />
  ),
  GeoJSON: ({
    data,
    onEachFeature,
  }: {
    data: { features: Array<{ properties: { district_id: string; name: string } }> };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEachFeature?: (feature: any, layer: any) => void;
  }) => (
    <div data-testid="geojson-layer">
      {data.features.map((feature) => {
        const handlers: Record<string, () => void> = {};
        const layer = {
          bindPopup: vi.fn(),
          on: (event: string, cb: () => void) => {
            handlers[event] = cb;
          },
        };
        onEachFeature?.(feature, layer);
        return (
          <button
            key={feature.properties.district_id}
            data-district={feature.properties.name}
            onClick={() => handlers.click?.()}
          >
            {feature.properties.name}
          </button>
        );
      })}
    </div>
  ),
  useMap: () => fakeMap,
}));

describe("LeafletMap", () => {
  beforeEach(() => {
    fakeMap.setZoom.mockClear();
    fakeMap.flyTo.mockClear();
    fakeMap.flyToBounds.mockClear();
  });

  function renderMap(ui: React.ReactElement) {
    const store = configureStore({
      reducer: { dashboard: dashboardReducer, theme: themeReducer },
    });
    return render(<Provider store={store}>{ui}</Provider>);
  }

  it("renders the map shell with OpenStreetMap tiles", () => {
    renderMap(<LeafletMap />);
    expect(screen.getByText("Moyo Map")).toBeInTheDocument();
    expect(screen.getByText(/Spatial Health Intelligence/)).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    const tileLayer = screen.getByTestId("tile-layer");
    expect(tileLayer.getAttribute("data-url")).toContain("openstreetmap");
  });

  it("renders Malawi district polygons and the color legend", () => {
    renderMap(<LeafletMap />);
    expect(screen.getByText("Nsanje")).toBeInTheDocument();
    expect(screen.getByText("Blantyre")).toBeInTheDocument();
    expect(screen.getByText("Lilongwe")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk color legend")).toBeInTheDocument();
    expect(screen.getByText(/Low \(<30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Critical \(>80%\)/)).toBeInTheDocument();
  });

  it("shows popup info panel and notifies parent on district click", () => {
    const onSelect = vi.fn();
    renderMap(<LeafletMap onSelectDistrict={onSelect} />);
    fireEvent.click(screen.getByText("Blantyre"));
    const panel = screen.getByRole("status");
    expect(panel).toHaveTextContent("Blantyre");
    expect(panel).toHaveTextContent(/Facilities: 41/);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      name: "Blantyre",
      district_id: "blantyre",
    });
  });

  it("uses caller-supplied risk data instead of sample values", () => {
    renderMap(
      <LeafletMap
        districts={[{ name: "Nsanje", risk_score: 0.91, facility_count: 12 }]}
      />
    );
    fireEvent.click(screen.getByText("Nsanje"));
    const panel = screen.getByRole("status");
    expect(panel).toHaveTextContent("Critical");
    expect(panel).toHaveTextContent("Facilities: 12");
  });

  it("dismisses the info panel via Close", () => {
    renderMap(<LeafletMap />);
    fireEvent.click(screen.getByText("Nsanje"));
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close district panel/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("flies to district bounds when selection is controlled externally", () => {
    renderMap(<LeafletMap selectedDistrictId="blantyre" />);
    expect(fakeMap.flyToBounds).toHaveBeenCalled();
  });

  describe("color scale helpers", () => {
    it("maps risk bands to the configured colors", () => {
      expect(riskToColor(0.1)).toBe(RISK_HEX.low);
      expect(riskToColor(0.45)).toBe(RISK_HEX.medium);
      expect(riskToColor(0.7)).toBe(RISK_HEX.high);
      expect(riskToColor(0.95)).toBe(RISK_HEX.critical);
    });

    it("labels risk bands", () => {
      expect(riskToLabel(0.1)).toBe("Low");
      expect(riskToLabel(0.45)).toBe("Moderate");
      expect(riskToLabel(0.7)).toBe("High");
      expect(riskToLabel(0.95)).toBe("Critical");
    });
  });
});
