import { Controller, Get, Param, Query } from "@nestjs/common";
import type { ProductOptionsResponse, ProductResponse, ProductsResponse } from "@books/shared";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentTenant } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import { GetProductUseCase } from "../application/get-product.use-case";
import { ListProductsUseCase } from "../application/list-products.use-case";
import { ProductOptionsUseCase } from "../application/product-options.use-case";
import { lookupQuerySchema, productListQuerySchema, waitingQuerySchema } from "./product-queries";

type ListQuery = ReturnType<typeof productListQuerySchema.parse>;

/** Read endpoints of F01 (any member, except the waiting list). Contract: products.contract.ts. */
@Controller("products")
export class ProductsReadController {
  constructor(
    private readonly list: ListProductsUseCase,
    private readonly get: GetProductUseCase,
    private readonly optionsUseCase: ProductOptionsUseCase,
  ) {}

  @RequireTenant()
  @Get()
  products(
    @Query(new ZodValidationPipe(productListQuerySchema)) query: ListQuery,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<ProductsResponse> {
    return this.list.list(access, query);
  }

  @RequireTenant()
  @Get("options")
  options(@CurrentTenant() tenantId: string): Promise<ProductOptionsResponse> {
    return this.optionsUseCase.execute(tenantId);
  }

  @RequireTenant()
  @Get("lookup")
  lookup(
    @Query(new ZodValidationPipe(lookupQuerySchema)) query: { barcode: string },
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<ProductsResponse> {
    return this.list.lookup(access, query.barcode);
  }

  @RequirePermission("approve_items")
  @Get("waiting")
  waiting(
    @Query(new ZodValidationPipe(waitingQuerySchema)) query: Pick<ListQuery, "limit" | "cursor">,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<ProductsResponse> {
    return this.list.list(access, { ...query, status: "waiting" });
  }

  @RequireTenant()
  @Get(":id")
  one(
    @Param("id") id: string,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<ProductResponse> {
    return this.get.execute(access, id);
  }
}
