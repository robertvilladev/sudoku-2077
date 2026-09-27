import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { queryClient } from "./lib/queryClient.js";
import { AuthProvider } from "./lib/auth/AuthContext.js";
import { SettingsProvider } from "./lib/settings/SettingsContext.js";
import { I18nProvider } from "./lib/i18n/I18nProvider.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element");
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <SettingsProvider>
          <I18nProvider>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </I18nProvider>
        </SettingsProvider>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>
);
