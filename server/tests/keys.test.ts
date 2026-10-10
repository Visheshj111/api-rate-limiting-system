import { test } from "node:test";
import assert from "node:assert/strict";

test("API keys are encrypted with unique IVs and authenticated against tampering", async () => {
  process.env.DATABASE_URL ||= "postgres://localhost/test";
  process.env.REDIS_URL ||= "redis://localhost:6379";
  process.env.JWT_SECRET ||= "unit-test-secret-that-is-never-used-in-production";
  const { sealKey, openKey, hashKey } = await import("../src/lib/keys.js");
  const value = "qs_private_test_key", sealed = sealKey(value);
  assert(!sealed.includes(value));
  assert.notEqual(sealed, sealKey(value));
  assert.equal(openKey(sealed), value);
  const parts = sealed.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  assert.throws(() => openKey(parts.join(".")));
  assert.throws(() => openKey(value));
  assert.equal(hashKey(value).length, 64);
  assert.notEqual(hashKey(value), hashKey(value + "x"));
});
