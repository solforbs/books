import { Module, OnModuleInit } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { InjectConnection, MongooseModule } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./api/auth.controller";
import { AuthCookies } from "./api/auth-cookies";
import { AuthGuard } from "./api/auth.guard";
import { RequireTenantGuard } from "./api/require-tenant.guard";
import { ChangePasswordUseCase } from "./application/change-password.use-case";
import { GetSessionUseCase } from "./application/get-session.use-case";
import { LoginUseCase } from "./application/login.use-case";
import { LogoutUseCase } from "./application/logout.use-case";
import { RecoverUseCase } from "./application/recover.use-case";
import { RefreshUseCase } from "./application/refresh.use-case";
import { RegisterUseCase } from "./application/register.use-case";
import { SelectBusinessUseCase } from "./application/select-business.use-case";
import { SessionIssuer } from "./application/session-issuer";
import { SessionView } from "./application/session-view";
import { MembershipsRepository } from "./infrastructure/memberships.repository";
import { PasswordHasher } from "./infrastructure/password-hasher";
import { RecoveryCodesRepository } from "./infrastructure/recovery-codes.repository";
import { RefreshSessionsRepository } from "./infrastructure/refresh-sessions.repository";
import { MEMBERSHIP_MODEL, membershipSchema } from "./infrastructure/schemas/membership.schema";
import {
  RECOVERY_CODE_MODEL,
  recoveryCodeSchema,
} from "./infrastructure/schemas/recovery-code.schema";
import {
  REFRESH_SESSION_MODEL,
  refreshSessionSchema,
} from "./infrastructure/schemas/refresh-session.schema";
import { TENANT_MODEL, tenantSchema } from "./infrastructure/schemas/tenant.schema";
import { USER_MODEL, userSchema } from "./infrastructure/schemas/user.schema";
import { TenantsRepository } from "./infrastructure/tenants.repository";
import { TokenService } from "./infrastructure/token-service";
import { UsersRepository } from "./infrastructure/users.repository";

const MODELS = [
  { name: USER_MODEL, schema: userSchema },
  { name: TENANT_MODEL, schema: tenantSchema },
  { name: MEMBERSHIP_MODEL, schema: membershipSchema },
  { name: REFRESH_SESSION_MODEL, schema: refreshSessionSchema },
  { name: RECOVERY_CODE_MODEL, schema: recoveryCodeSchema },
];

/** Businesses (tenants), users, memberships, sessions, login (ARCH-01 §5, §8). */
@Module({
  imports: [MongooseModule.forFeature(MODELS), JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [
    UsersRepository,
    TenantsRepository,
    MembershipsRepository,
    RefreshSessionsRepository,
    RecoveryCodesRepository,
    PasswordHasher,
    TokenService,
    SessionIssuer,
    SessionView,
    AuthCookies,
    RegisterUseCase,
    LoginUseCase,
    SelectBusinessUseCase,
    RefreshUseCase,
    LogoutUseCase,
    GetSessionUseCase,
    ChangePasswordUseCase,
    RecoverUseCase,
    RequireTenantGuard,
    AuthGuard,
  ],
  exports: [AuthGuard, RequireTenantGuard],
})
export class IdentityModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Create collections and unique indexes up front: a transaction cannot build
   * an index, and duplicate phones must be impossible from the first sign-up.
   */
  async onModuleInit(): Promise<void> {
    await Promise.all(MODELS.map((m) => this.connection.model(m.name).init()));
  }
}
