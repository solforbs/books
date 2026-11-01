// Local development database: an embedded PostgreSQL 17 (no Docker, no install)
// that keeps its data in apps/api/.data/postgres between runs and listens on
// 127.0.0.1:5433 only (5433 so it never clashes with a system PostgreSQL).
//
// On the first run it creates the cluster, the `books_owner` / `books_app` roles
// and the database, using the names and passwords in apps/api/.env (or
// .env.example). The API applies its migrations itself when it starts.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import EmbeddedPostgres from "embedded-postgres";
import { stopEmbeddedPostgres } from "./embedded-pg-stop.mjs";
import { createDatabase, provisionRoles } from "./pg-provision.mjs";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = join(apiDir, ".data");
const dbDir = join(dataRoot, "postgres");
const adminPasswordFile = join(dataRoot, "postgres-admin-password");
const PORT = Number(process.env.DEV_DB_PORT ?? 5433);

/** Database name and role passwords come from the API's own settings. */
function readSettings() {
  const file = [".env", ".env.example"].map((f) => join(apiDir, f)).find((f) => existsSync(f));
  const env = file ? parseEnv(readFileSync(file, "utf8")) : {};
  const app = new URL(
    env.DATABASE_URL ?? "postgres://books_app:books_app_dev@127.0.0.1:5433/books",
  );
  const owner = new URL(env.DATABASE_MIGRATION_URL ?? app.toString());
  return {
    database: app.pathname.slice(1) || "books",
    appPassword: decodeURIComponent(app.password),
    ownerPassword: decodeURIComponent(owner.password),
  };
}

/** The local superuser password, generated once and kept next to the data. */
function adminPassword() {
  mkdirSync(dataRoot, { recursive: true });
  if (!existsSync(adminPasswordFile)) {
    writeFileSync(adminPasswordFile, randomBytes(24).toString("hex"), { mode: 0o600 });
  }
  return readFileSync(adminPasswordFile, "utf8").trim();
}

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: PORT,
  user: "postgres",
  password: adminPassword(),
  authMethod: "scram-sha-256",
  persistent: true,
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
  onError: (e) => console.error(e),
});

if (!existsSync(join(dbDir, "PG_VERSION"))) {
  console.warn("Creating the local PostgreSQL cluster (first run only)...");
  await pg.initialise();
}
await pg.start();

const settings = readSettings();
const admin = pg.getPgClient("postgres", "127.0.0.1");
await admin.connect();
try {
  await provisionRoles(admin, settings);
  await createDatabase(admin, settings.database);
} finally {
  await admin.end();
}

console.warn(`Dev database ready: postgres://127.0.0.1:${PORT}/${settings.database}`);
console.warn(`Data folder: ${dbDir} (delete apps/api/.data to start fresh)`);

/**
 * A clean "fast" shutdown through pg_ctl keeps the data consistent (embedded-postgres
 * would force-kill the server on Windows). Committed data survives either way.
 */
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  stopEmbeddedPostgres(pg, dbDir);
  process.exit(0);
}
pg.process?.on("exit", (code) => {
  if (stopping) return;
  console.error(`PostgreSQL stopped unexpectedly (exit code ${code})`);
  process.exit(1);
});
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("SIGHUP", stop);
