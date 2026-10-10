import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const base = process.env.TEST_API_URL;
test("accounts isolate clients, statistics, history, mutations, and account deletion", { skip: !base, timeout: 30000 }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const tag = randomBytes(6).toString("hex"), password = `Isolation-${randomBytes(16).toString("hex")}!A9`;
  const owners: number[] = [];
  let legacyId: number | undefined;
  const call = async (path: string, cookie = "", method = "GET", body?: unknown, key?: string, url = base) => {
    const r = await fetch(`${url}${path}`, { method, headers: { "Content-Type": "application/json", Cookie: cookie, ...(key ? { "x-api-key": key } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: r.status === 204 ? null : await r.json(), cookie: r.headers.get("set-cookie")?.split(";")[0] || "", headers: r.headers };
  };
  try {
    const hash = await bcrypt.hash(password, 12);
    const cookies: string[] = [];
    for (const suffix of ["a", "b"]) {
      const email = `isolation-${tag}-${suffix}@example.com`;
      owners.push((await pool.query("INSERT INTO admins (name,username,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING admin_id", ["Isolation QA", `iso_${tag}_${suffix}`, email, hash])).rows[0].admin_id);
      const login = await call("/api/auth/login", "", "POST", { email, password });
      assert.equal(login.status, 200); cookies.push(login.cookie);
    }
    const [a, b] = cookies;
    const create = (cookie: string) => call("/api/clients", cookie, "POST", { name: `Same name ${tag}`, tier: "free", rateLimit: 3, windowSeconds: 60, algorithm: "sliding_window", adminId: owners[1] });
    const one = await create(a), two = await create(a);
    assert.equal(one.status, 201); assert.equal(one.data.adminId, owners[0]);
    const client = one.data;
    for (const path of ["/api/clients", "/api/reports/timeseries", "/api/reports/per-client", "/api/reports/logs"]) assert.deepEqual((await call(path, b)).data, []);
    assert.deepEqual((await call("/api/reports/stats", b)).data, { allowed: 0, blocked: 0 });
    for (const path of ["/api/history/activity", "/api/history/jobs"]) assert.equal((await call(path, b)).data.total, 0);
    for (const method of ["PATCH", "DELETE"]) assert.equal((await call(`/api/clients/${client.clientId}`, b, method, method === "PATCH" ? { rateLimit: 55 } : undefined)).status, 404);
    assert.equal((await call("/api/clients", a)).data[1].rateLimit, 3);
    for (const body of [{ rateLimit: 10000 }, { windowSeconds: 0 }, { algorithm: "invalid" }]) assert.equal((await call(`/api/clients/${client.clientId}`, a, "PATCH", body)).status, 400);
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => call("/api/probe", "", "GET", undefined, client.apiKey, i % 2 && process.env.TEST_SECOND_API_URL ? process.env.TEST_SECOND_API_URL : base)));
    assert.equal(responses.filter(r => r.status === 200 || r.status === 202).length, 3);
    assert.equal(responses.filter(r => r.status === 429).length, 9);
    assert(responses.filter(r => r.status === 429).every(r => Number(r.headers.get("retry-after")) > 0));
    await call("/api/probe", "", "GET", undefined, two.data.apiKey);
    const old = new Date(Date.now() - 86400000);
    await pool.query("INSERT INTO request_logs (client_id,endpoint,status,algorithm_used,created_at) VALUES ($1,'/old','allowed','sliding_window',$2)", [client.clientId, old]);
    assert.deepEqual((await call("/api/reports/stats", a)).data, { allowed: 5, blocked: 9 });
    assert.deepEqual((await call("/api/reports/stats", b)).data, { allowed: 0, blocked: 0 });
    const grouped = (await call("/api/reports/per-client", a)).data;
    assert.equal(grouped.length, 2); assert.equal(new Set(grouped.map(r => r.clientId)).size, 2);
    const series = (await call("/api/reports/timeseries", a)).data;
    assert(series.every(r => /^\d{4}-\d{2}-\d{2}T/.test(r.bucket)));
    assert.equal(series.reduce((sum, r) => sum + r.allowed + r.blocked, 0), 13);
    for (const path of ["/api/history/activity?q=" + tag, "/api/history/jobs?q=" + tag]) assert.equal((await call(path, b)).data.total, 0);
    legacyId = (await pool.query("INSERT INTO clients (name,api_key,tier,rate_limit,window_seconds) VALUES ('Legacy QA',$1,'free',3,60) RETURNING client_id", [`qs_legacy_${tag}`])).rows[0].client_id;
    assert.equal((await call("/api/probe", "", "GET", undefined, `qs_legacy_${tag}`)).status, 401);
    assert(!(await call("/api/clients", a)).data.some(r => r.clientId === legacyId));
    const changed = await call(`/api/clients/${client.clientId}`, a, "PATCH", { rateLimit: 55 });
    assert.equal(changed.status, 200); assert.equal(changed.data.revision, 2);
    assert.equal((await call("/api/probe", "", "GET", undefined, client.apiKey)).headers.get("x-ratelimit-remaining"), "54");
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const pending = (await pool.query("SELECT count(*) FROM jobs WHERE client_id=ANY($1::int[]) AND status != 'completed'", [[client.clientId, two.data.clientId]])).rows[0].count;
      if (pending === "0") break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal((await pool.query("SELECT count(*) FROM jobs WHERE client_id=ANY($1::int[]) AND status != 'completed'", [[client.clientId, two.data.clientId]])).rows[0].count, "0");
    assert.equal((await call("/api/auth/me", a, "DELETE", { currentPassword: password, confirmation: "DELETE" })).status, 204);
    for (const table of ["request_logs", "jobs"]) assert.equal((await pool.query(`SELECT count(*) FROM ${table} WHERE client_id=ANY($1::int[])`, [[client.clientId, two.data.clientId]])).rows[0].count, "0");
    assert.equal((await call("/api/clients", a)).status, 401);
    assert.equal((await call("/api/auth/me", b)).status, 200);
    assert.equal((await call("/health")).status, 200); assert.equal((await call("/ready")).status, 200);
    const malformed = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400); assert.deepEqual(await malformed.json(), { error: "Invalid JSON." });
    assert.equal((await call("/missing")).status, 404);
  } finally {
    if (legacyId) await pool.query("DELETE FROM clients WHERE client_id=$1 AND admin_id IS NULL", [legacyId]);
    await pool.query("DELETE FROM admins WHERE admin_id=ANY($1::int[])", [owners]);
    await pool.end();
  }
});
