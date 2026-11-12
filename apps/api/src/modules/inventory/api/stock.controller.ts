import { Controller, Get, Query } from "@nestjs/common";
import type { StockResponse, UnitLookupResponse } from "@books/shared";
import { z } from "zod";
import { badRequest } from "../../../common/errors/app-error";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess } from "../../identity/api/current-user.decorator";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { decodeStockCursor, ListStockUseCase } from "../application/list-stock.use-case";
import { LookupUnitUseCase } from "../application/lookup-unit.use-case";

const stockQuerySchema = z.object({
  locationId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .max(600)
    .transform((raw) => {
      const cursor = decodeStockCursor(raw);
      if (!cursor) throw badRequest("invalid_cursor", "This page marker is not valid");
      return cursor;
    })
    .optional(),
});
const lookupQuerySchema = z.object({ number: z.string().trim().min(1).max(64) });

type StockQueryInput = ReturnType<typeof stockQuerySchema.parse>;

/**
 * Stock on hand, read only (F04a). Contract: packages/shared/src/contracts/stock.contract.ts.
 * The permission (receive_stock, manage_products or view_reports) is checked in the use case.
 */
@Controller("stock")
export class StockController {
  constructor(
    private readonly listUseCase: ListStockUseCase,
    private readonly lookupUseCase: LookupUnitUseCase,
  ) {}

  @RequireTenant()
  @Get()
  list(
    @Query(new ZodValidationPipe(stockQuerySchema)) query: StockQueryInput,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<StockResponse> {
    return this.listUseCase.execute(access, query);
  }

  @RequireTenant()
  @Get("lookup")
  lookup(
    @Query(new ZodValidationPipe(lookupQuerySchema)) query: { number: string },
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<UnitLookupResponse> {
    return this.lookupUseCase.execute(access, query.number);
  }
}
