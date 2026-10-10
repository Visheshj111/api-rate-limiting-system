import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

const base = process.env.TEST_API_URL;

test("account lifecycle, session revocation, and protected changes", { skip: !base, timeout: 60000 }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomBytes(6).toString("hex");
  const password = `Initial-${randomBytes(16).toString("hex")}!A9`;
  const nextPassword = `Changed-${randomBytes(16).toString("hex")}!B8`;
  const email = `qa-${id}@example.com`;
  let adminId: number | undefined;
  async function call(path: string, method = "GET", body?: unknown, cookie?: string, origin?: string) {
    const response = await fetch(`${base}/api/auth${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data, cookie: response.headers.get("set-cookie") || "", headers: response.headers };
  }
  const registration = { name: "Account QA", username: `qa_${id}`, email, password, confirmPassword: password };
  try {
    assert.equal((await call("/me")).status, 401);
    assert.equal((await call("/register", "POST", { ...registration, username: "123456" })).status, 400);
    assert.equal((await call("/register", "POST", { ...registration, username: "ADMIN" })).status, 400);
    assert.equal((await call("/register", "POST", { ...registration, confirmPassword: "different" })).status, 400);
    assert.equal((await call("/register", "POST", { ...registration, password: "Password123!", confirmPassword: "Password123!" })).status, 400);
    const created = await call("/register", "POST", registration);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    adminId = created.data.admin.adminId;
    assert.equal(created.data.admin.passwordHash, undefined);
    assert.match(created.cookie, /HttpOnly/); assert.match(created.cookie, /SameSite=Lax/);
    assert.doesNotMatch(created.cookie, /Max-Age/);
    const first = created.cookie.split(";")[0];
    assert.equal((await call("/me", "GET", undefined, first)).status, 200);
    assert.equal((await call("/register", "POST", { ...registration, email: `other-${email}`, username: registration.username.toUpperCase() })).status, 409);
    const remembered = await call("/login", "POST", { email: email.toUpperCase(), password, remember: true });
    assert.equal(remembered.status, 200); assert.match(remembered.cookie, /Max-Age=2592000/);
    const second = remembered.cookie.split(";")[0];
    assert.equal((await call("/me", "GET", undefined, second)).data.session.remember, true);
    const expiring = await call("/login", "POST", { email, password });
    const expiryCookie = expiring.cookie.split(";")[0];
    const sessionId = JSON.parse(Buffer.from(expiryCookie.split(".")[1], "base64url").toString()).sessionId;
    await pool.query("UPDATE sessions SET expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE session_id=$1 AND admin_id=$2", [sessionId, adminId]);
    assert.equal((await call("/me", "GET", undefined, expiryCookie)).status, 401);
    const profile = { name: "Updated QA", username: `edited_${id}`, email: `new-${email}`, phone: "+91 12345", avatar: null };
    assert.equal((await call("/me", "PATCH", profile, first)).status, 403);
    assert.equal((await call("/me", "PATCH", { ...profile, currentPassword: "incorrect" }, first)).status, 403);
    assert.equal((await call("/me", "PATCH", { ...profile, currentPassword: password }, first, "https://untrusted.example")).status, 403);
    assert.equal((await call("/me", "PATCH", { ...profile, currentPassword: password, avatar: "not-an-image" }, first)).status, 400);
    const saved = await call("/me", "PATCH", { ...profile, currentPassword: password }, first);
    assert.equal(saved.status, 200); assert.equal(saved.data.admin.phone, profile.phone);
    assert.equal((await call("/me", "GET", undefined, second)).status, 401);
    assert.equal((await call("/notifications", "PATCH", { securityAlerts: false, trafficAlerts: false, productUpdates: true }, first)).status, 200);
    assert.equal((await call("/me", "GET", undefined, first)).data.admin.notifications.productUpdates, true);
    const extra = await call("/login", "POST", { email: profile.email, password });
    const third = extra.cookie.split(";")[0];
    assert.equal((await call("/password", "POST", { currentPassword: "wrong", newPassword: nextPassword, confirmPassword: nextPassword }, first)).status, 403);
    assert.equal((await call("/password", "POST", { currentPassword: password, newPassword: nextPassword, confirmPassword: "mismatch" }, first)).status, 400);
    assert.equal((await call("/password", "POST", { currentPassword: password, newPassword: "Password123!", confirmPassword: "Password123!" }, first)).status, 400);
    assert.equal((await call("/password", "POST", { currentPassword: password, newPassword: nextPassword, confirmPassword: nextPassword }, first)).status, 200);
    for (const cookie of [first, third]) assert.equal((await call("/me", "GET", undefined, cookie)).status, 401);
    assert.equal((await call("/login", "POST", { email: profile.email, password })).status, 401);
    const changed = await call("/login", "POST", { email: profile.email, password: nextPassword });
    assert.equal(changed.status, 200);
    const fourth = changed.cookie.split(";")[0];
    assert.equal((await call("/logout", "POST", undefined, fourth)).status, 204);
    assert.equal((await call("/me", "GET", undefined, fourth)).status, 401);
    const final = await call("/login", "POST", { email: profile.email, password: nextPassword });
    const fifth = final.cookie.split(";")[0];
    await pool.query("INSERT INTO reports (admin_id, report_type, date_from, date_to) VALUES ($1,'qa',CURRENT_DATE,CURRENT_DATE)", [adminId]);
    assert.equal((await call("/me", "DELETE", { currentPassword: nextPassword, confirmation: "no" }, fifth)).status, 400);
    assert.equal((await call("/me", "DELETE", { currentPassword: "wrong", confirmation: "DELETE" }, fifth)).status, 403);
    assert.equal((await call("/me", "DELETE", { currentPassword: nextPassword, confirmation: "DELETE" }, fifth)).status, 204);
    assert.equal((await call("/me", "GET", undefined, fifth)).status, 401);
    for (const table of ["admins", "sessions", "reports"]) assert.equal((await pool.query(`SELECT count(*) FROM ${table} WHERE admin_id=$1`, [adminId])).rows[0].count, "0");
  } finally {
    if (adminId) { await pool.query("DELETE FROM reports WHERE admin_id=$1", [adminId]); await pool.query("DELETE FROM admins WHERE admin_id=$1", [adminId]); }
    await pool.end();
  }
});
