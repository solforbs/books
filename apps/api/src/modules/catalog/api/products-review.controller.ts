import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import {
  approveProductRequestSchema,
  mergeProductRequestSchema,
  type ProductResponse,
} from "@books/shared";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import type { Actor } from "../../identity/domain/actor";
import { ApproveProductUseCase } from "../application/approve-product.use-case";
import { MergeProductUseCase } from "../application/merge-product.use-case";
import type { UpdateInput } from "../application/product-editor";
import { RejectProductUseCase } from "../application/reject-product.use-case";

/** The approver's decisions on waiting products (F01 §8): approve, merge, reject. */
@Controller("products")
export class ProductsReviewController {
  constructor(
    private readonly approveUseCase: ApproveProductUseCase,
    private readonly mergeUseCase: MergeProductUseCase,
    private readonly rejectUseCase: RejectProductUseCase,
  ) {}

  @RequirePermission("approve_items")
  @Post(":id/approve")
  @HttpCode(200)
  approve(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(approveProductRequestSchema)) body: Partial<UpdateInput>,
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.approveUseCase.execute(actor, id, body);
  }

  @RequirePermission("approve_items")
  @Post(":id/merge")
  @HttpCode(200)
  merge(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(mergeProductRequestSchema)) body: { intoProductId: string },
    @CurrentActor() actor: Actor,
  ): Promise<ProductResponse> {
    return this.mergeUseCase.execute(actor, id, body.intoProductId);
  }

  @RequirePermission("approve_items")
  @Post(":id/reject")
  @HttpCode(200)
  reject(@Param("id") id: string, @CurrentActor() actor: Actor): Promise<ProductResponse> {
    return this.rejectUseCase.execute(actor, id);
  }
}
