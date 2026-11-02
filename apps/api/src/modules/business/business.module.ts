import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { BusinessController } from "./api/business.controller";
import { GetBusinessUseCase } from "./application/get-business.use-case";
import { UpdateBusinessUseCase } from "./application/update-business.use-case";

/**
 * Business details for documents and business settings (F02, G3). The data
 * lives on the tenants row (identity's table), reached via BusinessDirectory.
 */
@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [BusinessController],
  providers: [GetBusinessUseCase, UpdateBusinessUseCase],
})
export class BusinessModule {}
