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
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 300_000,
  },
});
