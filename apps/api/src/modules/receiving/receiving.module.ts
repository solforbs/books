import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CatalogModule } from "../catalog/catalog.module";
import { IdentityModule } from "../identity/identity.module";
import { InventoryModule } from "../inventory/inventory.module";
import { LedgerModule } from "../ledger/ledger.module";
import { LocationsModule } from "../locations/locations.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { DeliveriesController } from "./api/deliveries.controller";
import { CommandGuard } from "./application/command-guard";
import { CompleteUnitsUseCase } from "./application/complete-units.use-case";
import { CreateDeliveryUseCase } from "./application/create-delivery.use-case";
import { DeliveryDirectory } from "./application/delivery-directory";
import { DeliveryIntake } from "./application/delivery-intake";
import { DeliveryView } from "./application/delivery-view";
import { DeliveryWriter } from "./application/delivery-writer";
import { EnterCostsUseCase } from "./application/enter-costs.use-case";
import { GetDeliveryUseCase } from "./application/get-delivery.use-case";
import { ListDeliveriesUseCase } from "./application/list-deliveries.use-case";
import { PaymentPlanner } from "./application/payment-planner";
import { UnitChecks } from "./application/unit-checks";
import { DeliveriesRepository } from "./infrastructure/deliveries.repository";
import { DeliveryLinesRepository } from "./infrastructure/delivery-lines.repository";
import { DeliveryPaymentsRepository } from "./infrastructure/delivery-payments.repository";
import { ReceivingCommandsRepository } from "./infrastructure/receiving-commands.repository";

/** Receiving stock (F04a): deliveries, their lines and payments, safe repeats of commands. */
@Module({
  imports: [
    IdentityModule,
    AuditModule,
    CatalogModule,
    LocationsModule,
    SuppliersModule,
    InventoryModule,
    LedgerModule,
  ],
  controllers: [DeliveriesController],
  providers: [
    DeliveriesRepository,
    DeliveryLinesRepository,
    DeliveryPaymentsRepository,
    ReceivingCommandsRepository,
    CommandGuard,
    DeliveryDirectory,
    DeliveryIntake,
    UnitChecks,
    PaymentPlanner,
    DeliveryWriter,
    DeliveryView,
    CreateDeliveryUseCase,
    GetDeliveryUseCase,
    ListDeliveriesUseCase,
    EnterCostsUseCase,
    CompleteUnitsUseCase,
  ],
  exports: [DeliveryDirectory],
})
export class ReceivingModule {}
