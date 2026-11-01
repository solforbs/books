import "reflect-metadata";
import { existsSync } from "node:fs";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { configureApp, createFastifyAdapter } from "./bootstrap/configure-app";
import { safeErrorMessage } from "./common/errors/safe-error-message";
import { loadAppConfig } from "./config/app-config";

async function bootstrap(): Promise<void> {
  // Local development convenience; production gets real environment variables.
  if (existsSync(".env")) process.loadEnvFile(".env");
  const config = loadAppConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(config),
  );
  await configureApp(app, config);
  await app.listen(config.PORT, "0.0.0.0");
  new Logger("Bootstrap").log(`Books API listening on port ${config.PORT} (${config.NODE_ENV})`);
}

bootstrap().catch((err: unknown) => {
  console.error(safeErrorMessage(err));
  process.exit(1);
});
