import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AllExceptionsFilter } from "./common/errors/all-exceptions.filter";
import { DatabaseModule } from "./common/database/database.module";
import { CsrfGuard } from "./common/security/csrf.guard";
import { throttlerOptions } from "./common/security/rate-limit";
import { APP_CONFIG, type AppConfig } from "./config/app-config";
import { AppConfigModule } from "./config/config.module";
import { HealthController } from "./health/health.controller";
import { AuditModule } from "./modules/audit/audit.module";
import { BusinessModule } from "./modules/business/business.module";
import { AuthGuard } from "./modules/identity/api/auth.guard";
import { IdentityModule } from "./modules/identity/identity.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { StaffModule } from "./modules/staff/staff.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => throttlerOptions(config),
    }),
    AuditModule,
    IdentityModule,
    BusinessModule,
    LocationsModule,
    StaffModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Global guards run in this order: rate limit, CSRF header, then authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
})
export class AppModule {}
