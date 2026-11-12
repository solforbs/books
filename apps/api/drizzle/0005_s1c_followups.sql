ALTER TABLE "tenants" ADD COLUMN "hide_prices_from_storekeepers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Hand-edited (founders, 2026-11-11): barcode letters are case-insensitive, so stored codes are
-- upper-case. First, when the same product holds two live codes that differ only by case, the
-- older one stays active and the newer one is retired (never deleted, G4); otherwise the
-- upper-casing would break the one-live-code-per-product index. Codes shared by DIFFERENT
-- products are left as they are: the sharing rule (condition variants only) is applied by the
-- application, not by SQL. The table has FORCED row-level security and no tenant is set while
-- migrating, so the policy is lifted for these two statements only (same transaction).
ALTER TABLE "product_barcodes" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
UPDATE "product_barcodes" AS b SET "active" = false, "retired_at" = now(), "updated_at" = now()
WHERE b."active" AND b."value" <> upper(b."value") AND EXISTS (
  SELECT 1 FROM "product_barcodes" AS o
  WHERE o."tenant_id" = b."tenant_id" AND o."product_id" = b."product_id" AND o."active"
    AND o."id" <> b."id" AND upper(o."value") = upper(b."value")
    AND (o."created_at", o."id") < (b."created_at", b."id")
);--> statement-breakpoint
UPDATE "product_barcodes" SET "value" = upper("value") WHERE "value" <> upper("value");--> statement-breakpoint
ALTER TABLE "product_barcodes" FORCE ROW LEVEL SECURITY;
