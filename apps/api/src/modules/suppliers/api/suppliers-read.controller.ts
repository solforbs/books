import { Controller, Get, Param, Query } from "@nestjs/common";
import type { SupplierResponse, SuppliersResponse } from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess } from "../../identity/api/current-user.decorator";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { GetSupplierUseCase } from "../application/get-supplier.use-case";
import { ListSuppliersUseCase } from "../application/list-suppliers.use-case";
import { supplierListQuerySchema, waitingSuppliersQuerySchema } from "./supplier-queries";

type ListQuery = ReturnType<typeof supplierListQuerySchema.parse>;

/**
 * Read endpoints of F03. Contract: packages/shared/src/contracts/suppliers.contract.ts. The
 * permission (manage_suppliers or receive_stock; approve_items for the waiting list) is checked
 * from the membership read on this request, inside the use case.
 */
@Controller("suppliers")
export class SuppliersReadController {
  constructor(
    private readonly listUseCase: ListSuppliersUseCase,
    private readonly getUseCase: GetSupplierUseCase,
  ) {}

  @RequireTenant()
  @Get()
  list(
    @Query(new ZodValidationPipe(supplierListQuerySchema)) query: ListQuery,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<SuppliersResponse> {
    return this.listUseCase.list(access, query);
  }

  @RequireTenant()
  @Get("waiting")
  waiting(
    @Query(new ZodValidationPipe(waitingSuppliersQuerySchema))
    query: Pick<ListQuery, "limit" | "cursor">,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<SuppliersResponse> {
    return this.listUseCase.waiting(access, query);
  }

  @RequireTenant()
  @Get(":id")
  one(
    @Param("id") id: string,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<SupplierResponse> {
    return this.getUseCase.execute(access, id);
  }
}
