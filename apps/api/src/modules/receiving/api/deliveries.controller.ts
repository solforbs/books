import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from "@nestjs/common";
import {
  completeUnitsRequestSchema,
  createDeliveryRequestSchema,
  enterCostsRequestSchema,
  type DeliveriesResponse,
  type DeliveryResponse,
} from "@books/shared";
import type { FastifyReply } from "fastify";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import { CurrentAccess, CurrentActor } from "../../identity/api/current-user.decorator";
import { RequirePermission } from "../../identity/api/require-permission";
import type { Actor } from "../../identity/domain/actor";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import {
  CompleteUnitsUseCase,
  type CompleteUnitsInput,
} from "../application/complete-units.use-case";
import {
  CreateDeliveryUseCase,
  type CreateDeliveryInput,
} from "../application/create-delivery.use-case";
import { EnterCostsUseCase, type EnterCostsInput } from "../application/enter-costs.use-case";
import { GetDeliveryUseCase } from "../application/get-delivery.use-case";
import { ListDeliveriesUseCase } from "../application/list-deliveries.use-case";
import { deliveryListQuerySchema } from "./delivery-queries";

type ListQuery = ReturnType<typeof deliveryListQuerySchema.parse>;

/** Receiving stock (F04a). Contract: packages/shared/src/contracts/deliveries.contract.ts. */
@Controller("deliveries")
export class DeliveriesController {
  constructor(
    private readonly createUseCase: CreateDeliveryUseCase,
    private readonly listUseCase: ListDeliveriesUseCase,
    private readonly getUseCase: GetDeliveryUseCase,
    private readonly costsUseCase: EnterCostsUseCase,
    private readonly unitsUseCase: CompleteUnitsUseCase,
  ) {}

  @RequirePermission("receive_stock")
  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createDeliveryRequestSchema)) body: CreateDeliveryInput,
    @CurrentActor() actor: Actor,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<DeliveryResponse> {
    const { response, replayed } = await this.createUseCase.execute(actor, body);
    // The same command sent again returns the first delivery with 200, not a second 201.
    if (replayed) void reply.status(200);
    return response;
  }

  @RequirePermission("receive_stock")
  @Get()
  list(
    @Query(new ZodValidationPipe(deliveryListQuerySchema)) query: ListQuery,
    @CurrentAccess() access: TenantAccessContext,
  ): Promise<DeliveriesResponse> {
    const { cursor, ...rest } = query;
    return this.listUseCase.execute(access, { ...rest, before: cursor });
  }

  @RequirePermission("receive_stock")
  @Get(":id")
  get(@Param("id") id: string, @CurrentAccess() access: TenantAccessContext) {
    return this.getUseCase.execute(access, id);
  }

  @RequirePermission("see_cost_profit")
  @Post(":id/costs")
  @HttpCode(200)
  enterCosts(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(enterCostsRequestSchema)) body: EnterCostsInput,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryResponse> {
    return this.costsUseCase.execute(actor, id, body);
  }

  @RequirePermission("receive_stock")
  @Post(":id/units")
  @HttpCode(200)
  completeUnits(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(completeUnitsRequestSchema)) body: CompleteUnitsInput,
    @CurrentActor() actor: Actor,
  ): Promise<DeliveryResponse> {
    return this.unitsUseCase.execute(actor, id, body);
  }
}
