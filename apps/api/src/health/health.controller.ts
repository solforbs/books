import { Controller, Get, Res } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { FastifyReply } from "fastify";
import type { Connection } from "mongoose";
import { Public } from "../common/security/public.decorator";

export interface HealthResponse {
  status: "ok" | "degraded";
  db: "up" | "down";
}

/** Liveness + database reachability, for Docker and the reverse proxy. 503 when the DB is down. */
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthResponse> {
    const up = await this.pingDatabase();
    if (!up) void reply.status(503);
    return { status: up ? "ok" : "degraded", db: up ? "up" : "down" };
  }

  private async pingDatabase(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) return false;
    try {
      await this.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
