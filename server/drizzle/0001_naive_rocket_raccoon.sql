CREATE TABLE "sessions" (
	"session_id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"remember" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "username" varchar(24);--> statement-breakpoint
UPDATE "admins" SET "username" = 'member_' || "admin_id";--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "phone" varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "avatar" varchar(200000);--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "notifications" jsonb DEFAULT '{"securityAlerts":true,"trafficAlerts":true,"productUpdates":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("admin_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_username_unique" UNIQUE("username");
