import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DatabaseTables } from "./ktr/tables.js";

export function createDb(connectionString = process.env.DATABASE_URL) {
  return new Kysely<DatabaseTables>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}
