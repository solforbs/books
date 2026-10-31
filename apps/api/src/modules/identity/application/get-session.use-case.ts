import { Injectable } from "@nestjs/common";
import type { SessionResponse } from "@books/shared";
import type { AuthContext } from "../domain/auth-context";
import { IdentityErrors } from "../domain/identity-errors";
import { UsersRepository } from "../infrastructure/users.repository";
import { SessionView } from "./session-view";

/** `GET /auth/me`: the current user, their businesses and the active one. */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly view: SessionView,
  ) {}

  async execute(auth: AuthContext): Promise<SessionResponse> {
    const user = await this.users.findById(auth.userId);
    if (!user || user.status !== "active") throw IdentityErrors.sessionExpired();
    const memberships = await this.view.membershipsOf(auth.userId);
    const stillMember = memberships.some((m) => m.tenantId === auth.tenantId);
    return this.view.build(user, memberships, stillMember ? auth.tenantId : null);
  }
}
