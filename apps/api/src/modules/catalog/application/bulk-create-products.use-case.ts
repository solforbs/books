import { Injectable } from "@nestjs/common";
import type { BulkCreateResponse, bulkCreateRequestSchema } from "@books/shared";
import type { z } from "zod";
import { AppError } from "../../../common/errors/app-error";
import type { Actor } from "../../identity/domain/actor";
import { assertPermission } from "./access";
import { CreateProductUseCase } from "./create-product.use-case";

export type BulkCreateInput = z.output<typeof bulkCreateRequestSchema>;

/**
 * `POST /products/bulk` (add_products): "create several at once" (F01 §5.2). Every row is
 * checked and saved in its own transaction, so one duplicate never blocks the others; the
 * answer lists a product or an error `{ code, details }` per row, in the order sent. Rows
 * are handled one after another, so a row that repeats an earlier one is a duplicate too.
 */
@Injectable()
export class BulkCreateProductsUseCase {
  constructor(private readonly create: CreateProductUseCase) {}

  async execute(actor: Actor, input: BulkCreateInput): Promise<BulkCreateResponse> {
    assertPermission(actor.access, "add_products");
    const results: BulkCreateResponse["results"] = [];
    for (const [index, item] of input.items.entries()) {
      try {
        const { product } = await this.create.execute(actor, item);
        results.push({ index, product, error: null });
      } catch (err) {
        if (!(err instanceof AppError)) throw err;
        results.push({ index, product: null, error: { code: err.code, details: err.details } });
      }
    }
    return { results };
  }
}
