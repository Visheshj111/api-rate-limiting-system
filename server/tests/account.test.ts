import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { checkPassword, emailSchema, passwordSchema, usernameSchema } from "../src/lib/account.js";

test("usernames normalize and reject reserved, numeric, short, long, or unsafe names", () => {
  assert.equal(usernameSchema.parse(" Alex_12-Ok "), "alex_12-ok");
  for (const value of ["12345", "___", "aa", "a".repeat(25), "Admin", "support", "root", "moderator", "NULL", "hello world", "hello@you"])
    assert.equal(usernameSchema.safeParse(value).success, false, value);
  assert.equal(emailSchema.parse(" Alex@Example.com "), "alex@example.com");
});

test("password requirements include the bcrypt byte limit", () => {
  assert.equal(passwordSchema.safeParse("Strong-Password42!").success, true);
  for (const value of ["Aa1!short", "lowercaseonly42!", "UPPERCASEONLY42!", "MissingNumbers!", "MissingSymbols42", "Aa1!" + "x".repeat(69), "Aa1!" + "é".repeat(35)])
    assert.equal(passwordSchema.safeParse(value).success, false);
});

test("breach check sends only the hash prefix, requests padding, and ignores zero-count padding", async () => {
  const password = "Private-Example42!";
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  await checkPassword(password, (async (url, options) => {
    assert.equal(url, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    assert.equal((options?.headers as Record<string, string>)["Add-Padding"], "true");
    assert.equal(options?.body, undefined);
    return new Response(`${hash.slice(5)}:0\r\n${"A".repeat(35)}:15`);
  }) as typeof fetch);
  await assert.rejects(() => checkPassword(password, (async () => new Response(`${hash.slice(5)}:123`)) as typeof fetch), { status: 400 });
});

test("breach check reuses a recent valid range when the provider briefly becomes unreachable", async () => {
  const password = "Cached-Example42!";
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(`${hash.slice(5)}:0`);
  }) as typeof fetch;
  try {
    await checkPassword(password);
    await checkPassword(password);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("breach check refuses to accept passwords when the provider fails", async () => {
  for (const request of [async () => { throw new Error("offline"); }, async () => new Response("broken"), async () => new Response("", { status: 503 })])
    await assert.rejects(() => checkPassword("Private-Example42!", request as typeof fetch), { status: 503 });
});
