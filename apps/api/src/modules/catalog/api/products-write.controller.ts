import { Body, Controller, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  bulkCreateRequestSchema,
  createProductRequestSchema,
  updateProductRequestSchema,
  type BulkCreateResponse,
  type CheckProductResponse,
  type ProductResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import type { Actor } from "../../identity/domain/actor";
import {
  BulkCreateProductsUseCase,
  type BulkCreateInput,
} from "../application/bulk-create-products.use-case";
import { CheckProductUseCase } from "../application/check-product.use-case";
import {
  CreateProductUseCase,
  type CreateProductInput,
} from "../application/create-product.use-case";
import { HideProductUseCase } from "../application/hide-product.use-case";
import type { UpdateInput } from "../application/product-editor";
import { UnhideProductUseCase } from "../application/unhide-product.use-case";
import { UpdateProductUseCase } from "../application/update-product.use-case";

/** Create / edit / hide endpoints of F01. Contract: packages/shared/src/contracts/products.contract.ts. */
@Controller("products")
export class ProductsWriteController {
  constructor(
    private readonly createUseCase: CreateProductUseCase,
    private readonly bulkUseCase: BulkCreateProductsUseCase,
    private readonly checkUseCase: CheckProductUseCase,
    private readonly updateUseCase: UpdateProductUseCase,
    private readonly hideUseCase: HideProductUseCase,
    private readonly unhideUseCase: UnhideProductUseCase,
  ) {}

  @RequirePermission("add_products")
  @Post("check")
  @HttpCode(200)
  check(
    @Body(new ZodValidationPipe(createProductRequestSchema)) body: CreateProductInput,
    @CurrentActor() actor: Actor,
  ): Promise<CheckProductResponse> {
    return this.checkUseCase.execute(actor, body);
  }

  @RequirePermission("add_products")
  @Post("bulk")
  @HttpCode(200)
  bulk(
    @Body(new ZodValidationPipe(bulkCreateRequestSchema)) body: BulkCreateInput,
    @CurrentActor() actor: Actor,
  ): Promise<BulkCreateResponse> {
    return this.bulkUseCase.execute(actor, body);
  }

  @RequirePermission("add_products")
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createProductRequestSchema)) body: CreateProductInput,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.createUseCase.execute(actor, body);
  }

  @RequirePermission("manage_products")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductRequestSchema)) body: UpdateInput,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.updateUseCase.execute(actor, id, body);
  }

  @RequirePermission("manage_products")
  @Post(":id/hide")
  @HttpCode(200)
  hide(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<ProductResponse> {
    return this.hideUseCase.execute(actor, id);
  }

  @RequirePermission("manage_products")
  @Post(":id/unhide")
  @HttpCode(200)
  unhide(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<ProductResponse> {
    return this.unhideUseCase.execute(actor, id);
  }
}
