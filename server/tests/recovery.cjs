const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { resolve } = require("node:path");
const { randomBytes } = require("node:crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const project = process.env.TEST_COMPOSE_PROJECT;
if (project !== "queueshield-audit" || new URL(process.env.DATABASE_URL).port !== "15432") throw new Error("Recovery tests require project queueshield-audit and the isolated database on port 15432.");
const base = process.env.TEST_API_URL || "http://localhost:4003";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
pool.on("error", () => {});
const compose = (...args) => execFileSync("docker", ["compose", "-p", project, ...args], { cwd: resolve(__dirname, "../.."), stdio: "pipe", timeout: 40000 });
async function waitFor(check, timeout = 25000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { try { if (await check()) return; } catch {} await new Promise(r => setTimeout(r, 300)); }
  throw new Error("Recovery condition timed out");
}
(async () => {
  const tag = randomBytes(6).toString("hex"), password = `Recovery-${randomBytes(16).toString("hex")}!A9`;
  let owner, cookie = "", key;
  const call = async (path, method = "GET", body, extra = {}) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie, ...extra }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
    return { status: r.status, data: r.status === 204 ? null : await r.json(), cookie: r.headers.get("set-cookie")?.split(";")[0] };
  };
  try {
    owner = (await pool.query("INSERT INTO admins (name,username,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING admin_id", ["Recovery QA", `recovery_${tag}`, `recovery-${tag}@example.com`, await bcrypt.hash(password, 12)])).rows[0].admin_id;
    const login = await call("/api/auth/login", "POST", { email: `recovery-${tag}@example.com`, password }); assert.equal(login.status, 200); cookie = login.cookie;
    const client = await call("/api/clients", "POST", { name: "Recovery QA", tier: "free", rateLimit: 5, windowSeconds: 60 }); assert.equal(client.status, 201); key = client.data.apiKey;
    assert.equal((await call("/api/auth/logout", "POST", undefined, { Origin: "https://hostile.example" })).status, 403);
    const oversized = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: "x".repeat(270000) }) }); assert.equal(oversized.status, 413);
    compose("stop", "redis");
    assert.equal((await call("/health")).status, 200); assert.equal((await call("/ready")).status, 503);
    const started = Date.now(); assert.equal((await call("/api/probe", "GET", undefined, { "x-api-key": key })).status, 503); assert(Date.now() - started < 6000);
    const job = (await pool.query("INSERT INTO jobs (client_id,job_type,payload) VALUES ($1,'probe',$2) RETURNING job_id", [client.data.clientId, { qa: tag }])).rows[0].job_id;
    compose("start", "redis");
    await waitFor(async () => (await call("/ready")).status === 200);
    await waitFor(async () => (await pool.query("SELECT status FROM jobs WHERE job_id=$1", [job])).rows[0]?.status === "completed");
    compose("restart", "api");
    await waitFor(async () => (await call("/ready")).status === 200);
    assert.equal((await call("/api/auth/me")).status, 200);
    compose("stop", "postgres");
    assert.equal((await call("/health")).status, 200); assert.equal((await call("/ready")).status, 503);
    assert.equal((await call("/api/clients")).status, 503);
    compose("start", "postgres");
    await waitFor(async () => (await call("/ready")).status === 200);
    assert.equal((await call("/api/clients")).status, 200);
    const logs = compose("logs", "--no-color", "api").toString(); assert(!logs.includes(key)); assert(!logs.includes(password));
    console.log(JSON.stringify({ result: "PASS", checks: ["Redis outage fails closed quickly", "liveness stays available", "readiness detects Redis and Postgres outages", "durable missing job reconciles", "API restart preserves session", "Postgres recovery", "CSRF origin rejection", "body limit", "logs omit secrets"] }));
  } finally {
    compose("start", "redis", "postgres", "api");
    await waitFor(async () => (await call("/ready")).status === 200);
    if (owner) await pool.query("DELETE FROM admins WHERE admin_id=$1", [owner]);
    await pool.end();
  }
})().catch(err => { console.error(err.message); process.exit(1); });
