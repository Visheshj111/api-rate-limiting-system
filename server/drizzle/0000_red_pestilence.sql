CREATE TABLE "admins" (
	"admin_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"client_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"tier" varchar(20) NOT NULL,
	"rate_limit" integer NOT NULL,
	"window_seconds" integer NOT NULL,
	"algorithm" varchar(20) DEFAULT 'token_bucket' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"job_id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"payload" jsonb,
	"status" varchar(15) DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"report_id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"endpoint" varchar(200) NOT NULL,
	"status" varchar(10) NOT NULL,
	"algorithm_used" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_admin_id_admins_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("admin_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;