import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { env } from "../env.js";
import { Pool } from "pg";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { clients } from "./schema.js";
import { hashKey, sealKey } from "../lib/keys.js";

const pool = new Pool({ connectionString: env.databaseUrl, max: 1, connectionTimeoutMillis: 10000 });
const connection = await pool.connect();
try {
  await connection.query("SELECT pg_advisory_lock(72421865)");
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  const database = drizzle(connection);
  const rows = await database.select().from(clients).where(and(isNotNull(clients.adminId), isNull(clients.apiKeyHash)));
  for (const row of rows) await database.update(clients).set({ apiKey: sealKey(row.apiKey), apiKeyHash: hashKey(row.apiKey) }).where(eq(clients.clientId, row.clientId));
  console.log("Database migrations applied");
} finally {
  await connection.query("SELECT pg_advisory_unlock(72421865)");
  connection.release();
  await pool.end();
}
