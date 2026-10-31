/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaManifest } from "./pwa-manifest";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/favicon.svg", "icons/apple-touch-icon.png"],
      manifest: pwaManifest,
      workbox: {
        // App shell only. API responses are not cached until offline sync is designed (ARCH-01 §7).
        // Fonts: only the Latin subsets (English and Somali) are precached for offline use.
        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,webmanifest}",
          "**/*-latin-wght-normal-*.woff2",
          "**/*-latin-ext-wght-normal-*.woff2",
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Full-page flows with typing are slow on shared CI runners.
    testTimeout: 20_000,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
