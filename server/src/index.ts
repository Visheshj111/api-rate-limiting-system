import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { startWorker, stopWorker } from "./queue.js";
import { pool } from "./db/client.js";
import { redis } from "./redis.js";
import { wrap } from "./lib/auth.js";
import { randomUUID } from "node:crypto";
import { authRouter } from "./routes/auth.js";
import { clientRouter } from "./routes/clients.js";
import { probeRouter } from "./routes/probe.js";
import { reportRouter } from "./routes/reports.js";
import { historyRouter } from "./routes/history.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);
app.use((req, res, next) => {
  const id = randomUUID(), started = Date.now(), path = req.path;
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "X-Request-ID": id });
  if (env.production) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.on("finish", () => {
    if (!["/health", "/ready"].includes(path)) console.log(JSON.stringify({ id, method: req.method, path, status: res.statusCode, ms: Date.now() - started }));
  });
  next();
});
app.use(cors({ origin: env.webOrigins, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && !env.webOrigins.includes(req.headers.origin))
    return res.status(403).json({ error: "Origin not allowed" });
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "queueshield-api", uptime: Math.floor(process.uptime()) }));
app.get("/ready", wrap(async (_req, res) => {
  try { await Promise.all([pool.query("SELECT 1"), redis.ping()]); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
}));
app.use("/api/auth", authRouter);
app.use("/api/clients", clientRouter);
app.use("/api", probeRouter);
app.use("/api/reports", reportRouter);
app.use("/api/history", historyRouter);
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.use(((err, _req, res, _next) => {
  const dependencyFailure = ["ECONNREFUSED", "ETIMEDOUT", "57P01", "53300"].includes(err.code) || /Connection is closed|Stream isn't writeable|Command timed out|Connection terminated/.test(err.message || "");
  const status = dependencyFailure ? 503 : err.status || 500;
  if (status === 500) console.error("API request failed", err.code || err.name);
  res.status(status).json({ error: dependencyFailure ? "A required service is unavailable. Please retry shortly." : status === 500 ? "Something went wrong. Please try again." : status === 413 ? "Request is too large." : status === 400 && err.type === "entity.parse.failed" ? "Invalid JSON." : err.message });
}) as express.ErrorRequestHandler);

const server = app.listen(env.port, "0.0.0.0", () => {
  startWorker();
  console.log(`queueshield api on :${env.port}`);
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const deadline = setTimeout(() => process.exit(1), 25000).unref();
  try {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await stopWorker();
    await redis.quit();
    await pool.end();
    clearTimeout(deadline);
    process.exit(0);
  } catch { process.exit(1); }
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
