import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IdentityModule } from "../identity/identity.module";
import { InventoryModule } from "../inventory/inventory.module";
import { LocationsModule } from "../locations/locations.module";
import { CategoriesController } from "./api/categories.controller";
import { ProductsPartsController } from "./api/products-parts.controller";
import { ProductsReadController } from "./api/products-read.controller";
import { ProductsReviewController } from "./api/products-review.controller";
import { ProductsWriteController } from "./api/products-write.controller";
import { AddBarcodeUseCase } from "./application/add-barcode.use-case";
import { AddPackUseCase } from "./application/add-pack.use-case";
import { ApproveProductUseCase } from "./application/approve-product.use-case";
import { BulkCreateProductsUseCase } from "./application/bulk-create-products.use-case";
import { CheckProductUseCase } from "./application/check-product.use-case";
import { CreateCategoryUseCase } from "./application/create-category.use-case";
import { CreateProductUseCase } from "./application/create-product.use-case";
import { GenerateBarcodeUseCase } from "./application/generate-barcode.use-case";
import { GetProductUseCase } from "./application/get-product.use-case";
import { HideProductUseCase } from "./application/hide-product.use-case";
import { ListCategoriesUseCase } from "./application/list-categories.use-case";
import { ListProductsUseCase } from "./application/list-products.use-case";
import { MergeProductUseCase } from "./application/merge-product.use-case";
import { ProductChecks } from "./application/product-checks";
import { ProductConflicts } from "./application/product-conflicts";
import { ProductDirectory } from "./application/product-directory";
import { ProductEditor } from "./application/product-editor";
import { ProductHistoryUseCase } from "./application/product-history.use-case";
import { ProductLock } from "./application/product-lock";
import { ProductOptionsUseCase } from "./application/product-options.use-case";
import { ProductMergeMover, ProductUsageProbe } from "./application/product-usage-probe";
import { ProductView } from "./application/product-view";
import { RejectProductUseCase } from "./application/reject-product.use-case";
import { RetireBarcodeUseCase } from "./application/retire-barcode.use-case";
import { RetirePackUseCase } from "./application/retire-pack.use-case";
import { UnhideProductUseCase } from "./application/unhide-product.use-case";
import { UpdateCategoryUseCase } from "./application/update-category.use-case";
import { UpdateProductUseCase } from "./application/update-product.use-case";
import { BarcodeSequencesRepository } from "./infrastructure/barcode-sequences.repository";
import { BarcodesRepository } from "./infrastructure/barcodes.repository";
import { CategoriesRepository } from "./infrastructure/categories.repository";
import { HistoryRepository } from "./infrastructure/history.repository";
import { LocationPricesRepository } from "./infrastructure/location-prices.repository";
import { PackUnitsRepository } from "./infrastructure/pack-units.repository";
import { ProductsRepository } from "./infrastructure/products.repository";

/** The product list: categories, products, barcodes, packs, approval, history (F01). */
@Module({
  imports: [IdentityModule, AuditModule, LocationsModule, InventoryModule],
  controllers: [
    CategoriesController,
    ProductsReadController,
    ProductsWriteController,
    ProductsReviewController,
    ProductsPartsController,
  ],
  providers: [
    CategoriesRepository,
    ProductsRepository,
    PackUnitsRepository,
    BarcodesRepository,
    LocationPricesRepository,
    HistoryRepository,
    BarcodeSequencesRepository,
    // Stock-aware (inventory); sales (F06) will add to these.
    ProductUsageProbe,
    ProductMergeMover,
    ProductDirectory,
    ProductView,
    ProductLock,
    ProductChecks,
    ProductConflicts,
    ProductEditor,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    ProductOptionsUseCase,
    CheckProductUseCase,
    CreateProductUseCase,
    BulkCreateProductsUseCase,
    UpdateProductUseCase,
    HideProductUseCase,
    UnhideProductUseCase,
    ApproveProductUseCase,
    MergeProductUseCase,
    RejectProductUseCase,
    AddBarcodeUseCase,
    GenerateBarcodeUseCase,
    RetireBarcodeUseCase,
    AddPackUseCase,
    RetirePackUseCase,
    ProductHistoryUseCase,
  ],
  exports: [ProductDirectory],
})
export class CatalogModule {}
