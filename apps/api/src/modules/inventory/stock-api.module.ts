import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { IdentityModule } from "../identity/identity.module";
import { LocationsModule } from "../locations/locations.module";
import { ReceivingModule } from "../receiving/receiving.module";
import { StockController } from "./api/stock.controller";
import { ListStockUseCase } from "./application/list-stock.use-case";
import { LookupUnitUseCase } from "./application/lookup-unit.use-case";
import { InventoryModule } from "./inventory.module";

/**
 * The read-only stock endpoints. Separate from InventoryModule because they need product,
 * location and delivery names, and those modules in turn need the inventory core (closing a
 * location asks how much stock it holds): keeping the core free of them avoids a cycle.
 */
@Module({
  imports: [IdentityModule, InventoryModule, CatalogModule, LocationsModule, ReceivingModule],
  controllers: [StockController],
  providers: [ListStockUseCase, LookupUnitUseCase],
})
export class StockApiModule {}
