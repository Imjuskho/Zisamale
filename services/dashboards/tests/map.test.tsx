import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeafletMap, riskToColor, riskToLabel } from "../src/components/LeafletMap";

const { fakeMap } = vi.hoisted(() => ({
  fakeMap: {
    setZoom: vi.fn(),
    flyTo: vi.fn(),
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
  });

  it("renders the map shell with OpenStreetMap tiles", () => {
    render(<LeafletMap />);
    expect(screen.getByText("District Risk Map")).toBeInTheDocument();
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    const tileLayer = screen.getByTestId("tile-layer");
    expect(tileLayer.getAttribute("data-url")).toContain("openstreetmap");
  });

  it("renders Malawi district polygons and the color legend", () => {
    render(<LeafletMap />);
    expect(screen.getByText("Nsanje")).toBeInTheDocument();
    expect(screen.getByText("Blantyre")).toBeInTheDocument();
    expect(screen.getByText("Lilongwe")).toBeInTheDocument();
    expect(screen.getByLabelText("Risk color legend")).toBeInTheDocument();
    expect(screen.getByText(/Low \(<30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Critical \(>80%\)/)).toBeInTheDocument();
  });

  it("shows popup info panel and notifies parent on district click", () => {
    const onSelect = vi.fn();
    render(<LeafletMap onSelectDistrict={onSelect} />);
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
    render(
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
    render(<LeafletMap />);
    fireEvent.click(screen.getByText("Nsanje"));
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  describe("color scale helpers", () => {
    it("maps risk bands to the configured colors", () => {
      expect(riskToColor(0.1)).toBe("#22c55e");
      expect(riskToColor(0.45)).toBe("#eab308");
      expect(riskToColor(0.7)).toBe("#f97316");
      expect(riskToColor(0.95)).toBe("#ef4444");
    });

    it("labels risk bands", () => {
      expect(riskToLabel(0.1)).toBe("Low");
      expect(riskToLabel(0.45)).toBe("Moderate");
      expect(riskToLabel(0.7)).toBe("High");
      expect(riskToLabel(0.95)).toBe("Critical");
    });
  });
});
