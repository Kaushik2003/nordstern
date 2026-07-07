CREATE TYPE "public"."customer_kyc_status" AS ENUM('unverified', 'pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "customer_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"address" varchar(64) NOT NULL,
	"label" varchar(100),
	"network" "network" DEFAULT 'testnet' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"kyc_status" "customer_kyc_status" DEFAULT 'unverified' NOT NULL,
	"didit_session_id" varchar(128),
	"didit_verified_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_wallets" ADD CONSTRAINT "customer_wallets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_otps_email_idx" ON "customer_otps" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_wallets_uq" ON "customer_wallets" USING btree ("customer_id","address");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_uq" ON "customers" USING btree ("email");