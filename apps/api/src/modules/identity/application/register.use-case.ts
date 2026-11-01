import { Inject, Injectable } from "@nestjs/common";
import type { RegisterResponse, registerRequestSchema } from "@books/shared";
import type { z } from "zod";
import { DB, type Database } from "../../../common/database/database.types";
import { isUniqueViolation } from "../../../common/database/pg-errors";
import type { RequestMeta } from "../../../common/security/request-meta";
import { AuditService } from "../../audit/application/audit.service";
import { generateRecoveryCodes, normalizeRecoveryCode } from "../domain/recovery-codes";
import { IdentityErrors } from "../domain/identity-errors";
import { MembershipsRepository } from "../infrastructure/memberships.repository";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { RecoveryCodesRepository } from "../infrastructure/recovery-codes.repository";
import { TenantsRepository } from "../infrastructure/tenants.repository";
import { TokenService } from "../infrastructure/token-service";
import { UsersRepository } from "../infrastructure/users.repository";
import { SessionIssuer, type IssuedTokens } from "./session-issuer";
import { SessionView } from "./session-view";

export type RegisterInput = z.output<typeof registerRequestSchema>;

/** Owner sign-up: business + owner + owner membership + recovery codes, all or nothing. */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly users: UsersRepository,
    private readonly tenants: TenantsRepository,
    private readonly memberships: MembershipsRepository,
    private readonly recoveryCodes: RecoveryCodesRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly issuer: SessionIssuer,
    private readonly view: SessionView,
    private readonly audit: AuditService,
  ) {}

  async execute(
    input: RegisterInput,
    meta: RequestMeta,
  ): Promise<{ response: RegisterResponse; tokens: IssuedTokens }> {
    if (await this.users.existsWith(input.phone, input.email)) {
      throw IdentityErrors.identifierTaken();
    }
    const passwordHash = await this.hasher.hash(input.password);
    const codes = generateRecoveryCodes();
    const codeHashes = codes.map((c) => this.tokens.hashRecoveryCode(normalizeRecoveryCode(c)));

    const { user, tenantId } = await this.db
      .transaction(async (tx) => {
        const user = await this.users.create(
          {
            name: input.ownerName,
            phone: input.phone,
            email: input.email,
            passwordHash,
            language: input.language,
          },
          tx,
        );
        const tenant = await this.tenants.create(input.businessName, user.id, tx);
        await this.memberships.create(user.id, tenant.id, "owner", tx);
        await this.recoveryCodes.createMany(user.id, codeHashes, tx);
        return { user, tenantId: tenant.id };
      })
      .catch((err: unknown) => {
        // Lost a race with a concurrent sign-up using the same phone/email: the
        // unique index rejects the second insert and the whole transaction rolls back.
        if (isUniqueViolation(err)) throw IdentityErrors.identifierTaken();
        throw err;
      });

    const userId = user.id;
    const active = { tenantId, role: "owner" as const };
    const tokens = await this.issuer.start(userId, active, meta);
    await this.audit.record({
      action: "register",
      outcome: "success",
      tenantId,
      userId,
      identifier: input.phone ?? input.email,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const memberships = await this.view.membershipsOf(userId);
    const session = this.view.build(user, memberships, tenantId);
    return { response: { ...session, recoveryCodes: codes }, tokens };
  }
}
