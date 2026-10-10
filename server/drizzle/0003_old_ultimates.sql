ALTER TABLE "clients" ALTER COLUMN "api_key" SET DATA TYPE varchar(256);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "api_key_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_api_key_hash_unique" UNIQUE("api_key_hash");