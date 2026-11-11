CREATE TABLE "barcode_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"last_value" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barcode_sequences_tenant_unique" UNIQUE("tenant_id"),
	CONSTRAINT "barcode_sequences_range" CHECK ("barcode_sequences"."last_value" >= 0 and "barcode_sequences"."last_value" <= 9999999999)
);
--> statement-breakpoint
CREATE TABLE "product_barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"pack_unit_id" uuid,
	"value" text NOT NULL,
	"kind" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_barcodes_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "product_barcodes_kind" CHECK ("product_barcodes"."kind" in ('manufacturer', 'shop'))
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"default_tracking" text NOT NULL,
	"naming_mode" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "product_categories_name_unique" UNIQUE("tenant_id","name_key"),
	CONSTRAINT "product_categories_tracking" CHECK ("product_categories"."default_tracking" in ('imei', 'serial', 'quantity')),
	CONSTRAINT "product_categories_naming" CHECK ("product_categories"."naming_mode" in ('parts', 'free'))
);
--> statement-breakpoint
CREATE TABLE "product_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "product_history_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"by_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"field" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_location_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"retail_price" bigint,
	"wholesale_price" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_location_prices_unique" UNIQUE("product_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "product_pack_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"wholesale_price" bigint,
	"retail_price" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_pack_units_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "product_pack_units_size" CHECK ("product_pack_units"."size" >= 2)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"brand" text,
	"model" text,
	"storage" text,
	"colour" text,
	"condition" text,
	"tracking_type" text NOT NULL,
	"base_unit" text DEFAULT 'piece' NOT NULL,
	"retail_price" bigint,
	"wholesale_price" bigint,
	"min_price" bigint,
	"vat_type" text,
	"can_be_given_free" boolean DEFAULT false NOT NULL,
	"warranty_months" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"hidden_from" text,
	"merged_into_id" uuid,
	"duplicate_key" text NOT NULL,
	"condition_family_key" text,
	"model_group_key" text,
	"added_by_user_id" uuid NOT NULL,
	"source" text DEFAULT 'form' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "products_status" CHECK ("products"."status" in ('waiting', 'active', 'hidden', 'merged', 'rejected')),
	CONSTRAINT "products_tracking" CHECK ("products"."tracking_type" in ('imei', 'serial', 'quantity')),
	CONSTRAINT "products_vat_type" CHECK ("products"."vat_type" is null or "products"."vat_type" in ('standard', 'exempt', 'zero_rated')),
	CONSTRAINT "products_source" CHECK ("products"."source" in ('form', 'bulk', 'quick_add', 'import')),
	CONSTRAINT "products_prices_not_negative" CHECK (coalesce("products"."retail_price", 0) >= 0 and coalesce("products"."wholesale_price", 0) >= 0 and coalesce("products"."min_price", 0) >= 0),
	CONSTRAINT "products_merged_target" CHECK (("products"."status" = 'merged') = ("products"."merged_into_id" is not null)),
	CONSTRAINT "products_not_merged_into_self" CHECK ("products"."merged_into_id" <> "products"."id")
);
--> statement-breakpoint
ALTER TABLE "barcode_sequences" ADD CONSTRAINT "barcode_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_pack_fk" FOREIGN KEY ("tenant_id","pack_unit_id") REFERENCES "public"."product_pack_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_location_prices" ADD CONSTRAINT "product_location_prices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_location_prices" ADD CONSTRAINT "product_location_prices_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_location_prices" ADD CONSTRAINT "product_location_prices_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pack_units" ADD CONSTRAINT "product_pack_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pack_units" ADD CONSTRAINT "product_pack_units_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_fk" FOREIGN KEY ("tenant_id","category_id") REFERENCES "public"."product_categories"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_merged_into_fk" FOREIGN KEY ("tenant_id","merged_into_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_barcodes_tenant_value_idx" ON "product_barcodes" USING btree ("tenant_id","value");--> statement-breakpoint
CREATE INDEX "product_barcodes_product_idx" ON "product_barcodes" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_barcodes_shop_value_unique" ON "product_barcodes" USING btree ("tenant_id","value") WHERE "product_barcodes"."active" and "product_barcodes"."kind" = 'shop';--> statement-breakpoint
CREATE UNIQUE INDEX "product_barcodes_product_value_unique" ON "product_barcodes" USING btree ("tenant_id","product_id","value") WHERE "product_barcodes"."active";--> statement-breakpoint
CREATE INDEX "product_history_product_idx" ON "product_history" USING btree ("tenant_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_pack_units_product_idx" ON "product_pack_units" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_pack_units_active_name_unique" ON "product_pack_units" USING btree ("tenant_id","product_id",lower("name")) WHERE "product_pack_units"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "products_duplicate_key_unique" ON "products" USING btree ("tenant_id","duplicate_key") WHERE "products"."status" not in ('merged', 'rejected');--> statement-breakpoint
CREATE INDEX "products_tenant_status_name_idx" ON "products" USING btree ("tenant_id","status","name_key","id");--> statement-breakpoint
CREATE INDEX "products_tenant_category_idx" ON "products" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "products_tenant_model_group_idx" ON "products" USING btree ("tenant_id","model_group_key");--> statement-breakpoint
CREATE INDEX "products_tenant_family_idx" ON "products" USING btree ("tenant_id","condition_family_key");--> statement-breakpoint

-- Hand-written: row-level security and app-role privileges for the catalog tables (see 0001,
-- 0002). Nothing is ever deleted (G4), so the app role gets no DELETE anywhere; the history
-- is append-only (no UPDATE either).
SELECT enable_tenant_rls('product_categories');--> statement-breakpoint
SELECT enable_tenant_rls('products');--> statement-breakpoint
SELECT enable_tenant_rls('product_pack_units');--> statement-breakpoint
SELECT enable_tenant_rls('product_barcodes');--> statement-breakpoint
SELECT enable_tenant_rls('product_location_prices');--> statement-breakpoint
SELECT enable_tenant_rls('product_history');--> statement-breakpoint
SELECT enable_tenant_rls('barcode_sequences');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "product_categories", "products", "product_pack_units", "product_barcodes", "product_location_prices", "barcode_sequences" TO books_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "product_history" TO books_app;
