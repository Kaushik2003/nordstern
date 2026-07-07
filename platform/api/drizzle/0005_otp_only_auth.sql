CREATE TYPE "public"."otp_audience" AS ENUM('customer', 'operator');--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"audience" "otp_audience" NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_otps" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "customer_otps" CASCADE;--> statement-breakpoint
DROP TABLE "email_verification_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "password_reset_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "otps_email_audience_idx" ON "otps" USING btree ("email","audience");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified_at";