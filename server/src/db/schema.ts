import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  jsonb,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  adminId: serial("admin_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  username: varchar("username", { length: 24 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 24 }).notNull().default(""),
  avatar: varchar("avatar", { length: 200000 }),
  notifications: jsonb("notifications").$type<{ securityAlerts: boolean; trafficAlerts: boolean; productUpdates: boolean }>().notNull().default({ securityAlerts: true, trafficAlerts: true, productUpdates: false }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  sessionId: varchar("session_id", { length: 64 }).primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.adminId, { onDelete: "cascade" }),
  remember: boolean("remember").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const clients = pgTable("clients", {
  clientId: serial("client_id").primaryKey(),
  adminId: integer("admin_id").references(() => admins.adminId, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  apiKey: varchar("api_key", { length: 256 }).notNull().unique(),
  apiKeyHash: varchar("api_key_hash", { length: 64 }).unique(),
  tier: varchar("tier", { length: 20 }).notNull(),
  rateLimit: integer("rate_limit").notNull(),
  windowSeconds: integer("window_seconds").notNull(),
  algorithm: varchar("algorithm", { length: 20 }).notNull().default("token_bucket"),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ ownerIndex: index("clients_owner_idx").on(table.adminId) }));

export const requestLogs = pgTable("request_logs", {
  logId: serial("log_id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.clientId, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 200 }).notNull(),
  status: varchar("status", { length: 10 }).notNull(),
  algorithmUsed: varchar("algorithm_used", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ historyIndex: index("request_logs_client_time_idx").on(table.clientId, table.createdAt) }));

export const jobs = pgTable("jobs", {
  jobId: serial("job_id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.clientId, { onDelete: "cascade" }),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  payload: jsonb("payload"),
  status: varchar("status", { length: 15 }).notNull().default("queued"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, table => ({ historyIndex: index("jobs_client_time_idx").on(table.clientId, table.createdAt), statusIndex: index("jobs_status_idx").on(table.status) }));

export const reports = pgTable("reports", {
  reportId: serial("report_id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.adminId, { onDelete: "cascade" }),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  dateFrom: date("date_from").notNull(),
  dateTo: date("date_to").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type RequestLog = typeof requestLogs.$inferSelect;
export type Job = typeof jobs.$inferSelect;
