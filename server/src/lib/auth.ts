import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { and, eq, gt, lt } from "drizzle-orm";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { admins, sessions, Admin } from "../db/schema.js";
import { redis } from "../redis.js";

const cookieOptions = { httpOnly: true, secure: env.production, sameSite: "lax" as const, path: "/api" };
export const wrap = (fn: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };
export function publicAdmin(a: Admin) {
  const { passwordHash, ...profile } = a;
  return profile;
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function startSession(res: Response, admin: Admin, remember: boolean, database: typeof db | Transaction = db) {
  const sessionId = randomBytes(32).toString("hex");
  const seconds = remember ? 30 * 86400 : 12 * 3600;
  await database.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await database.transaction(async tx => {
    const [row] = await tx.select({ id: admins.adminId }).from(admins).where(and(eq(admins.adminId, admin.adminId), eq(admins.passwordHash, admin.passwordHash))).for("update");
    if (!row) throw Object.assign(new Error("Your account changed. Please sign in again."), { status: 409 });
    await tx.insert(sessions).values({ sessionId, adminId: admin.adminId, remember, expiresAt: new Date(Date.now() + seconds * 1000) });
  });
  const token = jwt.sign({ adminId: admin.adminId, sessionId }, env.jwtSecret, { expiresIn: seconds, algorithm: "HS256" });
  res.cookie("qs_session", token, { ...cookieOptions, ...(remember ? { maxAge: seconds * 1000 } : {}) });
}
export function clearSession(res: Response) { res.clearCookie("qs_session", cookieOptions); }

export const requireAuth = wrap(async (req: Request, res: Response, next: NextFunction) => {
  const cookie = req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith("qs_session="))?.slice(11);
  const token = req.header("authorization")?.replace(/^Bearer /, "") || cookie;
  let payload: { adminId: number; sessionId: string };
  try {
    const verified = jwt.verify(token || "", env.jwtSecret, { algorithms: ["HS256"] });
    if (typeof verified === "string" || !Number.isInteger(verified.adminId) || typeof verified.sessionId !== "string") throw new Error();
    payload = verified as typeof payload;
  } catch { clearSession(res); return res.status(401).json({ error: "Please sign in again." }); }
  const [row] = await db.select().from(sessions).innerJoin(admins, eq(sessions.adminId, admins.adminId))
    .where(and(eq(sessions.sessionId, payload.sessionId), eq(admins.adminId, payload.adminId), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!row) { clearSession(res); return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
  res.locals.admin = row.admins;
  res.locals.session = row.sessions;
  next();
});

export const throttleAuth = wrap(async (req, res, next) => {
  const forwarded = req.header("x-client-ip") || "";
  const ip = env.proxySecret && req.header("x-proxy-secret") === env.proxySecret && isIP(forwarded) ? forwarded : req.ip;
  const count = Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n", 1, `auth:${req.path}:${ip}`));
  if (count > 30) { res.set("Retry-After", "900"); return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." }); }
  next();
});
