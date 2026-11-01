import type { Client } from "pg";

export declare const OWNER_ROLE: "books_owner";
export declare const APP_ROLE: "books_app";

export declare function provisionRoles(
  admin: Client,
  passwords: { ownerPassword: string; appPassword: string },
): Promise<void>;

export declare function createDatabase(admin: Client, name: string): Promise<void>;
