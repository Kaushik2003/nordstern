CREATE TYPE "public"."wallet_proof_type" AS ENUM('signed_challenge');--> statement-breakpoint
CREATE TABLE "customer_wallet_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"address" varchar(64) NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"network" "network" DEFAULT 'testnet' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "customer_wallets_uq";--> statement-breakpoint
ALTER TABLE "customer_wallets" ADD COLUMN "proven_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_wallets" ADD COLUMN "proof_type" "wallet_proof_type";--> statement-breakpoint
ALTER TABLE "customer_wallets" ADD COLUMN "proof_nonce" varchar(64);--> statement-breakpoint
ALTER TABLE "customer_wallets" ADD COLUMN "proof_signature" text;--> statement-breakpoint
ALTER TABLE "customer_wallet_challenges" ADD CONSTRAINT "customer_wallet_challenges_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_wallet_challenges_lookup_idx" ON "customer_wallet_challenges" USING btree ("customer_id","address");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_wallet_challenges_nonce_uq" ON "customer_wallet_challenges" USING btree ("nonce");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_wallets_address_uq" ON "customer_wallets" USING btree ("address");