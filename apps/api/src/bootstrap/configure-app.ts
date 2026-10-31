import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { CLIENT_HEADER } from "@books/shared";
import type { AppConfig } from "../config/app-config";

export const API_PREFIX = "api/v1";

export function createFastifyAdapter(config: AppConfig): FastifyAdapter {
  return new FastifyAdapter({ trustProxy: config.TRUST_PROXY, bodyLimit: 1_048_576 });
}

/**
 * Everything HTTP-level that main.ts and the tests share. Must run before
 * `app.init()` / `app.listen()` so it applies to every route.
 */
export async function configureApp(app: NestFastifyApplication, config: AppConfig): Promise<void> {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    allowedHeaders: ["content-type", CLIENT_HEADER],
  });
  await app.register(fastifyHelmet);
  await app.register(fastifyCookie);
  // Fastify-level errors (bad JSON, body too large) are routed by Nest to the
  // global AllExceptionsFilter, so they get the same error shape.
  app.enableShutdownHooks();
}
