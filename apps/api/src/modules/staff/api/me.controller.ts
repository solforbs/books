import { Controller, Get } from "@nestjs/common";
import type { MyAccessResponse } from "@books/shared";
import { CurrentAccess } from "../../identity/api/current-user.decorator";
import { RequireTenant } from "../../identity/api/require-tenant.guard";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { MyAccessUseCase } from "../application/my-access.use-case";

/** `GET /me/permissions`: the caller's role, locations and effective permissions. */
@RequireTenant()
@Controller("me")
export class MeController {
  constructor(private readonly myAccess: MyAccessUseCase) {}

  @Get("permissions")
  permissions(@CurrentAccess() access: TenantAccessContext): Promise<MyAccessResponse> {
    return this.myAccess.execute(access);
  }
}
