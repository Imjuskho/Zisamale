import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import { LanguageProvider } from "./components/design/LanguageContext";
import { ToastProvider } from "./components/design/Toast";
import "./index.css";
import "./styles/components.css";
import "./styles/dark.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <LanguageProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LanguageProvider>
    </Provider>
  </React.StrictMode>,
);
