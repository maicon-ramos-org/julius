import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Check your .env file.");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema: { ...schema, ...authSchema } });
}

// Lazy initialization — only connects when actually used
let _db: ReturnType<typeof getDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    if (!_db) {
      _db = getDb();
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
