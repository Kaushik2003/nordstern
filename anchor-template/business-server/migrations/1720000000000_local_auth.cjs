/* eslint-disable */
// Standalone Mode local auth migration.
// Creates tables for local operators, customers, customer_wallets, and otps inside the `nordstern` schema.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- ── operators ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.operators (
      email       TEXT PRIMARY KEY,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── customers ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.customers (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email              VARCHAR(255) NOT NULL UNIQUE,
      full_name          VARCHAR(255),
      kyc_status         VARCHAR(50) NOT NULL DEFAULT 'unverified',
      didit_session_id   VARCHAR(128),
      didit_verified_at  TIMESTAMPTZ,
      preferences        JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_login_at      TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── customer_wallets ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.customer_wallets (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES nordstern.customers(id) ON DELETE CASCADE,
      address     VARCHAR(64) NOT NULL,
      label       VARCHAR(100),
      network     VARCHAR(20) NOT NULL DEFAULT 'testnet',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (customer_id, address)
    );

    -- ── otps ──────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.otps (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       VARCHAR(255) NOT NULL,
      audience    VARCHAR(50) NOT NULL,
      code_hash   VARCHAR(64) NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      attempts    INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS otps_email_audience_idx ON nordstern.otps (email, audience);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS nordstern.otps_email_audience_idx;
    DROP TABLE IF EXISTS nordstern.otps;
    DROP TABLE IF EXISTS nordstern.customer_wallets;
    DROP TABLE IF EXISTS nordstern.customers;
    DROP TABLE IF EXISTS nordstern.operators;
  `);
};
