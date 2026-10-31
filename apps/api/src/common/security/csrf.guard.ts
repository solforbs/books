import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@books/shared";
import { forbidden } from "../errors/app-error";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence on top of SameSite=Strict cookies: every state-changing request
 * must carry `x-books-client: web`. Browsers cannot add custom headers to
 * cross-site form posts, and CORS blocks them for cross-origin fetches.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (req.headers[CLIENT_HEADER] === CLIENT_HEADER_VALUE) return true;
    throw forbidden("csrf_header_missing", `Header ${CLIENT_HEADER} is required`);
  }
}
