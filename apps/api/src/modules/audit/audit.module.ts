import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditService } from "./application/audit.service";
import { AUDIT_ENTRY_MODEL, auditEntrySchema } from "./infrastructure/audit-entry.schema";
import { AuditRepository } from "./infrastructure/audit.repository";

@Module({
  imports: [MongooseModule.forFeature([{ name: AUDIT_ENTRY_MODEL, schema: auditEntrySchema }])],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
