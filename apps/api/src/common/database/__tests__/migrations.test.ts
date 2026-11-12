import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createTestDatabase, pgUrl } from "../../../../test/pg";
import { pgErrorCode } from "../pg-errors";
import { MIGRATIONS_FOLDER, runMigrations } from "../migrator";

const journal = JSON.parse(
  readFileSync(join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
) as { entries: { tag: string }[] };

describe("migrations (apps/api/drizzle)", () => {
  const pools: Pool[] = [];
  const ownerPool = (database: string) => {
    const pool = new Pool({ connectionString: pgUrl("owner", database), max: 2 });
    pools.push(pool);
    return pool;
  };
  afterAll(async () => {
    await Promise.all(pools.map((p) => p.end()));
  });

  const applied = async (pool: Pool) =>
    (await pool.query("select count(*)::int as n from drizzle.__drizzle_migrations")).rows[0].n;

  it("apply cleanly to an empty database, and a second run changes nothing", async () => {
    const database = await createTestDatabase("books_migrate");
    await runMigrations(pgUrl("owner", database));
    const pool = ownerPool(database);
    const tables = await pool.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(tables.rows.map((r) => r.tablename)).toEqual([
      "audit_log",
      "barcode_sequences",
      "locations",
      "membership_locations",
      "memberships",
      "money_place_locations",
      "money_places",
      "product_barcodes",
      "product_categories",
      "product_history",
      "product_location_prices",
      "product_pack_units",
      "products",
      "recovery_codes",
      "refresh_sessions",
      "suppliers",
      "tenants",
      "users",
    ]);
    expect(await applied(pool)).toBe(journal.entries.length);

    await runMigrations(pgUrl("owner", database));
    expect(await applied(pool)).toBe(journal.entries.length);
  });

  it("several API instances starting at once migrate exactly once (advisory lock)", async () => {
    const database = await createTestDatabase("books_migrate");
    const url = pgUrl("owner", database);
    await Promise.all([runMigrations(url), runMigrations(url), runMigrations(url)]);
    expect(await applied(ownerPool(database))).toBe(journal.entries.length);
  });

  it("gives the app role exactly the privileges it needs, and never DELETE", async () => {
    const database = await createTestDatabase("books_migrate");
    await runMigrations(pgUrl("owner", database));
    const can = async (table: string, privilege: string) =>
      (
        await ownerPool(database).query("select has_table_privilege('books_app', $1, $2) as ok", [
          table,
          privilege,
        ])
      ).rows[0].ok as boolean;

    const tables = [
      ...["users", "tenants", "memberships", "refresh_sessions", "recovery_codes"],
      ...["locations", "money_places", "money_place_locations", "membership_locations"],
      ...["product_categories", "products", "product_pack_units", "product_barcodes"],
      ...["product_location_prices", "barcode_sequences", "suppliers"],
    ];
    for (const table of tables) {
      for (const p of ["SELECT", "INSERT", "UPDATE"])
        expect(await can(table, p), `${table} ${p}`).toBe(true);
      expect(await can(table, "DELETE"), `${table} DELETE`).toBe(false);
    }
    // Append-only logs: the product history, like the audit log, has no UPDATE and no DELETE.
    expect(await can("product_history", "INSERT")).toBe(true);
    expect(await can("product_history", "UPDATE")).toBe(false);
    expect(await can("product_history", "DELETE")).toBe(false);
    // Append-only audit log.
    expect(await can("audit_log", "INSERT")).toBe(true);
    expect(await can("audit_log", "UPDATE")).toBe(false);
    expect(await can("audit_log", "DELETE")).toBe(false);
  });

  it("enforces the data rules in the database itself", async () => {
    const database = await createTestDatabase("books_migrate");
    await runMigrations(pgUrl("owner", database));
    const pool = ownerPool(database);
    const fails = (text: string, params: unknown[] = []) =>
      pool.query(text, params).then(() => "no error", pgErrorCode);
    const addUser =
      "insert into users (name, phone, email, password_hash) values ($1, $2, $3, 'h') returning id";

    const { id } = (await pool.query(addUser, ["Amina", "+254700000001", null])).rows[0];
    expect(await fails(addUser, ["Dup", "+254700000001", null])).toBe("23505"); // unique phone
    expect(await fails(addUser, ["Caps", null, "Owner@Example.com"])).toBe("23514"); // lower-case email
    expect(await fails(addUser, ["Nobody", null, null])).toBe("23514"); // phone or email
    expect(
      await fails("insert into tenants (name, created_by) values ('x', gen_random_uuid())"),
    ).toBe(
      "23503", // foreign key
    );
    await pool.query("insert into tenants (name, created_by) values ('Shop', $1)", [id]);
    // ON DELETE RESTRICT: a user who created a business can never be removed.
    expect(await fails("delete from users where id = $1", [id])).toBe("23503");
  });
});
