import { Injectable } from "@nestjs/common";
import { RefreshSessionsRepository } from "../infrastructure/refresh-sessions.repository";
import { TokenService } from "../infrastructure/token-service";

/**
 * Ends the session behind the refresh cookie (and the access cookie's session,
 * if different). Always succeeds so a half-broken session can still log out.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessions: RefreshSessionsRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string | undefined, accessToken: string | undefined): Promise<void> {
    const families = new Set<string>();
    if (refreshToken) {
      const stored = await this.sessions.findByHash(this.tokens.hashRefreshToken(refreshToken));
      if (stored) families.add(stored.familyId);
    }
    if (accessToken) {
      const verified = await this.tokens.verifyAccess(accessToken);
      if (verified.ok) families.add(verified.claims.sid);
    }
    for (const familyId of families) await this.sessions.revokeFamily(familyId);
  }
}
