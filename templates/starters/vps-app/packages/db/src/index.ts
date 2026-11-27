import Valkey from "iovalkey";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DatabaseTables } from "./ktr/tables.js";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DatabaseTables>({
  dialect: new PostgresDialect({ pool }),
});

export const valkey = new Valkey(
  process.env.VALKEY_URL ?? "redis://localhost:6379",
);
