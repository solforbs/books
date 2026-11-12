CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"phone" text,
	"payment_type" text DEFAULT 'cash' NOT NULL,
	"payment_period_value" integer,
	"payment_period_unit" text,
	"currency" text DEFAULT 'KES' NOT NULL,
	"is_neighbour" boolean DEFAULT false NOT NULL,
	"kra_pin" text,
	"market_or_location" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"hidden_from" text,
	"added_by_user_id" uuid NOT NULL,
	"decided_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "suppliers_status" CHECK ("suppliers"."status" in ('waiting', 'active', 'hidden')),
	CONSTRAINT "suppliers_currency" CHECK ("suppliers"."currency" in ('KES', 'USD')),
	CONSTRAINT "suppliers_payment_type" CHECK ("suppliers"."payment_type" in ('cash', 'within_time', 'pay_as_you_sell', 'pay_after_all_sold', 'after_sold_with_latest_date')),
	CONSTRAINT "suppliers_period_unit" CHECK ("suppliers"."payment_period_unit" is null or "suppliers"."payment_period_unit" in ('days', 'weeks', 'months')),
	CONSTRAINT "suppliers_period_matches_type" CHECK (("suppliers"."payment_type" in ('within_time', 'after_sold_with_latest_date')) = ("suppliers"."payment_period_value" is not null and "suppliers"."payment_period_unit" is not null) and (("suppliers"."payment_period_value" is null) = ("suppliers"."payment_period_unit" is null))),
	CONSTRAINT "suppliers_phone_unless_waiting" CHECK ("suppliers"."phone" is not null or "suppliers"."status" = 'waiting' or ("suppliers"."status" = 'hidden' and "suppliers"."hidden_from" = 'waiting'))
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_phone_unique" ON "suppliers" USING btree ("tenant_id","phone") WHERE "suppliers"."phone" is not null;--> statement-breakpoint
CREATE INDEX "suppliers_tenant_status_name_idx" ON "suppliers" USING btree ("tenant_id","status","name_key","id");--> statement-breakpoint

-- Hand-written: row-level security and app-role privileges (see 0001, 0002, 0004). Nothing is
-- ever deleted (G4), so the app role gets no DELETE.
SELECT enable_tenant_rls('suppliers');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "suppliers" TO books_app;
