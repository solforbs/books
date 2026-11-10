import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import {
  addBarcodeRequestSchema,
  generateBarcodeRequestSchema,
  packUnitInputSchema,
  type PackUnitInput,
  type ProductHistoryResponse,
  type ProductResponse,
} from "@books/shared";
import type { z } from "zod";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { Actor } from "../../identity/domain/actor";
import { AddBarcodeUseCase, type AddBarcodeInput } from "../application/add-barcode.use-case";
import { AddPackUseCase } from "../application/add-pack.use-case";
import { GenerateBarcodeUseCase } from "../application/generate-barcode.use-case";
import { ProductHistoryUseCase } from "../application/product-history.use-case";
import { RetireBarcodeUseCase } from "../application/retire-barcode.use-case";
import { RetirePackUseCase } from "../application/retire-pack.use-case";

/** Barcodes, pack units and history of one product (F01 §7, §10). */
@Controller("products/:id")
export class ProductsPartsController {
  constructor(
    private readonly addBarcode: AddBarcodeUseCase,
    private readonly generateBarcode: GenerateBarcodeUseCase,
    private readonly retireBarcode: RetireBarcodeUseCase,
    private readonly addPack: AddPackUseCase,
    private readonly retirePack: RetirePackUseCase,
    private readonly historyUseCase: ProductHistoryUseCase,
  ) {}

  @RequirePermission("manage_products")
  @Post("barcodes")
  @HttpCode(200)
  add(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addBarcodeRequestSchema)) body: AddBarcodeInput,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.addBarcode.execute(actor, id, body);
  }

  // The use case decides: manage_products, or add_products on one's own waiting product.
  @RequireTenant()
  @Post("barcodes/generate")
  @HttpCode(200)
  generate(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(generateBarcodeRequestSchema))
    body: z.output<typeof generateBarcodeRequestSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.generateBarcode.execute(actor, id, body.packUnitId);
  }

  @RequirePermission("manage_products")
  @Post("barcodes/:barcodeId/retire")
  @HttpCode(200)
  retire(
    @Param("id") id: string,
    @Param("barcodeId") barcodeId: string,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.retireBarcode.execute(actor, id, barcodeId);
  }

  @RequirePermission("manage_products")
  @Post("packs")
  @HttpCode(200)
  pack(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(packUnitInputSchema)) body: PackUnitInput,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.addPack.execute(actor, id, body);
  }

  @RequirePermission("manage_products")
  @Post("packs/:packId/retire")
  @HttpCode(200)
  retirePackUnit(
    @Param("id") id: string,
    @Param("packId") packId: string,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.retirePack.execute(actor, id, packId);
  }

  @RequirePermission("manage_products")
  @Get("history")
  history(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<ProductHistoryResponse> {
    return this.historyUseCase.execute(actor, id);
  }
}
