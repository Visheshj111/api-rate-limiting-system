import { Router } from "express";
import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { clients } from "../db/schema.js";
import { requireAuth, wrap } from "../lib/auth.js";
import { hashKey, sealKey, publicClient } from "../lib/keys.js";

export const clientRouter = Router();
clientRouter.use(requireAuth);
clientRouter.param("id", (req, res, next, raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) return res.status(400).json({ error: "Invalid client ID." });
  next();
});

const createBody = z.object({
  name: z.string().trim().min(1).max(100),
  tier: z.enum(["free", "pro", "enterprise"]),
  rateLimit: z.number().int().positive().max(9999),
  windowSeconds: z.number().int().positive().max(9999),
  algorithm: z.enum(["token_bucket", "sliding_window"]).default("token_bucket"),
});

clientRouter.get("/", wrap(async (_req, res) => {
  const rows = await db.select().from(clients).where(eq(clients.adminId, res.locals.admin.adminId)).orderBy(desc(clients.clientId));
  res.json(rows.map(publicClient));
}));

clientRouter.post("/", wrap(async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid input" });

  const apiKey = `qs_${randomBytes(20).toString("hex")}`;
  const [client] = await db
    .insert(clients)
    .values({ ...parsed.data, apiKey: sealKey(apiKey), apiKeyHash: hashKey(apiKey), adminId: res.locals.admin.adminId })
    .returning();

  res.status(201).json(publicClient(client));
}));

clientRouter.patch("/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const patch = createBody.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: "invalid input" });

  const [client] = await db
    .update(clients)
    .set({ ...patch.data, revision: sql`${clients.revision} + 1` })
    .where(and(eq(clients.clientId, id), eq(clients.adminId, res.locals.admin.adminId)))
    .returning();
  if (!client) return res.status(404).json({ error: "not found" });

  res.json(publicClient(client));
}));

clientRouter.delete("/:id", wrap(async (req, res) => {
  try {
    const deleted = await db.delete(clients).where(and(eq(clients.clientId, Number(req.params.id)), eq(clients.adminId, res.locals.admin.adminId))).returning({ id: clients.clientId });
    if (!deleted.length) return res.status(404).json({ error: "Client not found." });
    res.status(204).end();
  } catch (err) {
    if ((err as { code?: string }).code === "23503") return res.status(409).json({ error: "This client has request history or jobs and cannot be deleted." });
    throw err;
  }
}));
