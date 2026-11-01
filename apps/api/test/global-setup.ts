import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import type { GlobalSetupContext } from "vitest/node";
import { stopEmbeddedPostgres } from "../scripts/embedded-pg-stop.mjs";
import { provisionRoles } from "../scripts/pg-provision.mjs";

export interface PgTestServer {
  host: string;
  port: number;
  adminPassword: string;
  ownerPassword: string;
  appPassword: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    pg: PgTestServer;
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

/**
 * One throw-away embedded PostgreSQL 17 for the whole run, with the same
 * books_owner / books_app roles as development and production. Each test app
 * gets its own database inside it (test/pg.ts). Durability is switched off:
 * the data dies with the run anyway.
 */
export default async function setup({ provide }: GlobalSetupContext) {
  const secret = () => randomBytes(18).toString("hex");
  const server: PgTestServer = {
    host: "127.0.0.1",
    port: await freePort(),
    adminPassword: secret(),
    ownerPassword: secret(),
    appPassword: secret(),
  };
  const dataDir = await mkdtemp(join(tmpdir(), "books-test-pg-"));
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: server.port,
    user: "postgres",
    password: server.adminPassword,
    authMethod: "scram-sha-256",
    // We delete the folder ourselves, after a clean stop (see below).
    persistent: true,
    initdbFlags: ["--no-sync"],
    postgresFlags: [
      ...["-c", "listen_addresses=127.0.0.1", "-c", "max_connections=400"],
      ...["-c", "fsync=off", "-c", "synchronous_commit=off", "-c", "full_page_writes=off"],
    ],
    onLog: () => {},
  });
  await pg.initialise();
  await pg.start();

  const admin = pg.getPgClient("postgres", server.host);
  await admin.connect();
  try {
    await provisionRoles(admin, server);
  } finally {
    await admin.end();
  }
  provide("pg", server);
  return async () => {
    stopEmbeddedPostgres(pg, dataDir, "immediate");
    // Windows may hold file handles for a moment after the server exits.
    await rm(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  };
}
