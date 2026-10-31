import type { NestFastifyApplication } from "@nestjs/platform-fastify";

/**
 * Fastify rejects `Content-Type: application/json` requests with an empty body.
 * Body-less POSTs such as /auth/refresh and /auth/logout are legitimately sent
 * that way by some clients and proxies. When the body length is zero we drop the
 * content type before parsing, so the request is treated as having no body.
 * Nest registers its own JSON parser at init, so we must not replace it here.
 * Malformed non-empty JSON still fails with a 400 from the global exception filter.
 */
export function allowEmptyJsonBody(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onRequest", (request, _reply, done) => {
    const headers = request.raw.headers;
    const isJson = headers["content-type"]?.startsWith("application/json") ?? false;
    const length = headers["content-length"];
    const hasNoBody = length === "0" || (length === undefined && !headers["transfer-encoding"]);
    if (isJson && hasNoBody) delete headers["content-type"];
    done();
  });
}
