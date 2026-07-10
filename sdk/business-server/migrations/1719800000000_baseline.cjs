/* eslint-disable */
// R6 M4.2 — Business Server (money DB) baseline migration.
//
// Captures the exact live `nordstern` schema that initSchema() produced, kept FULLY
// IDEMPOTENT (CREATE … IF NOT EXISTS + seed guards), so:
//   • an EXISTING anchor database adopts this baseline as a HARMLESS NO-OP — every
//     table/index/seed already exists, so nothing changes and no financial data is
//     touched — and is then recorded as applied; and
//   • a FRESH anchor database is created entirely from this migration.
// Additive only. No destructive changes, no data rewrites. The financial tables
// (deposit_releases, withdrawal_payouts, razorpay_payments) are reproduced verbatim.
// Future changes are normal additive migrations.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS nordstern;

    -- ── KYC ─────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.kyc_verifications (
      vendor_data       TEXT PRIMARY KEY,
      status            TEXT NOT NULL,
      didit_session_id  TEXT,
      didit_session_url TEXT,
      decision_summary  JSONB,
      verified_at       TIMESTAMPTZ,
      expires_at        TIMESTAMPTZ,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.kyc_webhook_events (
      event_id    TEXT PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── SEP-24 interactive amount hold ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.interactive_amounts (
      transaction_id TEXT PRIMARY KEY,
      amount         TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Razorpay deposit collection (money) ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.razorpay_payments (
      transaction_id  TEXT PRIMARY KEY,
      order_id        TEXT UNIQUE,
      payment_id      TEXT,
      amount_usdc     TEXT NOT NULL,
      amount_inr      TEXT NOT NULL,
      amount_paise    BIGINT NOT NULL,
      inr_per_usdc    TEXT NOT NULL,
      rate_source     TEXT,
      status          TEXT NOT NULL DEFAULT 'created',
      account         TEXT,
      destination     TEXT,
      stellar_tx_hash TEXT,
      last_error      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.razorpay_webhook_events (
      event_id    TEXT PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Deposit release OUTBOX (money — at-most-once send) ──────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.deposit_releases (
      transaction_id  TEXT PRIMARY KEY,
      destination     TEXT NOT NULL,
      amount_usdc     TEXT NOT NULL,
      amount_inr      TEXT NOT NULL,
      inr_per_usdc    TEXT NOT NULL,
      rate_source     TEXT,
      memo            TEXT NOT NULL,
      status          TEXT NOT NULL,
      stellar_tx_hash TEXT,
      attempts        INT  NOT NULL DEFAULT 0,
      last_error      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS deposit_releases_status_idx
      ON nordstern.deposit_releases (status) WHERE status <> 'completed';

    -- ── Withdrawal payout guard (money — at-most-once payout) ───────────────────
    CREATE TABLE IF NOT EXISTS nordstern.withdrawal_payouts (
      transaction_id TEXT PRIMARY KEY,
      amount_usdc    TEXT NOT NULL,
      amount_inr     TEXT NOT NULL,
      status         TEXT NOT NULL,
      reference      TEXT,
      last_error     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Audit (hash-chained) ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS nordstern.audit_logs (
      seq           SERIAL PRIMARY KEY,
      action        TEXT NOT NULL,
      detail        TEXT NOT NULL,
      actor         TEXT NOT NULL,
      hash          TEXT NOT NULL,
      prev_hash     TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.api_keys (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      secret        TEXT NOT NULL UNIQUE,
      scopes        TEXT[] NOT NULL,
      live          BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.webhook_deliveries (
      id            TEXT PRIMARY KEY,
      event         TEXT NOT NULL,
      status        INT NOT NULL,
      attempts      INT NOT NULL DEFAULT 1,
      ms            INT NOT NULL,
      payload       JSONB NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.compliance_cases (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      user_name     TEXT NOT NULL,
      user_initials TEXT NOT NULL,
      reason        TEXT NOT NULL,
      severity      TEXT NOT NULL,
      assignee      TEXT NOT NULL,
      status        TEXT NOT NULL,
      note          TEXT,
      amount        TEXT NOT NULL DEFAULT '0',
      related_tx    INT NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS nordstern.strategy_config (
      id            SERIAL PRIMARY KEY,
      version       INT NOT NULL DEFAULT 1,
      config        JSONB NOT NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Seeds (reproduce initSchema() exactly; "only if empty" so existing anchors
    --    are untouched and fresh anchors get identical demo/default data) ─────────
    INSERT INTO nordstern.compliance_cases (id,user_id,user_name,user_initials,reason,severity,assignee,status,note,amount,related_tx)
    SELECT * FROM (VALUES
      ('CASE-4120','usr1','Aravind Nair','AN','Large single deposit > ₹2,00,000','high','Ananya Rao','open','Awaiting source-of-funds documentation.','250000',3),
      ('CASE-4119','usr2','Rohan Sharma','RS','Velocity spike — 5x the 7-day average','high','Imran Sheikh','in_review','Escalated to MLRO for review.','180000',5),
      ('CASE-4118','usr3','Sneha Patel','SP','Structuring pattern — repeated ₹49,000 deposits','med','Unassigned','open','Awaiting ID validation.','147000',3),
      ('CASE-4117','usr4','Vikram Singh','VS','Sanctions watchlist near-match','high','Kavya Nair','cleared','Cleared after EDD; counterparty verified.','95000',2)
    ) AS v(id,user_id,user_name,user_initials,reason,severity,assignee,status,note,amount,related_tx)
    WHERE NOT EXISTS (SELECT 1 FROM nordstern.compliance_cases);

    INSERT INTO nordstern.audit_logs (action,detail,actor,hash,prev_hash)
    SELECT * FROM (VALUES
      ('reserve.attested','ratio 102.4% · hash-chained','system','57d4e31ceaff946a','0000000000000000'),
      ('apikey.rolled','Production server key rotated','Dev Kapoor','400e10eb55576017','57d4e31ceaff946a'),
      ('kyc.approved','T2 upgrade · match 0.97','system','0d62a22c71675bbd','400e10eb55576017'),
      ('pricing.updated','off-ramp spread 1.50% → 1.40%','Priya Menon','d824f07e2b4ad0e2','0d62a22c71675bbd'),
      ('str.filed','FIU-STR-2026-004417','Ananya Rao','937210c0c364035c','d824f07e2b4ad0e2')
    ) AS v(action,detail,actor,hash,prev_hash)
    WHERE NOT EXISTS (SELECT 1 FROM nordstern.audit_logs);

    INSERT INTO nordstern.api_keys (id,name,secret,scopes,live)
    SELECT * FROM (VALUES
      ('key_1','Production Backend API Key','ns_live_abc123xyz7890pqrstuvw', ARRAY['read','write'], true),
      ('key_2','Test Ingress API Key','ns_test_def456uvw1234lmnopoqr', ARRAY['read'], false)
    ) AS v(id,name,secret,scopes,live)
    WHERE NOT EXISTS (SELECT 1 FROM nordstern.api_keys);

    INSERT INTO nordstern.strategy_config (version, config)
    SELECT 1, '{"minDeposit":500,"maxDeposit":500000,"maxSingleTx":100000,"dailyVolumeLimit":1000000,"fixedFee":8,"percentageFee":0.05,"feeTiers":[{"limit":10000,"fee":0.05},{"limit":50000,"fee":0.03},{"limit":200000,"fee":0.01}],"supportedRails":["UPI","IMPS","NEFT"],"emergencyStop":false,"maintenanceMode":false,"autoPauseThreshold":5000,"riskScoreThreshold":75,"settlementBufferMin":30}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM nordstern.strategy_config);
  `);
};

exports.down = (pgm) => {
  // Baseline down drops the whole nordstern schema. Destructive by nature — only used
  // to tear down a fresh test DB, never a live anchor.
  pgm.sql(`DROP SCHEMA IF EXISTS nordstern CASCADE;`);
};
