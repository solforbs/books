import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./api/auth.controller";
import { AuthCookies } from "./api/auth-cookies";
import { AuthGuard } from "./api/auth.guard";
import { RequireTenantGuard } from "./api/require-tenant.guard";
import { ChangePasswordUseCase } from "./application/change-password.use-case";
import { GetSessionUseCase } from "./application/get-session.use-case";
import { IdentityService } from "./application/identity.service";
import { LoginUseCase } from "./application/login.use-case";
import { LogoutUseCase } from "./application/logout.use-case";
import { PasswordAttempts } from "./application/password-attempts";
import { RecoverUseCase } from "./application/recover.use-case";
import { RefreshUseCase } from "./application/refresh.use-case";
import { RegisterUseCase } from "./application/register.use-case";
import { SelectBusinessUseCase } from "./application/select-business.use-case";
import { SessionIssuer } from "./application/session-issuer";
import { SessionView } from "./application/session-view";
import { TenantAccess } from "./application/tenant-access";
import { MembershipsRepository } from "./infrastructure/memberships.repository";
import { PasswordHasher } from "./infrastructure/password-hasher";
import { RecoveryCodesRepository } from "./infrastructure/recovery-codes.repository";
import { RefreshSessionPurger } from "./infrastructure/refresh-session-purger";
import { RefreshSessionsRepository } from "./infrastructure/refresh-sessions.repository";
import { TenantsRepository } from "./infrastructure/tenants.repository";
import { TokenService } from "./infrastructure/token-service";
import { UsersRepository } from "./infrastructure/users.repository";

/** Businesses (tenants), users, memberships, sessions, login (ARCH-01 §5, §8). */
@Module({
  imports: [JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [
    UsersRepository,
    TenantsRepository,
    MembershipsRepository,
    RefreshSessionsRepository,
    RecoveryCodesRepository,
    RefreshSessionPurger,
    PasswordHasher,
    TokenService,
    SessionIssuer,
    SessionView,
    PasswordAttempts,
    TenantAccess,
    IdentityService,
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
  exports: [AuthGuard, RequireTenantGuard, TenantAccess, IdentityService],
})
export class IdentityModule {}
