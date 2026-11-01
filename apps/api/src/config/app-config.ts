import { z } from "zod";
import { parseTrustProxy, type TrustProxy } from "./trust-proxy";

/** Injection token for the validated configuration object. */
export const APP_CONFIG = Symbol("APP_CONFIG");

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const secret = z.string().min(32, "must be at least 32 characters");

const trustProxy = z
  .string()
  .default("false")
  .transform((raw, ctx): TrustProxy => {
    const parsed = parseTrustProxy(raw);
    if ("error" in parsed) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return false;
    }
    return parsed.value;
  });

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/\S+$/, "must be a postgres:// URL");

/** The placeholder secrets in .env.example all start with this. */
const PLACEHOLDER_SECRET_PREFIX = "replace-with";

export const appConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    /** The API's request role (books_app); row-level security applies to it. */
    DATABASE_URL: postgresUrl,
    /** The table owner (books_owner), used only to apply migrations at startup. */
    DATABASE_MIGRATION_URL: postgresUrl.optional(),
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    COOKIE_SECURE: booleanString,
    WEB_ORIGIN: z.url(),
    TRUST_PROXY: trustProxy,
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  })
  .refine((c) => c.JWT_ACCESS_SECRET !== c.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ",
    path: ["JWT_REFRESH_SECRET"],
  })
  .refine((c) => c.NODE_ENV !== "production" || c.COOKIE_SECURE, {
    message: "COOKIE_SECURE must be true in production",
    path: ["COOKIE_SECURE"],
  })
  .refine(
    (c) =>
      c.NODE_ENV !== "production" ||
      ![c.JWT_ACCESS_SECRET, c.JWT_REFRESH_SECRET].some((s) =>
        s.startsWith(PLACEHOLDER_SECRET_PREFIX),
      ),
    {
      message: "JWT secrets still hold the .env.example placeholder; generate real ones",
      path: ["JWT_ACCESS_SECRET"],
    },
  );

export type AppConfig = z.infer<typeof appConfigSchema>;

/**
 * Validates environment variables once at startup. Fails fast with a readable
 * list of problems; secret values are never echoed.
 */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = appConfigSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
