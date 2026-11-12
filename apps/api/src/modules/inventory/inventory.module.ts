import { Module } from "@nestjs/common";
import { StockService } from "./application/stock.service";
import { StockAggregatesRepository } from "./infrastructure/stock-aggregates.repository";
import { StockLayersRepository } from "./infrastructure/stock-layers.repository";
import { StockMovementsRepository } from "./infrastructure/stock-movements.repository";
import { StockUnitsRepository } from "./infrastructure/stock-units.repository";

/** Stock layers, IMEI/serial units and the movement log (ARCH-02). Other modules use StockService. */
@Module({
  providers: [
    StockLayersRepository,
    StockUnitsRepository,
    StockMovementsRepository,
    StockAggregatesRepository,
    StockService,
  ],
  exports: [StockService],
})
export class InventoryModule {}
