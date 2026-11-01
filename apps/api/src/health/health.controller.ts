import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { Pool } from "pg";
import { PG_POOL } from "../common/database/database.types";
import { Public } from "../common/security/public.decorator";

export interface HealthResponse {
  status: "ok" | "degraded";
  db: "up" | "down";
}

/** How long the probe waits for PostgreSQL before reporting it down. */
const PING_TIMEOUT_MS = 2_000;

/** Liveness + database reachability, for Docker and the reverse proxy. 503 when the DB is down. */
@Controller("health")
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthResponse> {
    const up = await this.pingDatabase();
    if (!up) void reply.status(503);
    return { status: up ? "ok" : "degraded", db: up ? "up" : "down" };
  }

  private async pingDatabase(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), PING_TIMEOUT_MS);
    });
    const ping = this.pool.query("select 1").then(
      () => true,
      () => false,
    );
    try {
      return await Promise.race([ping, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
