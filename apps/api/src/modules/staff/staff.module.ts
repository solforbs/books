import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { LocationsModule } from "../locations/locations.module";
import { MeController } from "./api/me.controller";
import { StaffController } from "./api/staff.controller";
import { AddStaffUseCase } from "./application/add-staff.use-case";
import { ListStaffUseCase } from "./application/list-staff.use-case";
import { LoginHistoryUseCase } from "./application/login-history.use-case";
import { MyAccessUseCase } from "./application/my-access.use-case";
import { ResetStaffPasswordUseCase } from "./application/reset-staff-password.use-case";
import { StaffMembers } from "./application/staff-members";
import { SwitchOffStaffUseCase } from "./application/switch-off-staff.use-case";
import { SwitchOnStaffUseCase } from "./application/switch-on-staff.use-case";
import { UpdateStaffUseCase } from "./application/update-staff.use-case";

/**
 * Staff management (F02 §4) and `GET /me/permissions`. A module of its own
 * because it combines two others: people and memberships belong to identity,
 * locations to the locations module (which itself needs identity's guards, so
 * identity cannot depend on locations). Staff holds the rules; identity's
 * MembersService only reads and writes.
 */
@Module({
  imports: [IdentityModule, LocationsModule, AuditModule],
  controllers: [StaffController, MeController],
  providers: [
    StaffMembers,
    ListStaffUseCase,
    AddStaffUseCase,
    UpdateStaffUseCase,
    SwitchOffStaffUseCase,
    SwitchOnStaffUseCase,
    ResetStaffPasswordUseCase,
    LoginHistoryUseCase,
    MyAccessUseCase,
  ],
})
export class StaffModule {}
