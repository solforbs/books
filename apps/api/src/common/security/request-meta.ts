import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

/** Who/where a request came from, for sessions and the audit log. */
export interface RequestMeta {
  ip: string;
  userAgent: string;
}

export function requestMetaOf(req: FastifyRequest): RequestMeta {
  const ua = req.headers["user-agent"];
  return { ip: req.ip, userAgent: (typeof ua === "string" ? ua : "").slice(0, 200) };
}

export const ReqMeta = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestMeta => {
  return requestMetaOf(ctx.switchToHttp().getRequest<FastifyRequest>());
});
