import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env.js";
import * as schema from "./schema.js";

export const pool = new Pool({ connectionString: env.databaseUrl, max: env.dbPoolSize, connectionTimeoutMillis: 3000, statement_timeout: 10000, idleTimeoutMillis: 30000 });
pool.on("error", () => console.error("Postgres connection unavailable"));

export const db = drizzle(pool, { schema });
