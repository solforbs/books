import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { CLIENT_HEADER } from "@books/shared";
import type { AppConfig } from "../config/app-config";
import { toFastifyTrustProxy } from "../config/trust-proxy";
import { allowEmptyJsonBody } from "./empty-json-body";

export const API_PREFIX = "api/v1";

/**
 * `trustProxy` is a hop count or a proxy allow-list, never `true` (see
 * config/trust-proxy.ts). With `1`, `req.ip` is the right-most
 * `X-Forwarded-For` entry, i.e. what our own nginx saw; anything a client
 * prepends to the header is ignored.
 */
export function createFastifyAdapter(config: AppConfig): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: toFastifyTrustProxy(config.TRUST_PROXY),
    bodyLimit: 1_048_576,
  });
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
  allowEmptyJsonBody(app);
  // Fastify-level errors (bad JSON, body too large) are routed by Nest to the
  // global AllExceptionsFilter, so they get the same error shape.
  app.enableShutdownHooks();
}
