/* eslint-disable */
// R6 M4.3 — Aggregator Service baseline migration.
//
// Reproduces the exact live `aggregator` schema that initSchema() produced, kept
// FULLY IDEMPOTENT (CREATE … IF NOT EXISTS + "seed only if empty" guards) so:
//   • an EXISTING aggregator database adopts this baseline as a HARMLESS NO-OP —
//     every table/seed already exists, nothing changes — then records it applied; and
//   • a FRESH database is created entirely from this migration.
// Additive only. No schema redesign. Routing policies, quote storage, health metrics,
// audit logs, registry, and both seed sets (demo anchors + balanced policy) are
// preserved verbatim.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS aggregator;

    -- 1. Anchors (registry)
    CREATE TABLE IF NOT EXISTS aggregator.anchors (
      id                    VARCHAR(50) PRIMARY KEY,
      name                  VARCHAR(100) NOT NULL,
      domain                VARCHAR(100) NOT NULL,
      api_url               VARCHAR(255) NOT NULL,
      status                VARCHAR(20) NOT NULL DEFAULT 'active',
      regions               VARCHAR(50)[] NOT NULL DEFAULT '{}',
      capabilities          JSONB NOT NULL DEFAULT '{}',
      fee_config            JSONB NOT NULL DEFAULT '{}',
      limits                JSONB NOT NULL DEFAULT '{}',
      treasury_capacity     NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
      current_availability  BOOLEAN NOT NULL DEFAULT true,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 2. Routing Policies
    CREATE TABLE IF NOT EXISTS aggregator.routing_policies (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      weights     JSONB NOT NULL,
      active      BOOLEAN NOT NULL DEFAULT false,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 3. Quotes
    CREATE TABLE IF NOT EXISTS aggregator.quotes (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fiat_amount         NUMERIC(18, 4) NOT NULL,
      fiat_currency       VARCHAR(10) NOT NULL,
      dest_asset          VARCHAR(50) NOT NULL,
      payment_rail        VARCHAR(50) NOT NULL,
      fx_rate             NUMERIC(18, 6) NOT NULL,
      estimated_fees      NUMERIC(18, 4) NOT NULL,
      settlement_est_mins INTEGER NOT NULL,
      anchor_id           VARCHAR(50) NOT NULL REFERENCES aggregator.anchors(id),
      expires_at          TIMESTAMPTZ NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 4. Health Metrics
    CREATE TABLE IF NOT EXISTS aggregator.health_metrics (
      id                SERIAL PRIMARY KEY,
      anchor_id         VARCHAR(50) NOT NULL REFERENCES aggregator.anchors(id),
      api_available     BOOLEAN NOT NULL,
      latency_ms        INTEGER NOT NULL,
      horizon_connected BOOLEAN NOT NULL,
      failure_rate_30d  NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      checked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 5. Routing Decisions
    CREATE TABLE IF NOT EXISTS aggregator.routing_decisions (
      id                  SERIAL PRIMARY KEY,
      quote_id            UUID NOT NULL REFERENCES aggregator.quotes(id),
      preferred_anchor_id VARCHAR(50) NOT NULL REFERENCES aggregator.anchors(id),
      scores              JSONB NOT NULL,
      reason              TEXT NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 6. Audit Logs
    CREATE TABLE IF NOT EXISTS aggregator.audit_logs (
      id          SERIAL PRIMARY KEY,
      event_type  VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      actor       VARCHAR(50) NOT NULL DEFAULT 'system',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Seeds (reproduce initSchema() exactly; "only if empty" so existing DBs are
    --    untouched and fresh DBs get identical demo anchors + balanced policy) ──────
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM aggregator.anchors) THEN
        INSERT INTO aggregator.anchors (id,name,domain,api_url,status,regions,capabilities,fee_config,limits,treasury_capacity,current_availability)
        VALUES ('globex','Globex Anchor India','globex.nordstern.live','http://business-server:3000','active',
          '{IN-MH,IN-KA,IN-DL}',
          '{"supportedAssets":["USDC"],"supportedRails":["UPI","IMPS"],"supportedBanks":["HDFC","ICICI"],"maxTxSize":500000,"kycRequired":true,"settlementModel":"instant","apiVersion":"v4.4.0"}',
          '{"fixed":8,"percent":0.005}',
          '{"min":100,"max":500000}',
          1000000.0, true);
        INSERT INTO aggregator.anchors (id,name,domain,api_url,status,regions,capabilities,fee_config,limits,treasury_capacity,current_availability)
        VALUES ('acme','Acme Payouts Ltd','acmepay.nordstern.live','http://acme-business-server:3000','active',
          '{IN-TN,IN-AP,IN-KA}',
          '{"supportedAssets":["USDC","EURT"],"supportedRails":["UPI","NEFT","IMPS"],"supportedBanks":["SBI","AXIS"],"maxTxSize":1000000,"kycRequired":true,"settlementModel":"standard","apiVersion":"v4.4.0"}',
          '{"fixed":5,"percent":0.003}',
          '{"min":50,"max":1000000}',
          50000.0, true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM aggregator.routing_policies) THEN
        INSERT INTO aggregator.routing_policies (name, weights, active)
        VALUES ('Balanced Optimization', '{"fee":0.4,"speed":0.2,"uptime":0.2,"liquidity":0.2}', true);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP SCHEMA IF EXISTS aggregator CASCADE;`);
};
