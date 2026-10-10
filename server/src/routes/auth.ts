import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { admins, reports, sessions, Admin } from "../db/schema.js";
import { clearSession, publicAdmin, requireAuth, startSession, throttleAuth, wrap } from "../lib/auth.js";
import { checkPassword, emailSchema, passwordSchema, usernameSchema } from "../lib/account.js";
import { env } from "../env.js";
import { errorCode } from "../lib/errors.js";

export const authRouter = Router();
authRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const currentPassword = z.string().min(1, "Enter your current password.").max(200);
const dummyHash = bcrypt.hashSync("invalid-account-placeholder", 12);
const registerBody = z.object({ name: z.string().trim().min(1).max(100), username: usernameSchema, email: emailSchema, password: passwordSchema, confirmPassword: z.string(), remember: z.boolean().default(false) })
  .refine(v => v.password === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

authRouter.post("/register", throttleAuth, wrap(async (req, res) => {
  if (!env.allowRegistration) return res.status(403).json({ error: "Registration is currently closed." });
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, username, email, password, remember } = parsed.data;
  const exists = await db.select({ id: admins.adminId }).from(admins).where(or(eq(admins.email, email), eq(admins.username, username))).limit(1);
  if (exists.length) return res.status(409).json({ error: "That email or username is already in use." });
  await checkPassword(password);
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await db.transaction(async tx => {
      const [row] = await tx.insert(admins).values({ name, username, email, passwordHash }).returning();
      await startSession(res, row, remember, tx);
      return row;
    });
    res.status(201).json({ admin: publicAdmin(admin) });
  } catch (err) {
    if (errorCode(err) === "23505") return res.status(409).json({ error: "That email or username is already in use." });
    throw err;
  }
}));

authRouter.post("/login", throttleAuth, wrap(async (req, res) => {
  const parsed = z.object({ email: emailSchema, password: currentPassword, remember: z.boolean().default(false) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const { email, password, remember } = parsed.data;
  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  const valid = await bcrypt.compare(password, admin?.passwordHash || dummyHash);
  if (!admin || !valid) return res.status(401).json({ error: "Email or password is incorrect." });
  await startSession(res, admin, remember);
  res.json({ admin: publicAdmin(admin) });
}));

authRouter.get("/me", requireAuth, (_req, res) => res.json({ admin: publicAdmin(res.locals.admin), session: { remember: res.locals.session.remember, expiresAt: res.locals.session.expiresAt } }));
authRouter.post("/logout", requireAuth, wrap(async (_req, res) => {
  await db.delete(sessions).where(eq(sessions.sessionId, res.locals.session.sessionId));
  clearSession(res); res.status(204).end();
}));

const avatarSchema = z.string().max(200000).regex(/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/).refine(value => {
  const bytes = Buffer.from(value.split(",")[1] || "", "base64");
  return value.startsWith("data:image/png") ? bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : value.startsWith("data:image/jpeg") ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}, "Choose a PNG, JPEG, or WebP image.").nullable();
const profileBody = z.object({
  name: z.string().trim().min(1).max(100), username: usernameSchema, email: emailSchema,
  phone: z.string().trim().max(24).regex(/^[+\d\s()-]*$/, "Enter a valid phone number."), avatar: avatarSchema,
  currentPassword: currentPassword.optional(),
});
authRouter.patch("/me", requireAuth, wrap(async (req, res) => {
  const parsed = profileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const admin: Admin = res.locals.admin;
  const { currentPassword: password, ...profile } = parsed.data;
  if (profile.email !== admin.email && (!password || !await bcrypt.compare(password, admin.passwordHash)))
    return res.status(403).json({ error: "Enter your current password to change your email." });
  try {
    const updated = await db.transaction(async tx => {
      const [row] = await tx.update(admins).set(profile).where(and(eq(admins.adminId, admin.adminId), eq(admins.passwordHash, admin.passwordHash))).returning();
      if (!row) throw Object.assign(new Error("Your account changed. Sign in and try again."), { status: 409 });
      if (profile.email !== admin.email) await tx.delete(sessions).where(and(eq(sessions.adminId, admin.adminId), ne(sessions.sessionId, res.locals.session.sessionId)));
      return row;
    });
    res.json({ admin: publicAdmin(updated) });
  } catch (err) {
    if (errorCode(err) === "23505") return res.status(409).json({ error: "That email or username is already in use." });
    throw err;
  }
}));

authRouter.patch("/notifications", requireAuth, wrap(async (req, res) => {
  const parsed = z.object({ securityAlerts: z.boolean(), trafficAlerts: z.boolean(), productUpdates: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid notification preferences." });
  const [admin] = await db.update(admins).set({ notifications: parsed.data }).where(eq(admins.adminId, res.locals.admin.adminId)).returning();
  if (!admin) return res.status(409).json({ error: "Your account changed. Please sign in again." });
  res.json({ admin: publicAdmin(admin) });
}));

authRouter.post("/password", requireAuth, throttleAuth, wrap(async (req, res) => {
  const parsed = z.object({ currentPassword, newPassword: passwordSchema, confirmPassword: z.string() })
    .refine(v => v.newPassword === v.confirmPassword, { message: "New passwords do not match.", path: ["confirmPassword"] }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const admin: Admin = res.locals.admin;
  if (!await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash)) return res.status(403).json({ error: "Current password is incorrect." });
  if (await bcrypt.compare(parsed.data.newPassword, admin.passwordHash)) return res.status(400).json({ error: "Choose a password different from your current one." });
  await checkPassword(parsed.data.newPassword);
  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  const changed = await db.transaction(async tx => {
    const updated = await tx.update(admins).set({ passwordHash: hash }).where(and(eq(admins.adminId, admin.adminId), eq(admins.passwordHash, admin.passwordHash))).returning();
    if (updated.length) await tx.delete(sessions).where(eq(sessions.adminId, admin.adminId));
    return updated.length;
  });
  if (!changed) return res.status(409).json({ error: "Your account changed. Sign in and try again." });
  clearSession(res); res.json({ message: "Password changed. Sign in with your new password." });
}));

authRouter.delete("/me", requireAuth, throttleAuth, wrap(async (req, res) => {
  const parsed = z.object({ currentPassword, confirmation: z.literal("DELETE") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter your current password and type DELETE." });
  const admin: Admin = res.locals.admin;
  if (!await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash)) return res.status(403).json({ error: "Current password is incorrect." });
  await db.transaction(async tx => {
    const [row] = await tx.select({ id: admins.adminId }).from(admins).where(and(eq(admins.adminId, admin.adminId), eq(admins.passwordHash, admin.passwordHash))).for("update");
    if (!row) throw Object.assign(new Error("Your account changed. Sign in and try again."), { status: 409 });
    await tx.delete(reports).where(eq(reports.adminId, admin.adminId));
    await tx.delete(admins).where(eq(admins.adminId, admin.adminId));
  });
  clearSession(res); res.status(204).end();
}));
