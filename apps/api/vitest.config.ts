import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC compiles the NestJS decorators (with metadata) that esbuild cannot emit.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // argon2 is a native addon; separate processes are the safest pool for it.
    pool: "forks",
    testTimeout: 60_000,
    // Global setup creates a PostgreSQL cluster once per run (initdb takes ~20 s on Windows).
    hookTimeout: 300_000,
  },
});
