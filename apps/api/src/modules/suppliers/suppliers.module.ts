import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { LedgerModule } from "../ledger/ledger.module";
import { SuppliersReadController } from "./api/suppliers-read.controller";
import { SuppliersWriteController } from "./api/suppliers-write.controller";
import { ApproveSupplierUseCase } from "./application/approve-supplier.use-case";
import { CreateSupplierUseCase } from "./application/create-supplier.use-case";
import { GetSupplierUseCase } from "./application/get-supplier.use-case";
import { HideSupplierUseCase } from "./application/hide-supplier.use-case";
import { ListSuppliersUseCase } from "./application/list-suppliers.use-case";
import { QuickAddSupplierUseCase } from "./application/quick-add-supplier.use-case";
import { SupplierDirectory } from "./application/supplier-directory";
import { SupplierBalanceProbe } from "./application/supplier-balance-probe";
import { SupplierChecks } from "./application/supplier-checks";
import { SupplierConflicts } from "./application/supplier-conflicts";
import { SupplierLock } from "./application/supplier-lock";
import { SupplierView } from "./application/supplier-view";
import { UnhideSupplierUseCase } from "./application/unhide-supplier.use-case";
import { UpdateSupplierUseCase } from "./application/update-supplier.use-case";
import { SuppliersRepository } from "./infrastructure/suppliers.repository";

/** The supplier list and each supplier's payment rule (F03). */
@Module({
  imports: [IdentityModule, AuditModule, LedgerModule],
  controllers: [SuppliersReadController, SuppliersWriteController],
  providers: [
    SuppliersRepository,
    // What we owe a supplier, from the ledger.
    SupplierBalanceProbe,
    SupplierDirectory,
    SupplierView,
    SupplierLock,
    SupplierChecks,
    SupplierConflicts,
    ListSuppliersUseCase,
    GetSupplierUseCase,
    CreateSupplierUseCase,
    QuickAddSupplierUseCase,
    UpdateSupplierUseCase,
    ApproveSupplierUseCase,
    HideSupplierUseCase,
    UnhideSupplierUseCase,
  ],
  exports: [SupplierDirectory],
})
export class SuppliersModule {}
