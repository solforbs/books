import "reflect-metadata";
import { randomBytes } from "node:crypto";
import { getConnectionToken } from "@nestjs/mongoose";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import type { Connection } from "mongoose";
import { inject } from "vitest";
import { AppModule } from "../src/app.module";
import { configureApp, createFastifyAdapter } from "../src/bootstrap/configure-app";
import { APP_CONFIG, loadAppConfig } from "../src/config/app-config";

export interface TestApp {
  app: NestFastifyApplication;
  db: Connection;
  close: () => Promise<void>;
}

function uriWithDatabase(uri: string, dbName: string): string {
  const url = new URL(uri);
  url.pathname = `/${dbName}`;
  return url.toString();
}

/** Boots the real AppModule against a fresh database. Secrets are random per run. */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const dbName = `books_test_${randomBytes(6).toString("hex")}`;
  const config = loadAppConfig({
    NODE_ENV: "test",
    MONGODB_URI: uriWithDatabase(inject("mongoUri"), dbName),
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
  const db = app.get<Connection>(getConnectionToken());
  return {
    app,
    db,
    close: async () => {
      await db.dropDatabase();
      await app.close();
    },
  };
}
