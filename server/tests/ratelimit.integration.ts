import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

test("Redis atomically caps concurrent traffic, refills, expires, and resets revisions", { skip: !process.env.TEST_API_URL, timeout: 15000 }, async () => {
  const { checkLimit } = await import("../src/ratelimit/index.js");
  const { redis } = await import("../src/redis.js");
  const id = -randomBytes(4).readUInt32BE(0);
  const keys: string[] = [];
  try {
    if (redis.status !== "ready") await new Promise<void>((resolve, reject) => { redis.once("ready", resolve); redis.once("error", reject); });
    for (const algorithm of ["token_bucket", "sliding_window"]) {
      const kind = algorithm === "token_bucket" ? "tb" : "sw";
      keys.push(`rl:${kind}:${id}:1`, `rl:${kind}:${id}:2`, `rl:${kind}:${id}:3`);
      const cfg = { clientId: id, rateLimit: 20, windowSeconds: 60, algorithm };
      const decisions = await Promise.all(Array.from({ length: 100 }, () => checkLimit(cfg)));
      assert.equal(decisions.filter(r => r.allowed).length, 20);
      assert(decisions.filter(r => !r.allowed).every(r => r.remaining === 0 && r.retryAfterMs > 0));
      assert.equal((await checkLimit({ ...cfg, revision: 2 })).remaining, 19);
      const small = { ...cfg, rateLimit: 1, windowSeconds: 1, revision: 3 };
      assert.equal((await checkLimit(small)).allowed, true);
      assert.equal((await checkLimit(small)).allowed, false);
      await new Promise(r => setTimeout(r, 1100));
      assert.equal((await checkLimit(small)).allowed, true);
    }
  } finally { if (keys.length) await redis.del(...keys); await redis.quit(); }
});
