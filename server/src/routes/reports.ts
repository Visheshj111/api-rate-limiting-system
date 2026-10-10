import { Router } from "express";
import { and, sql, eq, desc, gte, getTableColumns } from "drizzle-orm";
import { db } from "../db/client.js";
import { requestLogs, clients } from "../db/schema.js";
import { requireAuth, wrap } from "../lib/auth.js";

export const reportRouter = Router();
reportRouter.use(requireAuth);

reportRouter.get("/stats", wrap(async (_req, res) => {
  const [totals] = await db
    .select({
      allowed: sql<number>`count(*) filter (where ${requestLogs.status} = 'allowed')`,
      blocked: sql<number>`count(*) filter (where ${requestLogs.status} = 'blocked')`,
    })
    .from(requestLogs).innerJoin(clients, eq(clients.clientId, requestLogs.clientId))
    .where(eq(clients.adminId, res.locals.admin.adminId));

  res.json({ allowed: Number(totals.allowed), blocked: Number(totals.blocked) });
}));

reportRouter.get("/timeseries", wrap(async (_req, res) => {
  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc('minute', ${requestLogs.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      allowed: sql<number>`count(*) filter (where ${requestLogs.status} = 'allowed')`,
      blocked: sql<number>`count(*) filter (where ${requestLogs.status} = 'blocked')`,
    })
    .from(requestLogs)
    .innerJoin(clients, eq(clients.clientId, requestLogs.clientId))
    .where(and(eq(clients.adminId, res.locals.admin.adminId), gte(requestLogs.createdAt, new Date(Date.now() - 3600000))))
    .groupBy(sql`1`)
    .orderBy(sql`1`)
    .limit(61);

  res.json(rows.map((r) => ({ ...r, allowed: Number(r.allowed), blocked: Number(r.blocked) })));
}));

reportRouter.get("/per-client", wrap(async (_req, res) => {
  const rows = await db
    .select({
      name: clients.name,
      clientId: clients.clientId,
      allowed: sql<number>`count(*) filter (where ${requestLogs.status} = 'allowed')`,
      blocked: sql<number>`count(*) filter (where ${requestLogs.status} = 'blocked')`,
    })
    .from(requestLogs)
    .innerJoin(clients, eq(clients.clientId, requestLogs.clientId))
    .where(eq(clients.adminId, res.locals.admin.adminId))
    .groupBy(clients.clientId, clients.name);

  res.json(rows.map((r) => ({ ...r, allowed: Number(r.allowed), blocked: Number(r.blocked) })));
}));

reportRouter.get("/logs", wrap(async (_req, res) => {
  res.json(await db.select(getTableColumns(requestLogs)).from(requestLogs)
    .innerJoin(clients, eq(clients.clientId, requestLogs.clientId))
    .where(eq(clients.adminId, res.locals.admin.adminId)).orderBy(desc(requestLogs.logId)).limit(50));
}));
