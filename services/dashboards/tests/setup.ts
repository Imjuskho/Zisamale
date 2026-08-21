import "@testing-library/jest-dom";

// Minimal ResizeObserver stub — recharts ResponsiveContainer requires it and
// jsdom does not provide one.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverStub;
}
