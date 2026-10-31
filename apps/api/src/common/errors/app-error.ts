import { HttpException } from "@nestjs/common";

/**
 * The only error type use cases throw on purpose. The global filter turns it
 * into `{ error: { code, message, details? } }`; `code` is stable and the web
 * app translates it, `message` is a developer-facing English hint.
 */
export class AppError extends HttpException {
  constructor(
    readonly httpStatus: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, httpStatus);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (code: string, message: string) => new AppError(401, code, message);
export const forbidden = (code: string, message: string) => new AppError(403, code, message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
