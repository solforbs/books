CREATE TABLE "membership_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_locations_member_location_unique" UNIQUE("membership_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"can_sell" boolean NOT NULL,
	"price_list" text DEFAULT 'retail' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "locations_type" CHECK ("locations"."type" in ('shop', 'store')),
	CONSTRAINT "locations_price_list" CHECK ("locations"."price_list" in ('retail', 'wholesale')),
	CONSTRAINT "locations_status" CHECK ("locations"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "money_place_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"money_place_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_place_locations_place_location_unique" UNIQUE("money_place_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "money_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"number" text,
	"settles_to_id" uuid,
	"drawer_location_id" uuid,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_places_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "money_places_drawer_location_unique" UNIQUE("drawer_location_id"),
	CONSTRAINT "money_places_type" CHECK ("money_places"."type" in ('cash_drawer', 'mpesa_till', 'mpesa_paybill', 'bank', 'safe')),
	CONSTRAINT "money_places_drawer_location" CHECK (("money_places"."type" = 'cash_drawer') = ("money_places"."drawer_location_id" is not null)),
	CONSTRAINT "money_places_not_self_settling" CHECK ("money_places"."settles_to_id" <> "money_places"."id")
);
--> statement-breakpoint
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_status";--> statement-breakpoint
-- Hand-edited: "disabled" memberships are now called "switched_off" (F02 wording).
UPDATE "memberships" SET "status" = 'switched_off' WHERE "status" = 'disabled';--> statement-breakpoint
-- Hand-edited: moved up so the composite foreign keys below can reference it.
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_unique" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "permission_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "kra_pin" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "footer_note" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "vat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_locations" ADD CONSTRAINT "membership_locations_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."memberships"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_locations" ADD CONSTRAINT "membership_locations_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_place_locations" ADD CONSTRAINT "money_place_locations_place_fk" FOREIGN KEY ("tenant_id","money_place_id") REFERENCES "public"."money_places"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_place_locations" ADD CONSTRAINT "money_place_locations_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_places" ADD CONSTRAINT "money_places_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_places" ADD CONSTRAINT "money_places_settles_to_fk" FOREIGN KEY ("tenant_id","settles_to_id") REFERENCES "public"."money_places"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_places" ADD CONSTRAINT "money_places_drawer_location_fk" FOREIGN KEY ("tenant_id","drawer_location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_locations_tenant_location_idx" ON "membership_locations" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE INDEX "locations_tenant_status_idx" ON "locations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "money_place_locations_tenant_location_idx" ON "money_place_locations" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE INDEX "money_places_tenant_idx" ON "money_places" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_permission_overrides_object" CHECK (jsonb_typeof("memberships"."permission_overrides") = 'object');--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_status" CHECK ("memberships"."status" in ('active', 'switched_off'));--> statement-breakpoint

-- Hand-written: row-level security and app-role privileges for the new tenant-owned tables
-- (see 0001). SELECT/INSERT/UPDATE only: nothing is ever deleted (G4).
SELECT enable_tenant_rls('locations');--> statement-breakpoint
SELECT enable_tenant_rls('money_places');--> statement-breakpoint
SELECT enable_tenant_rls('money_place_locations');--> statement-breakpoint
SELECT enable_tenant_rls('membership_locations');--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "locations", "money_places", "money_place_locations", "membership_locations" TO books_app;
