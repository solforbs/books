import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/app-providers";
import { AppRoutes } from "./app/app-routes";
import { initI18n } from "./i18n";
import { createQueryClient } from "./lib/query-client";
// Self-hosted fonts (bundled and precached, so they work offline): Inter for text,
// Space Grotesk for headings.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "./index.css";

initI18n();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppProviders client={createQueryClient()}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
