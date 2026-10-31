import { HttpException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import type { ApiError } from "@books/shared";
import { AppError } from "./app-error";

export interface ErrorResult {
  status: number;
  body: ApiError;
}

interface ZodLikeError {
  name: string;
  issues: { path: (string | number)[]; message: string; code: string }[];
}

/** Duck-typed so it works even if two copies of zod are loaded (ESM + CJS). */
function isZodError(err: unknown): err is ZodLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "not_authenticated",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  413: "payload_too_large",
  415: "unsupported_media_type",
  429: "too_many_requests",
};

function body(code: string, message: string, details?: unknown): ApiError {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Maps any thrown value to the API's single error shape. Unknown errors become 500. */
export function toErrorResult(err: unknown): ErrorResult {
  if (err instanceof AppError) {
    return { status: err.httpStatus, body: body(err.code, err.message, err.details) };
  }
  if (isZodError(err)) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return { status: 400, body: body("validation_failed", "Request validation failed", details) };
  }
  if (err instanceof ThrottlerException) {
    return { status: 429, body: body("too_many_requests", "Too many requests, slow down") };
  }
  if (err instanceof HttpException) {
    const status = err.getStatus();
    const code = STATUS_CODES[status] ?? (status >= 500 ? "internal_error" : "bad_request");
    return { status, body: body(code, status >= 500 ? "Internal server error" : err.message) };
  }
  const statusCode = (err as { statusCode?: unknown } | null)?.statusCode;
  if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
    // Fastify-level errors (malformed JSON, body too large, ...).
    const code = STATUS_CODES[statusCode] ?? "bad_request";
    return { status: statusCode, body: body(code, (err as Error).message) };
  }
  return { status: 500, body: body("internal_error", "Internal server error") };
}
