import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  createMoneyPlaceRequestSchema,
  updateMoneyPlaceRequestSchema,
  type MoneyPlaceResponse,
  type MoneyPlacesResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import {
  CreateMoneyPlaceUseCase,
  type CreateMoneyPlaceInput,
} from "../application/create-money-place.use-case";
import { ListMoneyPlacesUseCase } from "../application/list-money-places.use-case";
import {
  UpdateMoneyPlaceUseCase,
  type UpdateMoneyPlaceInput,
} from "../application/update-money-place.use-case";

/** HTTP wiring only (F02 §3, F11 §3.4). Contract: locations.contract.ts. */
@Controller("money-places")
export class MoneyPlacesController {
  constructor(
    private readonly listUseCase: ListMoneyPlacesUseCase,
    private readonly createUseCase: CreateMoneyPlaceUseCase,
    private readonly updateUseCase: UpdateMoneyPlaceUseCase,
  ) {}

  @RequireTenant()
  @Get()
  list(@CurrentAccess() access: TenantAccessContext): Promise<MoneyPlacesResponse> {
    return this.listUseCase.execute(access);
  }

  @RequirePermission("manage_locations")
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createMoneyPlaceRequestSchema)) body: CreateMoneyPlaceInput,
    @CurrentActor() actor: Actor,
  ): Promise<MoneyPlaceResponse> {
    return this.createUseCase.execute(actor, body);
  }

  @RequirePermission("manage_locations")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMoneyPlaceRequestSchema)) body: UpdateMoneyPlaceInput,
    @CurrentActor() actor: Actor,
  ): Promise<MoneyPlaceResponse> {
    return this.updateUseCase.execute(actor, id, body);
  }
}
