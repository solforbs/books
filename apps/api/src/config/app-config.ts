import { z } from "zod";

/** Injection token for the validated configuration object. */
export const APP_CONFIG = Symbol("APP_CONFIG");

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const secret = z.string().min(32, "must be at least 32 characters");

export const appConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "must be a mongodb:// URI"),
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    COOKIE_SECURE: booleanString,
    WEB_ORIGIN: z.string().url(),
    TRUST_PROXY: booleanString,
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
  });

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
