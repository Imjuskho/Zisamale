import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { dashboardReducer } from "../src/store/dashboardSlice";

function createTestStore() {
  return configureStore({ reducer: { dashboard: dashboardReducer } });
}

describe("dashboardSlice", () => {
  it("has correct initial state", () => {
    const store = createTestStore();
    const state = store.getState().dashboard;
    expect(state.alerts).toEqual([]);
    expect(state.districts).toEqual([]);
    expect(state.trends).toBeNull();
    expect(state.forecast).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
