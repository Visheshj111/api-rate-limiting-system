import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

test("history filters, pagination, job visibility, and safe client deletion", { skip: !process.env.TEST_API_URL, timeout: 30000 }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = process.env.TEST_API_URL;
  const id = randomBytes(6).toString("hex");
  const email = `history-${id}@example.com`, password = `Test-${randomBytes(12).toString("hex")}!A9`;
  let adminId: number | undefined, clientId: number | undefined, emptyClientId: number | undefined;
  let cookie = "";
  async function call(path: string, method = "GET", body?: unknown, authenticated = true) {
    const res = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: res.status === 204 ? null : await res.json(), cookie: res.headers.get("set-cookie") || "" };
  }
  try {
    adminId = (await pool.query("INSERT INTO admins (name,username,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING admin_id", ["History QA", `history_${id}`, email, await bcrypt.hash(password, 12)])).rows[0].admin_id;
    const login = await call("/api/auth/login", "POST", { email, password }); assert.equal(login.status, 200); cookie = login.cookie.split(";")[0];
    const name = `QA ${id} 100%_literal`;
    clientId = (await pool.query("INSERT INTO clients (name,api_key,admin_id,tier,rate_limit,window_seconds) VALUES ($1,$2,$3,'free',5,10) RETURNING client_id", [name, `qs_qa_${id}`, adminId])).rows[0].client_id;
    for (let i = 0; i < 27; i++) await pool.query("INSERT INTO request_logs (client_id,endpoint,status,algorithm_used,created_at) VALUES ($1,$2,$3,$4,$5)", [clientId, `/qa/${id}/${i}`, i % 2 ? "blocked" : "allowed", i < 10 ? "token_bucket" : "sliding_window", new Date(Date.now() - (i < 15 ? i * 1000 : 10 * 86400000 + i * 1000))]);
    for (const status of ["queued", "processing", "completed", "failed"]) await pool.query("INSERT INTO jobs (client_id,job_type,payload,status) VALUES ($1,'qa_fixture',$2,$3)", [clientId, { private: "not-for-history-response" }, status]);
    assert.equal((await call("/api/history/activity", "GET", undefined, false)).status, 401);
    assert.equal((await call("/api/history/jobs", "GET", undefined, false)).status, 401);
    for (const filter of ["page=0", "page=100001", "status=invalid", "algorithm=invalid", "period=invalid"]) assert.equal((await call(`/api/history/activity?${filter}`)).status, 400);
    assert.equal((await call("/api/history/jobs?status=allowed")).status, 400);
    const first = await call(`/api/history/activity?q=${id}`), second = await call(`/api/history/activity?q=${id}&page=2`);
    assert.equal(first.status, 200); assert.equal(first.data.total, 27); assert.equal(first.data.rows.length, 25); assert.equal(second.data.rows.length, 2);
    assert.equal(new Set([...first.data.rows, ...second.data.rows].map(r => r.logId)).size, 27);
    assert.deepEqual(first.data.counts, { allowed: 14, blocked: 13 });
    assert.equal((await call(`/api/history/activity?q=${id}&status=allowed`)).data.total, 14);
    assert.equal((await call(`/api/history/activity?q=${id}&algorithm=token_bucket`)).data.total, 10);
    assert.equal((await call(`/api/history/activity?q=${id}&period=24h`)).data.total, 15);
    assert.equal((await call(`/api/history/activity?q=${encodeURIComponent(name)}`)).data.total, 27);
    const jobs = await call(`/api/history/jobs?q=${id}`);
    assert.equal(jobs.status, 200); assert.equal(jobs.data.total, 4);
    assert.deepEqual(Object.keys(jobs.data.counts).sort(), ["completed", "failed", "processing", "queued"]);
    assert(!JSON.stringify(jobs.data).includes("not-for-history-response"));
    assert(!JSON.stringify(jobs.data).includes(`qs_qa_${id}`));
    for (const status of ["queued", "processing", "completed", "failed"]) assert.equal((await call(`/api/history/jobs?q=${id}&status=${status}`)).data.total, 1);
    assert.equal((await call(`/api/clients/${clientId}`, "DELETE")).status, 204);
    assert.equal((await call(`/api/history/activity?q=${id}`)).data.total, 0);
    assert.equal((await call(`/api/history/jobs?q=${id}`)).status, 200);
    assert.equal((await call("/api/clients/invalid", "DELETE")).status, 400);
    assert.equal((await call(`/api/clients/${clientId}`, "PATCH", {})).status, 400);
    assert.equal((await call(`/api/clients/${clientId}`, "PATCH", { rateLimit: 2147483648 })).status, 400);
    const empty = await call("/api/clients", "POST", { name: `Empty ${id}`, tier: "free", rateLimit: 5, windowSeconds: 10 });
    assert.equal(empty.status, 201); emptyClientId = empty.data.clientId;
    assert.equal((await call(`/api/clients/${emptyClientId}`, "DELETE")).status, 204);
  } finally {
    if (clientId) { await pool.query("DELETE FROM request_logs WHERE client_id=$1", [clientId]); await pool.query("DELETE FROM jobs WHERE client_id=$1", [clientId]); await pool.query("DELETE FROM clients WHERE client_id=$1", [clientId]); }
    if (emptyClientId) await pool.query("DELETE FROM clients WHERE client_id=$1", [emptyClientId]);
    if (adminId) await pool.query("DELETE FROM admins WHERE admin_id=$1", [adminId]);
    await pool.end();
  }
});
