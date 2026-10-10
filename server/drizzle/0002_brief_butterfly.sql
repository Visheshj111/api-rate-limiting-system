ALTER TABLE "jobs" DROP CONSTRAINT "jobs_client_id_clients_client_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_admin_id_admins_admin_id_fk";
--> statement-breakpoint
ALTER TABLE "request_logs" DROP CONSTRAINT "request_logs_client_id_clients_client_id_fk";
--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "completed_at" SET DATA TYPE timestamp with time zone USING "completed_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "generated_at" SET DATA TYPE timestamp with time zone USING "generated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "request_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "admin_id" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_admin_id_admins_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("admin_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_admin_id_admins_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("admin_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_owner_idx" ON "clients" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "jobs_client_time_idx" ON "jobs" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "request_logs_client_time_idx" ON "request_logs" USING btree ("client_id","created_at");