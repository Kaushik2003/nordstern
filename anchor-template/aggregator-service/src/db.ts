import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://anchor:anchor@db:5432/anchordb',
});

// Helper for cryptographic audit logger
export async function writeAuditLog(eventType: string, description: string, actor: string = 'system') {
  try {
    await pool.query(
      `INSERT INTO aggregator.audit_logs (event_type, description, actor) VALUES ($1, $2, $3)`,
      [eventType, description, actor]
    );
  } catch (err) {
    console.error('[aggregator-db] failed to write audit log:', err);
  }
}

export async function initSchema() {
  console.log('[aggregator-db] initializing aggregator schema...');
  
  await pool.query(`CREATE SCHEMA IF NOT EXISTS aggregator`);

  // 1. Anchors
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aggregator.anchors (
      id                    VARCHAR(50) PRIMARY KEY,
      name                  VARCHAR(100) NOT NULL,
      domain                VARCHAR(100) NOT NULL,
      api_url               VARCHAR(255) NOT NULL,
      status                VARCHAR(20) NOT NULL DEFAULT 'active', -- active, onboarding, suspended
      regions               VARCHAR(50)[] NOT NULL DEFAULT '{}',
      capabilities          JSONB NOT NULL DEFAULT '{}',
      fee_config            JSONB NOT NULL DEFAULT '{}',
      limits                JSONB NOT NULL DEFAULT '{}',
      treasury_capacity     NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
      current_availability  BOOLEAN NOT NULL DEFAULT true,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 2. Routing Policies
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aggregator.routing_policies (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      weights     JSONB NOT NULL, -- e.g. { fee: 0.4, speed: 0.2, uptime: 0.2, liquidity: 0.2 }
      active      BOOLEAN NOT NULL DEFAULT false,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 3. Quotes
  await pool.query(`
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
    )
  `);

  // 4. Health Metrics
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aggregator.health_metrics (
      id                SERIAL PRIMARY KEY,
      anchor_id         VARCHAR(50) NOT NULL REFERENCES aggregator.anchors(id),
      api_available     BOOLEAN NOT NULL,
      latency_ms        INTEGER NOT NULL,
      horizon_connected BOOLEAN NOT NULL,
      failure_rate_30d  NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      checked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 5. Routing Decisions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aggregator.routing_decisions (
      id                  SERIAL PRIMARY KEY,
      quote_id            UUID NOT NULL REFERENCES aggregator.quotes(id),
      preferred_anchor_id VARCHAR(50) NOT NULL REFERENCES aggregator.anchors(id),
      scores              JSONB NOT NULL,
      reason              TEXT NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 6. Audit Logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aggregator.audit_logs (
      id          SERIAL PRIMARY KEY,
      event_type  VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      actor       VARCHAR(50) NOT NULL DEFAULT 'system',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Seed default Anchors
  const anchorCount = await pool.query('SELECT COUNT(*) FROM aggregator.anchors');
  if (parseInt(anchorCount.rows[0].count) === 0) {
    const anchors = [
      {
        id: 'globex',
        name: 'Globex Anchor India',
        domain: 'globex.nordstern.live',
        api_url: 'http://business-server:3000', // Our local instance
        status: 'active',
        regions: ['IN-MH', 'IN-KA', 'IN-DL'],
        capabilities: {
          supportedAssets: ['USDC'],
          supportedRails: ['UPI', 'IMPS'],
          supportedBanks: ['HDFC', 'ICICI'],
          maxTxSize: 500000,
          kycRequired: true,
          settlementModel: 'instant',
          apiVersion: 'v4.4.0'
        },
        fee_config: { fixed: 8.0, percent: 0.005 },
        limits: { min: 100, max: 500000 },
        treasury_capacity: 1000000.0,
        current_availability: true
      },
      {
        id: 'acme',
        name: 'Acme Payouts Ltd',
        domain: 'acmepay.nordstern.live',
        api_url: 'http://acme-business-server:3000', // Mock/future sibling
        status: 'active',
        regions: ['IN-TN', 'IN-AP', 'IN-KA'],
        capabilities: {
          supportedAssets: ['USDC', 'EURT'],
          supportedRails: ['UPI', 'NEFT', 'IMPS'],
          supportedBanks: ['SBI', 'AXIS'],
          maxTxSize: 1000000,
          kycRequired: true,
          settlementModel: 'standard',
          apiVersion: 'v4.4.0'
        },
        fee_config: { fixed: 5.0, percent: 0.003 },
        limits: { min: 50, max: 1000000 },
        treasury_capacity: 50000.0, // Low capacity to test routing
        current_availability: true
      }
    ];

    for (const a of anchors) {
      await pool.query(
        `INSERT INTO aggregator.anchors (id, name, domain, api_url, status, regions, capabilities, fee_config, limits, treasury_capacity, current_availability)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [a.id, a.name, a.domain, a.api_url, a.status, a.regions, a.capabilities, a.fee_config, a.limits, a.treasury_capacity, a.current_availability]
      );
    }
    console.log('[aggregator-db] seeded initial anchors.');
  }

  // Seed default Routing Policy
  const policyCount = await pool.query('SELECT COUNT(*) FROM aggregator.routing_policies');
  if (parseInt(policyCount.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO aggregator.routing_policies (name, weights, active)
       VALUES ($1, $2, $3)`,
      ['Balanced Optimization', { fee: 0.4, speed: 0.2, uptime: 0.2, liquidity: 0.2 }, true]
    );
    console.log('[aggregator-db] seeded balanced routing policy.');
  }

  console.log('[aggregator-db] aggregator schemas verified successfully.');
}
