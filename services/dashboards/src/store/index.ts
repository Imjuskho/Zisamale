import { configureStore } from "@reduxjs/toolkit";
import { dashboardReducer, authReducer, themeReducer } from "./dashboardSlice";

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
