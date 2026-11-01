-- Roles (created outside migrations: deploy/postgres/initdb, scripts/dev-db.mjs, test/global-setup.ts):
--   books_owner  owns the database and every table; runs these migrations at API startup.
--   books_app    what the API uses for requests: NOSUPERUSER, NOBYPASSRLS, owns nothing,
--                so it cannot change the schema, switch row-level security off, or delete rows.
-- Every new table needs its own GRANT here (tests run as books_app, so a missing one fails fast).

GRANT SELECT, INSERT, UPDATE ON "users", "tenants", "memberships", "refresh_sessions", "recovery_codes" TO books_app;
--> statement-breakpoint
-- The audit log is append-only, enforced by privileges: no UPDATE, no DELETE.
GRANT SELECT, INSERT ON "audit_log" TO books_app;
--> statement-breakpoint

-- The business (tenant) of the current transaction, set by the API with
-- `select set_config('app.tenant_id', <uuid>, true)` (= SET LOCAL). NULL when unset,
-- so a forgotten SET LOCAL makes every tenant-owned table look empty, never wider.
CREATE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
--> statement-breakpoint

-- Second guard behind TenantScopedRepository: call `SELECT enable_tenant_rls('<table>');`
-- in the migration that creates any tenant-owned table (it must have a uuid "tenant_id").
-- FORCE makes the policy apply to the table owner too; only superusers and BYPASSRLS
-- roles skip it, and the app role is neither.
CREATE FUNCTION enable_tenant_rls(target regclass) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
    target
  );
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION enable_tenant_rls(regclass) FROM PUBLIC;
--> statement-breakpoint

-- The one sanctioned delete: refresh-token rows a week after they expired (they are
-- kept that long for reuse detection). SECURITY DEFINER so the app role can purge
-- without holding DELETE on the table.
CREATE FUNCTION purge_expired_refresh_sessions() RETURNS integer
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  WITH purged AS (
    DELETE FROM public.refresh_sessions
    WHERE expires_at < now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*)::integer FROM purged
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION purge_expired_refresh_sessions() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION purge_expired_refresh_sessions() TO books_app;
