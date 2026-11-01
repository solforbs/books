import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit only GENERATES migrations here (`pnpm --filter @books/api db:generate`);
 * the API applies them itself at startup (src/common/database/migrator.ts).
 * Hand-written SQL (grants, row-level security, functions) goes in custom
 * migrations: `pnpm --filter @books/api db:generate --custom --name=<what>`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/modules/*/infrastructure/**/*.table.ts"],
  out: "./drizzle",
  strict: true,
  verbose: true,
});
