import { createHash } from "node:crypto";
import { z } from "zod";

const reserved = new Set(["admin", "administrator", "support", "root", "moderator", "null", "undefined", "system", "queueshield", "staff", "help", "security"]);
const breachRangeCache = new Map<string, { rows: string[]; expiresAt: number }>();
const breachRangeCacheTtl = 15 * 60 * 1000;
const breachRangeCacheLimit = 500;
export const usernameSchema = z.string().trim().toLowerCase().min(3).max(24)
  .regex(/^[a-z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens.")
  .regex(/[a-z]/, "Include at least one letter.")
  .refine(v => !reserved.has(v), "This username is reserved.");
export const emailSchema = z.string().trim().toLowerCase().email().max(100);
export const passwordSchema = z.string().min(12, "Use at least 12 characters.")
  .max(72, "Use no more than 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.").regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.").regex(/[^a-zA-Z0-9\s]/, "Include a symbol.")
  .refine(v => Buffer.byteLength(v, "utf8") <= 72, "Password must fit within 72 UTF-8 bytes.");

export async function checkPassword(password: string, request = fetch) {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const cached = request === fetch ? breachRangeCache.get(prefix) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.rows.some(row => { const [suffix, count] = row.split(":"); return suffix.toUpperCase() === hash.slice(5) && Number(count) > 0; }))
      throw Object.assign(new Error("This password appears in a known data breach. Choose a different one."), { status: 400 });
    return;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await request(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true", "User-Agent": "QueueShield" }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      const rows = (await response.text()).trim().split(/\r?\n/);
      if (!rows.length || rows.some(row => !/^[A-F0-9]{35}:\d+$/i.test(row))) throw new Error();
      if (request === fetch) {
        if (breachRangeCache.size >= breachRangeCacheLimit) breachRangeCache.delete(breachRangeCache.keys().next().value!);
        breachRangeCache.set(prefix, { rows, expiresAt: Date.now() + breachRangeCacheTtl });
      }
      if (rows.some(row => { const [suffix, count] = row.split(":"); return suffix.toUpperCase() === hash.slice(5) && Number(count) > 0; }))
        throw Object.assign(new Error("This password appears in a known data breach. Choose a different one."), { status: 400 });
      return;
    } catch (err) {
      if ((err as { status?: number }).status === 400) throw err;
      if (attempt) throw Object.assign(new Error("Password safety check is unavailable. Please try again shortly."), { status: 503 });
    }
  }
}
