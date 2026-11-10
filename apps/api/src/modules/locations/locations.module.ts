import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { LocationsController } from "./api/locations.controller";
import { MoneyPlacesController } from "./api/money-places.controller";
import { CashDrawers } from "./application/cash-drawers";
import { CloseLocationUseCase } from "./application/close-location.use-case";
import { LocationContentsProbe, MoneyPlaceBalanceProbe } from "./application/contents-probes";
import { CreateLocationUseCase } from "./application/create-location.use-case";
import { CreateMoneyPlaceUseCase } from "./application/create-money-place.use-case";
import { ListLocationsUseCase } from "./application/list-locations.use-case";
import { ListMoneyPlacesUseCase } from "./application/list-money-places.use-case";
import { LocationView } from "./application/location-view";
import { LocationsService } from "./application/locations.service";
import { MoneyPlaceChecks } from "./application/money-place-checks";
import { ReopenLocationUseCase } from "./application/reopen-location.use-case";
import { UpdateLocationUseCase } from "./application/update-location.use-case";
import { UpdateMoneyPlaceUseCase } from "./application/update-money-place.use-case";
import { LocationsRepository } from "./infrastructure/locations.repository";
import { MoneyPlaceLocationsRepository } from "./infrastructure/money-place-locations.repository";
import { MoneyPlacesRepository } from "./infrastructure/money-places.repository";

/** Locations (shops, stores) and money places (F02 §3). */
@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [LocationsController, MoneyPlacesController],
  providers: [
    LocationsRepository,
    MoneyPlacesRepository,
    MoneyPlaceLocationsRepository,
    // Extension points: later slices (stock F04, cash F07/F11) replace these.
    LocationContentsProbe,
    MoneyPlaceBalanceProbe,
    CashDrawers,
    LocationView,
    MoneyPlaceChecks,
    LocationsService,
    ListLocationsUseCase,
    CreateLocationUseCase,
    UpdateLocationUseCase,
    CloseLocationUseCase,
    ReopenLocationUseCase,
    ListMoneyPlacesUseCase,
    CreateMoneyPlaceUseCase,
    UpdateMoneyPlaceUseCase,
  ],
  exports: [LocationsService],
})
export class LocationsModule {}
