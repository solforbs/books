import { Logger } from "@nestjs/common";
import type { Pool } from "pg";

export interface AppRoleFacts {
  role: string;
  superuser: boolean;
  bypassRls: boolean;
  ownedTables: number;
}

export async function readAppRoleFacts(pool: Pool): Promise<AppRoleFacts> {
  const { rows } = await pool.query<AppRoleFacts>(
    `select current_user as role, r.rolsuper as superuser, r.rolbypassrls as "bypassRls",
            (select count(*)::int from pg_tables
              where schemaname = 'public' and tableowner = current_user) as "ownedTables"
       from pg_roles r where r.rolname = current_user`,
  );
  return rows[0]!;
}

/** What is wrong with the request role, if anything (empty = safe). */
export function appRoleProblems(f: AppRoleFacts): string[] {
  const problems: string[] = [];
  if (f.superuser) problems.push("is a superuser (row-level security does not apply)");
  if (f.bypassRls) problems.push("has BYPASSRLS (row-level security does not apply)");
  if (f.ownedTables > 0) {
    problems.push("owns tables (it could alter them or switch row-level security off)");
  }
  return problems;
}

/**
 * Row-level security is only a real second guard if the API's request role is
 * an ordinary role that owns nothing. Production refuses to start otherwise;
 * development and tests only warn.
 */
export async function assertRestrictedAppRole(pool: Pool, production: boolean): Promise<void> {
  const facts = await readAppRoleFacts(pool);
  const problems = appRoleProblems(facts);
  if (problems.length === 0) return;
  const message = `DATABASE_URL role "${facts.role}" ${problems.join("; ")}. Use the restricted books_app role.`;
  if (production) throw new Error(message);
  new Logger("Database").warn(message);
}
