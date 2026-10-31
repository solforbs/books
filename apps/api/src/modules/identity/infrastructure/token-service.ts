import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { APP_CONFIG, type AppConfig } from "../../../config/app-config";
import { ACCESS_TOKEN_TTL_SECONDS } from "../domain/auth-policy";
import type { AccessTokenClaims } from "../domain/auth-context";

export type AccessVerification =
  { ok: true; claims: AccessTokenClaims } | { ok: false; reason: "expired" | "invalid" };

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  signAccess(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(
      { tenantId: claims.tenantId, role: claims.role, sid: claims.sid },
      {
        subject: claims.sub,
        secret: this.config.JWT_ACCESS_SECRET,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        algorithm: "HS256",
      },
    );
  }

  async verifyAccess(token: string): Promise<AccessVerification> {
    try {
      const p = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        secret: this.config.JWT_ACCESS_SECRET,
        algorithms: ["HS256"],
      });
      if (typeof p.sub !== "string" || typeof p.sid !== "string") {
        return { ok: false, reason: "invalid" };
      }
      return {
        ok: true,
        claims: { sub: p.sub, sid: p.sid, tenantId: p.tenantId ?? null, role: p.role ?? null },
      };
    } catch (err) {
      const expired = (err as Error).name === "TokenExpiredError";
      return { ok: false, reason: expired ? "expired" : "invalid" };
    }
  }

  /** Opaque 256-bit refresh token. */
  newRefreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  newSessionId(): string {
    return randomBytes(16).toString("hex");
  }

  /** Keyed hash so a database leak alone cannot be used to forge or look up tokens. */
  hashRefreshToken(token: string): string {
    return createHmac("sha256", this.config.JWT_REFRESH_SECRET).update(token).digest("hex");
  }

  /** Recovery codes carry ~79 random bits, so a plain SHA-256 is enough. */
  hashRecoveryCode(normalizedCode: string): string {
    return createHash("sha256").update(normalizedCode).digest("hex");
  }
}
