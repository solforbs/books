import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { toErrorResult } from "./to-error-body";

/** Global filter: every error leaves the API as `{ error: { code, message, details? } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Errors");

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const { status, body } = toErrorResult(exception);
    if (status >= 500) {
      // Stack only; request bodies are never logged (they may hold passwords).
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    void reply.status(status).send(body);
  }
}
