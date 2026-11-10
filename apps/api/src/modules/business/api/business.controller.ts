import { Body, Controller, Get, Put } from "@nestjs/common";
import { updateBusinessRequestSchema, type BusinessResponse } from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentActor, CurrentTenant } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import { GetBusinessUseCase } from "../application/get-business.use-case";
import {
  UpdateBusinessUseCase,
  type UpdateBusinessInput,
} from "../application/update-business.use-case";

/** HTTP wiring only. Contract: packages/shared/src/contracts/business.contract.ts. */
@Controller("business")
export class BusinessController {
  constructor(
    private readonly getUseCase: GetBusinessUseCase,
    private readonly updateUseCase: UpdateBusinessUseCase,
  ) {}

  @RequireTenant()
  @Get()
  get(@CurrentTenant() tenantId: string): Promise<BusinessResponse> {
    return this.getUseCase.execute(tenantId);
  }

  @RequirePermission("manage_business")
  @Put()
  update(
    @Body(new ZodValidationPipe(updateBusinessRequestSchema)) body: UpdateBusinessInput,
    @CurrentActor() actor: Actor,
  ): Promise<BusinessResponse> {
    return this.updateUseCase.execute(actor, body);
  }
}
