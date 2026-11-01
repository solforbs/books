import type { FastifyReply } from "fastify";
import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { HealthController } from "../health.controller";

function replyStub() {
  const reply = { statusCode: 200, status: (code: number) => ((reply.statusCode = code), reply) };
  return reply;
}

const poolThat = (query: () => Promise<unknown>) => ({ query }) as unknown as Pool;

describe("GET /health when PostgreSQL is unavailable", () => {
  it("reports db down with 503 when the query fails", async () => {
    const reply = replyStub();
    const body = await new HealthController(
      poolThat(() => Promise.reject(new Error("ECONNREFUSED"))),
    ).check(reply as unknown as FastifyReply);
    expect(body).toEqual({ status: "degraded", db: "down" });
    expect(reply.statusCode).toBe(503);
  });

  it("reports db down with 503 when the database hangs", async () => {
    const reply = replyStub();
    const body = await new HealthController(poolThat(() => new Promise(() => {}))).check(
      reply as unknown as FastifyReply,
    );
    expect(body).toEqual({ status: "degraded", db: "down" });
    expect(reply.statusCode).toBe(503);
  });
});
