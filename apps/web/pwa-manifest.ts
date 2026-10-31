import type { ManifestOptions } from "vite-plugin-pwa";

export const THEME_COLOR = "#0f766e";

/** Web app manifest. "Books" is the product name, so it is the same in every language. */
export const pwaManifest: Partial<ManifestOptions> = {
  name: "Books",
  short_name: "Books",
  description: "Books",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#ffffff",
  theme_color: THEME_COLOR,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    { src: "/icons/favicon.svg", sizes: "any", type: "image/svg+xml" },
  ],
};
