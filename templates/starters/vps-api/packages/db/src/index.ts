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

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await valkey.incr(key);
  if (count === 1) {
    await valkey.expire(key, windowSeconds);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
