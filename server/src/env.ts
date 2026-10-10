import "dotenv/config";
import { z } from "zod";

const settings = z.object({
  DATABASE_URL: z.string().url().refine(v => /^postgres(ql)?:/.test(v)),
  REDIS_URL: z.string().url().refine(v => /^rediss?:/.test(v)),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  APP_PROXY_SECRET: z.string().default(""),
  API_KEY_SECRET: z.string().default(""),
  ALLOW_REGISTRATION: z.enum(["true", "false"]).default("true"),
}).safeParse(process.env);
if (!settings.success) throw new Error(`Invalid environment: ${settings.error.issues.map(i => i.path.join(".")).join(", ")}`);
if (process.env.NODE_ENV === "production" && [settings.data.JWT_SECRET, settings.data.APP_PROXY_SECRET, settings.data.API_KEY_SECRET].some(v => v.length < 32))
  throw new Error("Production JWT_SECRET, APP_PROXY_SECRET, and API_KEY_SECRET must each contain at least 32 characters.");

export const env = {
  databaseUrl: settings.data.DATABASE_URL,
  redisUrl: settings.data.REDIS_URL,
  jwtSecret: settings.data.JWT_SECRET,
  proxySecret: settings.data.APP_PROXY_SECRET,
  apiKeySecret: settings.data.API_KEY_SECRET || settings.data.JWT_SECRET,
  allowRegistration: settings.data.ALLOW_REGISTRATION === "true",
  trustProxy: settings.data.TRUST_PROXY,
  dbPoolSize: settings.data.DB_POOL_SIZE,
  port: settings.data.PORT,
  webOrigins: (process.env.WEB_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map(s => s.trim()),
  production: process.env.NODE_ENV === "production",
};
