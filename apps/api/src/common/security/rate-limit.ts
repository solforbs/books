import { ExecutionContext, SetMetadata } from "@nestjs/common";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";
import type { AppConfig } from "../../config/app-config";

const STRICT_RATE_LIMIT_KEY = "books:strictRateLimit";
const MINUTE_MS = 60_000;

/** Marks a route (login, register, recover) for the stricter per-IP limit. */
export const StrictRateLimit = () => SetMetadata(STRICT_RATE_LIMIT_KEY, true);

function isStrict(context: ExecutionContext): boolean {
  return Reflect.getMetadata(STRICT_RATE_LIMIT_KEY, context.getHandler()) === true;
}

/** Two named throttlers: a general one on every route, a strict one only on marked routes. */
export function throttlerOptions(config: AppConfig): ThrottlerModuleOptions {
  return {
    throttlers: [
      { name: "default", ttl: MINUTE_MS, limit: config.RATE_LIMIT_PER_MINUTE },
      {
        name: "auth",
        ttl: MINUTE_MS,
        limit: config.AUTH_RATE_LIMIT_PER_MINUTE,
        skipIf: (context) => !isStrict(context),
      },
    ],
  };
}
