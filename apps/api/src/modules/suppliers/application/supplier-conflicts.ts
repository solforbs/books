import { Injectable } from "@nestjs/common";
import type { AppError } from "../../../common/errors/app-error";
import { isUniqueViolation, pgConstraint } from "../../../common/database/pg-errors";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";

/**
 * The checks run before every write, but two requests can still race past them. The unique
 * phone index then refuses the second one; this turns that into the same API error the check
 * would have given. Returns null for anything it does not recognise.
 */
@Injectable()
export class SupplierConflicts {
  constructor(private readonly suppliers: SuppliersRepository) {}

  async translate(err: unknown, tenantId: string, phone: string | null): Promise<AppError | null> {
    if (!isUniqueViolation(err) || pgConstraint(err) !== "suppliers_phone_unique" || !phone) {
      return null;
    }
    const existing = await this.suppliers.findByPhone(tenantId, phone, null);
    return existing ? SupplierErrors.phoneExists(existing.id, existing.name) : null;
  }
}
