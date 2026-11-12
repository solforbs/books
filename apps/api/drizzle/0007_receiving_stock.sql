CREATE TABLE "stock_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"supplier_id" uuid,
	"tracking_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"received_quantity" integer NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"cost_total_cents" bigint,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_layers_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "stock_layers_tracking" CHECK ("stock_layers"."tracking_type" in ('imei', 'serial', 'quantity')),
	CONSTRAINT "stock_layers_received" CHECK ("stock_layers"."received_quantity" > 0),
	CONSTRAINT "stock_layers_remaining" CHECK ("stock_layers"."remaining_quantity" >= 0 and "stock_layers"."remaining_quantity" <= "stock_layers"."received_quantity"),
	CONSTRAINT "stock_layers_cost" CHECK ("stock_layers"."cost_total_cents" is null or "stock_layers"."cost_total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"layer_id" uuid,
	"unit_id" uuid,
	"quantity_delta" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_type" CHECK ("stock_movements"."type" in ('receive', 'unit_added')),
	CONSTRAINT "stock_movements_delta" CHECK (("stock_movements"."type" = 'receive' and "stock_movements"."quantity_delta" > 0) or ("stock_movements"."type" = 'unit_added' and "stock_movements"."quantity_delta" = 0))
);
--> statement-breakpoint
CREATE TABLE "stock_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"layer_id" uuid NOT NULL,
	"imei" text,
	"imei2" text,
	"serial" text,
	"status" text DEFAULT 'in_stock' NOT NULL,
	"cost_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_units_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "stock_units_status" CHECK ("stock_units"."status" in ('in_stock', 'sold', 'reserved', 'damaged', 'lost')),
	CONSTRAINT "stock_units_has_number" CHECK ("stock_units"."imei" is not null or "stock_units"."serial" is not null),
	CONSTRAINT "stock_units_cost" CHECK ("stock_units"."cost_cents" is null or "stock_units"."cost_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"location_id" uuid,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"command_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "ledger_entries_command_unique" UNIQUE("tenant_id","command_id"),
	CONSTRAINT "ledger_entries_type" CHECK ("ledger_entries"."type" in ('delivery', 'cost_entered'))
);
--> statement-breakpoint
CREATE TABLE "ledger_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"account" text NOT NULL,
	"supplier_id" uuid,
	"money_place_id" uuid,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"amount_kes_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_lines_account" CHECK ("ledger_lines"."account" in ('inventory', 'supplier_payable', 'money_place')),
	CONSTRAINT "ledger_lines_currency" CHECK ("ledger_lines"."currency" in ('KES', 'USD')),
	CONSTRAINT "ledger_lines_not_zero" CHECK ("ledger_lines"."amount_cents" <> 0),
	CONSTRAINT "ledger_lines_account_reference" CHECK (("ledger_lines"."account" = 'supplier_payable') = ("ledger_lines"."supplier_id" is not null) and ("ledger_lines"."account" = 'money_place') = ("ledger_lines"."money_place_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"supplier_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"invoice_number" text,
	"note" text,
	"payment_type" text NOT NULL,
	"payment_period_value" integer,
	"payment_period_unit" text,
	"due_date" date,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "deliveries_tenant_number_unique" UNIQUE("tenant_id","number"),
	CONSTRAINT "deliveries_payment_type" CHECK ("deliveries"."payment_type" in ('cash', 'within_time', 'pay_as_you_sell', 'pay_after_all_sold', 'after_sold_with_latest_date')),
	CONSTRAINT "deliveries_period_unit" CHECK ("deliveries"."payment_period_unit" is null or "deliveries"."payment_period_unit" in ('days', 'weeks', 'months')),
	CONSTRAINT "deliveries_period_matches_type" CHECK (("deliveries"."payment_type" in ('within_time', 'after_sold_with_latest_date')) = ("deliveries"."payment_period_value" is not null and "deliveries"."payment_period_unit" is not null) and (("deliveries"."payment_period_value" is null) = ("deliveries"."payment_period_unit" is null)))
);
--> statement-breakpoint
CREATE TABLE "delivery_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"pack_unit_id" uuid,
	"quantity" integer NOT NULL,
	"pieces" integer NOT NULL,
	"layer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_lines_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "delivery_lines_delivery_line_unique" UNIQUE("delivery_id","line_no"),
	CONSTRAINT "delivery_lines_layer_unique" UNIQUE("layer_id"),
	CONSTRAINT "delivery_lines_quantity" CHECK ("delivery_lines"."quantity" > 0 and "delivery_lines"."pieces" >= "delivery_lines"."quantity")
);
--> statement-breakpoint
CREATE TABLE "delivery_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"money_place_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"drawer_negative" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_payments_amount" CHECK ("delivery_payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "receiving_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"command_id" text NOT NULL,
	"operation" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receiving_commands_command_unique" UNIQUE("tenant_id","command_id"),
	CONSTRAINT "receiving_commands_operation" CHECK ("receiving_commands"."operation" in ('create', 'costs', 'units'))
);
--> statement-breakpoint
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_supplier_fk" FOREIGN KEY ("tenant_id","supplier_id") REFERENCES "public"."suppliers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_layer_fk" FOREIGN KEY ("tenant_id","layer_id") REFERENCES "public"."stock_layers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_unit_fk" FOREIGN KEY ("tenant_id","unit_id") REFERENCES "public"."stock_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_layer_fk" FOREIGN KEY ("tenant_id","layer_id") REFERENCES "public"."stock_layers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_entry_fk" FOREIGN KEY ("tenant_id","entry_id") REFERENCES "public"."ledger_entries"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_supplier_fk" FOREIGN KEY ("tenant_id","supplier_id") REFERENCES "public"."suppliers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_money_place_fk" FOREIGN KEY ("tenant_id","money_place_id") REFERENCES "public"."money_places"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_supplier_fk" FOREIGN KEY ("tenant_id","supplier_id") REFERENCES "public"."suppliers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_delivery_fk" FOREIGN KEY ("tenant_id","delivery_id") REFERENCES "public"."deliveries"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_product_fk" FOREIGN KEY ("tenant_id","product_id") REFERENCES "public"."products"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_pack_fk" FOREIGN KEY ("tenant_id","pack_unit_id") REFERENCES "public"."product_pack_units"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_layer_fk" FOREIGN KEY ("tenant_id","layer_id") REFERENCES "public"."stock_layers"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_payments" ADD CONSTRAINT "delivery_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_payments" ADD CONSTRAINT "delivery_payments_delivery_fk" FOREIGN KEY ("tenant_id","delivery_id") REFERENCES "public"."deliveries"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_payments" ADD CONSTRAINT "delivery_payments_money_place_fk" FOREIGN KEY ("tenant_id","money_place_id") REFERENCES "public"."money_places"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_commands" ADD CONSTRAINT "receiving_commands_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_commands" ADD CONSTRAINT "receiving_commands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_commands" ADD CONSTRAINT "receiving_commands_delivery_fk" FOREIGN KEY ("tenant_id","delivery_id") REFERENCES "public"."deliveries"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_layers_fifo_idx" ON "stock_layers" USING btree ("tenant_id","product_id","location_id","received_at","id");--> statement-breakpoint
CREATE INDEX "stock_layers_source_idx" ON "stock_layers" USING btree ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_location_idx" ON "stock_movements" USING btree ("tenant_id","product_id","location_id");--> statement-breakpoint
CREATE INDEX "stock_movements_source_idx" ON "stock_movements" USING btree ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "stock_units_layer_idx" ON "stock_units" USING btree ("tenant_id","layer_id");--> statement-breakpoint
CREATE INDEX "stock_units_product_location_idx" ON "stock_units" USING btree ("tenant_id","product_id","location_id","status");--> statement-breakpoint
CREATE INDEX "stock_units_imei_idx" ON "stock_units" USING btree ("tenant_id","imei");--> statement-breakpoint
CREATE INDEX "stock_units_imei2_idx" ON "stock_units" USING btree ("tenant_id","imei2");--> statement-breakpoint
CREATE INDEX "stock_units_serial_idx" ON "stock_units" USING btree ("tenant_id","serial");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_units_imei_live_unique" ON "stock_units" USING btree ("tenant_id","imei") WHERE "stock_units"."imei" is not null and "stock_units"."status" in ('in_stock', 'reserved', 'damaged');--> statement-breakpoint
CREATE UNIQUE INDEX "stock_units_imei2_live_unique" ON "stock_units" USING btree ("tenant_id","imei2") WHERE "stock_units"."imei2" is not null and "stock_units"."status" in ('in_stock', 'reserved', 'damaged');--> statement-breakpoint
CREATE UNIQUE INDEX "stock_units_serial_live_unique" ON "stock_units" USING btree ("tenant_id","product_id","serial") WHERE "stock_units"."serial" is not null and "stock_units"."status" in ('in_stock', 'reserved', 'damaged');--> statement-breakpoint
CREATE INDEX "ledger_entries_source_idx" ON "ledger_entries" USING btree ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "ledger_lines_entry_idx" ON "ledger_lines" USING btree ("tenant_id","entry_id");--> statement-breakpoint
CREATE INDEX "ledger_lines_supplier_idx" ON "ledger_lines" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "ledger_lines_money_place_idx" ON "ledger_lines" USING btree ("tenant_id","money_place_id");--> statement-breakpoint
CREATE INDEX "deliveries_tenant_created_idx" ON "deliveries" USING btree ("tenant_id","created_at","id");--> statement-breakpoint
CREATE INDEX "deliveries_supplier_idx" ON "deliveries" USING btree ("tenant_id","supplier_id");--> statement-breakpoint
CREATE INDEX "delivery_lines_delivery_idx" ON "delivery_lines" USING btree ("tenant_id","delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_payments_delivery_idx" ON "delivery_payments" USING btree ("tenant_id","delivery_id");

-- Hand-written: row-level security, app-role privileges and guard triggers (see 0001, 0006).
-- Nothing is ever deleted (G4), so the app role gets no DELETE anywhere. The ledger, the
-- movement log, deliveries and their lines, payments and command records are append-only:
-- SELECT and INSERT only. Stock layers and units are not edited either, except that a cost
-- left empty by a price-pending delivery can be filled in once (column-level UPDATE below,
-- and a trigger that refuses to change a cost that is already set).
SELECT enable_tenant_rls('stock_layers');--> statement-breakpoint
SELECT enable_tenant_rls('stock_units');--> statement-breakpoint
SELECT enable_tenant_rls('stock_movements');--> statement-breakpoint
SELECT enable_tenant_rls('ledger_entries');--> statement-breakpoint
SELECT enable_tenant_rls('ledger_lines');--> statement-breakpoint
SELECT enable_tenant_rls('deliveries');--> statement-breakpoint
SELECT enable_tenant_rls('delivery_lines');--> statement-breakpoint
SELECT enable_tenant_rls('delivery_payments');--> statement-breakpoint
SELECT enable_tenant_rls('receiving_commands');--> statement-breakpoint

GRANT SELECT, INSERT ON "stock_layers", "stock_units", "stock_movements", "ledger_entries", "ledger_lines", "deliveries", "delivery_lines", "delivery_payments", "receiving_commands" TO books_app;--> statement-breakpoint
GRANT UPDATE ("cost_total_cents", "updated_at") ON "stock_layers" TO books_app;--> statement-breakpoint
GRANT UPDATE ("cost_cents", "updated_at") ON "stock_units" TO books_app;--> statement-breakpoint

CREATE FUNCTION stock_layer_cost_set_once() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cost_total_cents IS NOT NULL AND NEW.cost_total_cents IS DISTINCT FROM OLD.cost_total_cents THEN
    RAISE EXCEPTION 'the cost of stock layer % is already set', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER stock_layers_cost_once BEFORE UPDATE ON "stock_layers"
FOR EACH ROW EXECUTE FUNCTION stock_layer_cost_set_once();--> statement-breakpoint

CREATE FUNCTION stock_unit_cost_set_once() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cost_cents IS NOT NULL AND NEW.cost_cents IS DISTINCT FROM OLD.cost_cents THEN
    RAISE EXCEPTION 'the cost of stock unit % is already set', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER stock_units_cost_once BEFORE UPDATE ON "stock_units"
FOR EACH ROW EXECUTE FUNCTION stock_unit_cost_set_once();--> statement-breakpoint

-- Double entry (ARCH-02 section 5, invariant 1): at the end of the transaction the lines of
-- every entry add up to zero, per currency. Deferred, because lines are inserted one by one.
CREATE FUNCTION ledger_entry_must_balance() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ledger_lines
    WHERE tenant_id = NEW.tenant_id AND entry_id = NEW.entry_id
    GROUP BY currency
    HAVING sum(amount_cents) <> 0
  ) THEN
    RAISE EXCEPTION 'ledger entry % does not add up to zero', NEW.entry_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ledger_lines_balanced AFTER INSERT ON "ledger_lines"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ledger_entry_must_balance();
