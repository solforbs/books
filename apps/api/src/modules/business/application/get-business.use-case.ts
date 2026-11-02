import { Injectable } from "@nestjs/common";
import type { BusinessResponse } from "@books/shared";
import { BusinessDirectory } from "../../identity/application/business-directory";
import { IdentityErrors } from "../../identity/domain/identity-errors";

/** `GET /business`: any member reads the details printed on documents. */
@Injectable()
export class GetBusinessUseCase {
  constructor(private readonly directory: BusinessDirectory) {}

  async execute(tenantId: string): Promise<BusinessResponse> {
    const business = await this.directory.get(tenantId);
    // RequireTenantGuard already checked the business is active; this is a safety net.
    if (!business) throw IdentityErrors.notAMember();
    return { business };
  }
}
