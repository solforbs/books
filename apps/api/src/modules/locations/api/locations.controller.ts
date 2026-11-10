import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  createLocationRequestSchema,
  updateLocationRequestSchema,
  type LocationResponse,
  type LocationsResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { CloseLocationUseCase } from "../application/close-location.use-case";
import {
  CreateLocationUseCase,
  type CreateLocationInput,
} from "../application/create-location.use-case";
import { ListLocationsUseCase } from "../application/list-locations.use-case";
import { ReopenLocationUseCase } from "../application/reopen-location.use-case";
import {
  UpdateLocationUseCase,
  type UpdateLocationInput,
} from "../application/update-location.use-case";

/** HTTP wiring only (F02 §3). Contract: packages/shared/src/contracts/locations.contract.ts. */
@Controller("locations")
export class LocationsController {
  constructor(
    private readonly listUseCase: ListLocationsUseCase,
    private readonly createUseCase: CreateLocationUseCase,
    private readonly updateUseCase: UpdateLocationUseCase,
    private readonly closeUseCase: CloseLocationUseCase,
    private readonly reopenUseCase: ReopenLocationUseCase,
  ) {}

  @RequireTenant()
  @Get()
  list(@CurrentAccess() access: TenantAccessContext): Promise<LocationsResponse> {
    return this.listUseCase.execute(access);
  }

  @RequirePermission("manage_locations")
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createLocationRequestSchema)) body: CreateLocationInput,
    @CurrentActor() actor: Actor,
  ): Promise<LocationResponse> {
    return this.createUseCase.execute(actor, body);
  }

  @RequirePermission("manage_locations")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLocationRequestSchema)) body: UpdateLocationInput,
    @CurrentActor() actor: Actor,
  ): Promise<LocationResponse> {
    return this.updateUseCase.execute(actor, id, body);
  }

  @RequirePermission("manage_locations")
  @Post(":id/close")
  @HttpCode(200)
  close(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<LocationResponse> {
    return this.closeUseCase.execute(actor, id);
  }

  @RequirePermission("manage_locations")
  @Post(":id/reopen")
  @HttpCode(200)
  reopen(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<LocationResponse> {
    return this.reopenUseCase.execute(actor, id);
  }
}
