ALTER TABLE "memberships" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_password_issued_at" timestamp with time zone;--> statement-breakpoint
-- Hand-edited (S1a security review): temporary passwords that exist already get their
-- 72 hours from now, so nobody is locked out by the upgrade itself.
UPDATE "users" SET "temporary_password_issued_at" = now() WHERE "must_change_password" = true;--> statement-breakpoint
-- Hand-edited: last login per business, from the successful logins the audit log already
-- tied to that business (entries without a business are not counted).
UPDATE "memberships" AS m SET "last_login_at" = (
  SELECT max(a."at") FROM "audit_log" AS a
  WHERE a."action" = 'login' AND a."outcome" = 'success'
    AND a."user_id" = m."user_id" AND a."tenant_id" = m."tenant_id"
);
