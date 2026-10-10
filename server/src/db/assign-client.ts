import { randomBytes } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db, pool } from "./client.js";
import { admins, clients } from "./schema.js";
import { hashKey, sealKey } from "../lib/keys.js";

const [clientId, adminId] = process.argv.slice(2).map(Number);
try {
  if (![clientId, adminId].every(v => Number.isInteger(v) && v > 0)) throw new Error("Usage: npm run client:assign -- CLIENT_ID ADMIN_ID");
  await db.transaction(async tx => {
    const [admin] = await tx.select().from(admins).where(eq(admins.adminId, adminId));
    const [client] = await tx.select().from(clients).where(and(eq(clients.clientId, clientId), isNull(clients.adminId))).for("update");
    if (!admin || !client) throw new Error("Account missing or client is already owned.");
    if (![client.rateLimit, client.windowSeconds].every(v => v >= 1 && v <= 9999)) throw new Error("Legacy limits must be corrected to 1-9999 before assignment.");
    const apiKey = `qs_${randomBytes(20).toString("hex")}`;
    await tx.update(clients).set({ adminId, apiKey: sealKey(apiKey), apiKeyHash: hashKey(apiKey), revision: client.revision + 1 }).where(eq(clients.clientId, clientId));
  });
  console.log(`Assigned client ${clientId} to account ${adminId}. The old key is revoked; copy the new key from Clients.`);
} finally { await pool.end(); }
