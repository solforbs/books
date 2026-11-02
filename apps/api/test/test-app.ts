import "reflect-metadata";
import { randomBytes } from "node:crypto";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { AppModule } from "../src/app.module";
import { configureApp, createFastifyAdapter } from "../src/bootstrap/configure-app";
import { APP_CONFIG, loadAppConfig } from "../src/config/app-config";
import { createTestDatabase, pgUrl } from "./pg";

export interface TestApp {
  app: NestFastifyApplication;
  /**
   * Direct database access for arranging and inspecting test data, connected
   * as the table owner (the app itself runs as the restricted books_app role).
   */
  db: NodePgDatabase;
  /** Raw SQL as the table owner; returns the rows. */
  sql: <R = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<R[]>;
  /**
   * Raw SQL as the table owner inside one business: row-level security is FORCEd,
   * so even the owner sees tenant-owned rows only with `app.tenant_id` set.
   */
  tenantSql: <R = Record<string, unknown>>(
    tenantId: string,
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  database: string;
  close: () => Promise<void>;
}

/**
 * Boots the real AppModule against a fresh database: the app applies the
 * migrations itself at startup, exactly as in production. Secrets are random per run.
 */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const database = await createTestDatabase();
  const config = loadAppConfig({
    NODE_ENV: "test",
    DATABASE_URL: pgUrl("app", database),
    DATABASE_MIGRATION_URL: pgUrl("owner", database),
    JWT_ACCESS_SECRET: randomBytes(32).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(32).toString("hex"),
    COOKIE_SECURE: "false",
    WEB_ORIGIN: "http://localhost:5173",
    RATE_LIMIT_PER_MINUTE: "10000",
    AUTH_RATE_LIMIT_PER_MINUTE: "10000",
    ...env,
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter(config));
  await configureApp(app, config);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const ownerPool = new Pool({ connectionString: pgUrl("owner", database), max: 3 });
  return {
    app,
    db: drizzle(ownerPool),
    sql: async (text, params) => (await ownerPool.query(text, params)).rows,
    tenantSql: async (tenantId, text, params) => {
      const client = await ownerPool.connect();
      try {
        await client.query("begin");
        await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
        const { rows } = await client.query(text, params);
        await client.query("commit");
        return rows;
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },
    database,
    close: async () => {
      await app.close();
      await ownerPool.end();
    },
  };
}
