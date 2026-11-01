// Creates the two PostgreSQL roles and the database the API expects, for local
// development (dev-db.mjs) and tests (test/global-setup.ts). Idempotent: running
// it again only re-syncs the role passwords. Production does the same with
// deploy/postgres/initdb/10-books-roles.sh.
//
//   books_owner  owns the database and its tables; the API runs migrations as it.
//   books_app    the API's request role: no superuser, no BYPASSRLS, owns nothing,
//                so row-level security always applies to it.

export const OWNER_ROLE = "books_owner";
export const APP_ROLE = "books_app";

/** @param {import("pg").Client} admin a superuser connection */
async function upsertRole(admin, name, password) {
  const found = await admin.query("select 1 from pg_roles where rolname = $1", [name]);
  const verb = found.rowCount ? "ALTER" : "CREATE";
  await admin.query(
    `${verb} ROLE ${admin.escapeIdentifier(name)} WITH LOGIN NOSUPERUSER NOCREATEDB ` +
      `NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${admin.escapeLiteral(password)}`,
  );
}

/** @param {import("pg").Client} admin */
export async function provisionRoles(admin, { ownerPassword, appPassword }) {
  await upsertRole(admin, OWNER_ROLE, ownerPassword);
  await upsertRole(admin, APP_ROLE, appPassword);
}

/** Creates the database owned by books_owner unless it exists. @param {import("pg").Client} admin */
export async function createDatabase(admin, name) {
  const found = await admin.query("select 1 from pg_database where datname = $1", [name]);
  if (found.rowCount) return;
  await admin.query(
    `CREATE DATABASE ${admin.escapeIdentifier(name)} OWNER ${admin.escapeIdentifier(OWNER_ROLE)}`,
  );
}
