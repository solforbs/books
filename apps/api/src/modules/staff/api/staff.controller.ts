import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  createStaffRequestSchema,
  updateStaffRequestSchema,
  type CreateStaffResponse,
  type LoginHistoryResponse,
  type ResetPasswordResponse,
  type StaffListResponse,
  type StaffMemberResponse,
} from "@books/shared";
import { StrictRateLimit } from "../../../common/security/rate-limit";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentActor } from "../../identity/api/current-user.decorator";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { AddStaffUseCase, type AddStaffInput } from "../application/add-staff.use-case";
import { ListStaffUseCase } from "../application/list-staff.use-case";
import { LoginHistoryUseCase } from "../application/login-history.use-case";
import { ResetStaffPasswordUseCase } from "../application/reset-staff-password.use-case";
import { SwitchOffStaffUseCase } from "../application/switch-off-staff.use-case";
import { SwitchOnStaffUseCase } from "../application/switch-on-staff.use-case";
import { UpdateStaffUseCase, type UpdateStaffInput } from "../application/update-staff.use-case";

/**
 * HTTP wiring only. Who may call what is decided in the use cases (owner, or
 * `add_staff` limited to cashiers/storekeepers at the caller's own locations),
 * because it depends on the person being changed. Contract: staff.contract.ts.
 */
@RequireTenant()
@Controller("staff")
export class StaffController {
  constructor(
    private readonly listUseCase: ListStaffUseCase,
    private readonly addUseCase: AddStaffUseCase,
    private readonly updateUseCase: UpdateStaffUseCase,
    private readonly switchOffUseCase: SwitchOffStaffUseCase,
    private readonly switchOnUseCase: SwitchOnStaffUseCase,
    private readonly resetUseCase: ResetStaffPasswordUseCase,
    private readonly historyUseCase: LoginHistoryUseCase,
  ) {}

  @Get()
  list(@CurrentAccess() access: TenantAccessContext): Promise<StaffListResponse> {
    return this.listUseCase.execute(access);
  }

  @Post()
  @HttpCode(201)
  add(
    @Body(new ZodValidationPipe(createStaffRequestSchema)) body: AddStaffInput,
    @CurrentActor() actor: Actor,
  ): Promise<CreateStaffResponse> {
    return this.addUseCase.execute(actor, body);
  }

  @Patch(":membershipId")
  update(
    @Param("membershipId") membershipId: string,
    @Body(new ZodValidationPipe(updateStaffRequestSchema)) body: UpdateStaffInput,
    @CurrentActor() actor: Actor,
  ): Promise<StaffMemberResponse> {
    return this.updateUseCase.execute(actor, membershipId, body);
  }

  @Post(":membershipId/switch-off")
  @HttpCode(200)
  switchOff(
    @Param("membershipId") membershipId: string,
    @CurrentActor() actor: Actor,
  ): Promise<StaffMemberResponse> {
    return this.switchOffUseCase.execute(actor, membershipId);
  }

  @Post(":membershipId/switch-on")
  @HttpCode(200)
  switchOn(
    @Param("membershipId") membershipId: string,
    @CurrentActor() actor: Actor,
  ): Promise<StaffMemberResponse> {
    return this.switchOnUseCase.execute(actor, membershipId);
  }

  @StrictRateLimit()
  @Post(":membershipId/reset-password")
  @HttpCode(200)
  resetPassword(
    @Param("membershipId") membershipId: string,
    @CurrentActor() actor: Actor,
  ): Promise<ResetPasswordResponse> {
    return this.resetUseCase.execute(actor, membershipId);
  }

  @Get(":membershipId/logins")
  logins(
    @Param("membershipId") membershipId: string,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<LoginHistoryResponse> {
    return this.historyUseCase.execute(access, membershipId);
  }
}
