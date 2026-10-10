import { Router } from "express";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { clients, jobs, requestLogs } from "../db/schema.js";
import { requireAuth, wrap } from "../lib/auth.js";

export const historyRouter = Router();
historyRouter.use(requireAuth);
historyRouter.use((_req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
const query = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(100).default(""),
  period: z.enum(["all", "24h", "7d"]).default("all"),
  status: z.string().default("all"),
  algorithm: z.enum(["all", "token_bucket", "sliding_window"]).default("all"),
});
const pattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;
const since = (period: string) => new Date(Date.now() - (period === "24h" ? 1 : 7) * 86400000);
const countsOf = (rows: { status: string; count: number }[]) => Object.fromEntries(rows.map(r => [r.status, Number(r.count)]));

historyRouter.get("/activity", wrap(async (req, res) => {
  const parsed = query.extend({ status: z.enum(["all", "allowed", "blocked"]).default("all") }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid activity filters." });
  const { page, q, period, status, algorithm } = parsed.data;
  const where = and(
    eq(clients.adminId, res.locals.admin.adminId),
    q ? or(ilike(requestLogs.endpoint, pattern(q)), ilike(clients.name, pattern(q))) : undefined,
    status !== "all" ? eq(requestLogs.status, status) : undefined,
    algorithm !== "all" ? eq(requestLogs.algorithmUsed, algorithm) : undefined,
    period !== "all" ? gte(requestLogs.createdAt, since(period)) : undefined,
  );
  const [rows, totals] = await Promise.all([
    db.select({ logId: requestLogs.logId, clientId: clients.clientId, clientName: clients.name, endpoint: requestLogs.endpoint, status: requestLogs.status, algorithmUsed: requestLogs.algorithmUsed, createdAt: requestLogs.createdAt })
      .from(requestLogs).innerJoin(clients, eq(clients.clientId, requestLogs.clientId)).where(where).orderBy(desc(requestLogs.createdAt), desc(requestLogs.logId)).limit(25).offset((page - 1) * 25),
    db.select({ status: requestLogs.status, count: sql<number>`count(*)` }).from(requestLogs).innerJoin(clients, eq(clients.clientId, requestLogs.clientId)).where(where).groupBy(requestLogs.status),
  ]);
  const counts = countsOf(totals);
  res.json({ rows, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), page, limit: 25 });
}));

historyRouter.get("/jobs", wrap(async (req, res) => {
  const parsed = query.extend({ status: z.enum(["all", "queued", "processing", "completed", "failed"]).default("all") }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid job filters." });
  const { page, q, period, status } = parsed.data;
  const where = and(
    eq(clients.adminId, res.locals.admin.adminId),
    q ? or(ilike(clients.name, pattern(q)), ilike(jobs.jobType, pattern(q)), sql`${jobs.jobId}::text = ${q}`) : undefined,
    status !== "all" ? eq(jobs.status, status) : undefined,
    period !== "all" ? gte(jobs.createdAt, since(period)) : undefined,
  );
  const [rows, totals] = await Promise.all([
    db.select({ jobId: jobs.jobId, clientName: clients.name, jobType: jobs.jobType, status: jobs.status, retryCount: jobs.retryCount, createdAt: jobs.createdAt, completedAt: jobs.completedAt })
      .from(jobs).innerJoin(clients, eq(clients.clientId, jobs.clientId)).where(where).orderBy(desc(jobs.createdAt), desc(jobs.jobId)).limit(25).offset((page - 1) * 25),
    db.select({ status: jobs.status, count: sql<number>`count(*)` }).from(jobs).innerJoin(clients, eq(clients.clientId, jobs.clientId)).where(where).groupBy(jobs.status),
  ]);
  const counts = countsOf(totals);
  res.json({ rows, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), page, limit: 25 });
}));
