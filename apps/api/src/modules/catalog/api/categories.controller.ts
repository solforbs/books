import { Body, Controller, Get, Param, Patch, Post, HttpCode } from "@nestjs/common";
import {
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
  type CategoriesResponse,
  type CategoryResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import {
  CreateCategoryUseCase,
  type CreateCategoryInput,
} from "../application/create-category.use-case";
import { ListCategoriesUseCase } from "../application/list-categories.use-case";
import {
  UpdateCategoryUseCase,
  type UpdateCategoryInput,
} from "../application/update-category.use-case";

/** HTTP wiring only. Contract: packages/shared/src/contracts/product-categories.contract.ts. */
@Controller("product-categories")
export class CategoriesController {
  constructor(
    private readonly listUseCase: ListCategoriesUseCase,
    private readonly createUseCase: CreateCategoryUseCase,
    private readonly updateUseCase: UpdateCategoryUseCase,
  ) {}

  @RequireTenant()
  @Get()
  list(@CurrentAccess() access: TenantAccessContext): Promise<CategoriesResponse> {
    return this.listUseCase.execute(access);
  }

  @RequirePermission("manage_products")
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createCategoryRequestSchema)) body: CreateCategoryInput,
    @CurrentActor() actor: Actor,
  ): Promise<CategoryResponse> {
    return this.createUseCase.execute(actor, body);
  }

  @RequirePermission("manage_products")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCategoryRequestSchema)) body: UpdateCategoryInput,
    @CurrentActor() actor: Actor,
  ): Promise<CategoryResponse> {
    return this.updateUseCase.execute(actor, id, body);
  }
}
