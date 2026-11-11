import { Body, Controller, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  approveSupplierRequestSchema,
  createSupplierRequestSchema,
  quickSupplierRequestSchema,
  updateSupplierRequestSchema,
  type SupplierResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import {
  ApproveSupplierUseCase,
  type ApproveSupplierInput,
} from "../application/approve-supplier.use-case";
import {
  CreateSupplierUseCase,
  type CreateSupplierInput,
} from "../application/create-supplier.use-case";
import { HideSupplierUseCase } from "../application/hide-supplier.use-case";
import {
  QuickAddSupplierUseCase,
  type QuickSupplierInput,
} from "../application/quick-add-supplier.use-case";
import { UnhideSupplierUseCase } from "../application/unhide-supplier.use-case";
import {
  UpdateSupplierUseCase,
  type UpdateSupplierInput,
} from "../application/update-supplier.use-case";

/** Phone is optional here only so that a missing one is answered with `phone_required`. */
const approveBodySchema = approveSupplierRequestSchema.partial({ phone: true });

/** Write endpoints of F03. Contract: packages/shared/src/contracts/suppliers.contract.ts. */
@Controller("suppliers")
export class SuppliersWriteController {
  constructor(
    private readonly createUseCase: CreateSupplierUseCase,
    private readonly quickUseCase: QuickAddSupplierUseCase,
    private readonly updateUseCase: UpdateSupplierUseCase,
    private readonly approveUseCase: ApproveSupplierUseCase,
    private readonly hideUseCase: HideSupplierUseCase,
    private readonly unhideUseCase: UnhideSupplierUseCase,
  ) {}

  @RequirePermission("manage_suppliers")
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createSupplierRequestSchema)) body: CreateSupplierInput,
    @CurrentActor() actor: Actor,
  ): Promise<SupplierResponse> {
    return this.createUseCase.execute(actor, body);
  }

  // The permission rule (receive_stock, but not manage_suppliers) lives in the use case.
  @RequireTenant()
  @Post("quick")
  @HttpCode(201)
  quick(
    @Body(new ZodValidationPipe(quickSupplierRequestSchema)) body: QuickSupplierInput,
    @CurrentActor() actor: Actor,
  ): Promise<SupplierResponse> {
    return this.quickUseCase.execute(actor, body);
  }

  @RequirePermission("manage_suppliers")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSupplierRequestSchema)) body: UpdateSupplierInput,
    @CurrentActor() actor: Actor,
  ): Promise<SupplierResponse> {
    return this.updateUseCase.execute(actor, id, body);
  }

  @RequirePermission("approve_items")
  @Post(":id/approve")
  @HttpCode(200)
  approve(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(approveBodySchema)) body: ApproveSupplierInput,
    @CurrentActor() actor: Actor,
  ): Promise<SupplierResponse> {
    return this.approveUseCase.execute(actor, id, body);
  }

  @RequirePermission("manage_suppliers")
  @Post(":id/hide")
  @HttpCode(200)
  hide(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<SupplierResponse> {
    return this.hideUseCase.execute(actor, id);
  }

  @RequirePermission("manage_suppliers")
  @Post(":id/unhide")
  @HttpCode(200)
  unhide(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<SupplierResponse> {
    return this.unhideUseCase.execute(actor, id);
  }
}
