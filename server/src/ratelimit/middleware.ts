import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { clients, requestLogs } from "../db/schema.js";
import { checkLimit } from "./index.js";
import { wrap } from "../lib/auth.js";
import { hashKey } from "../lib/keys.js";

export const rateLimit = wrap(async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey.length > 64) return res.status(401).json({ error: "Invalid API key." });

  const client = (
    await db.select().from(clients).where(eq(clients.apiKeyHash, hashKey(apiKey))).limit(1)
  )[0];
  if (!client?.adminId) return res.status(401).json({ error: "Invalid API key." });
  res.locals.client = client;

  const decision = await checkLimit({
    clientId: client.clientId,
    rateLimit: client.rateLimit,
    windowSeconds: client.windowSeconds,
    algorithm: client.algorithm,
    revision: client.revision,
  });

  const status = decision.allowed ? "allowed" : "blocked";
  await db.insert(requestLogs)
    .values({
      clientId: client.clientId,
      endpoint: req.path,
      status,
      algorithmUsed: client.algorithm,
    });

  res.set("X-RateLimit-Remaining", String(decision.remaining));
  res.set("X-RateLimit-Limit", String(client.rateLimit));
  res.set("X-RateLimit-Status", status);
  if (!decision.allowed) {
    res.set("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
    return res.status(429).json({ error: "rate limit exceeded", status });
  }

  res.set("X-RateLimit-Status", status);
  next();
});
