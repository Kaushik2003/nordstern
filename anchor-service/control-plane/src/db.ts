import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? 'controldb',
  user:     process.env.DB_USER     ?? 'anchor',
  password: process.env.DB_PASSWORD ?? 'anchor',
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name         VARCHAR(255) NOT NULL,
      slug         VARCHAR(100) UNIQUE NOT NULL,
      status       VARCHAR(50)  DEFAULT 'pending',
      network      VARCHAR(20)  DEFAULT 'testnet',
      fiat_balance DECIMAL(18,2) DEFAULT 100000.00,
      created_at   TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id     UUID REFERENCES tenants(id),
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(50)  DEFAULT 'fi-operator',
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tenant_keypairs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id  UUID REFERENCES tenants(id),
      role       VARCHAR(50)  NOT NULL,
      public_key VARCHAR(60)  NOT NULL,
      secret_key VARCHAR(60)  NOT NULL,
      created_at TIMESTAMPTZ  DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tenant_config (
      tenant_id            UUID PRIMARY KEY REFERENCES tenants(id),
      min_deposit          DECIMAL(18,2) DEFAULT 10,
      max_deposit          DECIMAL(18,2) DEFAULT 10000,
      min_withdrawal       DECIMAL(18,2) DEFAULT 10,
      max_withdrawal       DECIMAL(18,2) DEFAULT 5000,
      daily_limit          DECIMAL(18,2) DEFAULT 25000,
      deposit_fee_pct      DECIMAL(6,4)  DEFAULT 0.015,
      withdrawal_fee_pct   DECIMAL(6,4)  DEFAULT 0.010,
      fiat_method_name     VARCHAR(100)  DEFAULT 'Wire Transfer',
      fiat_bank_name       VARCHAR(255)  DEFAULT '',
      fiat_account_number  VARCHAR(100)  DEFAULT '',
      fiat_routing_number  VARCHAR(50)   DEFAULT '',
      settlement_days      INTEGER       DEFAULT 1,
      alert_mismatch_pct   DECIMAL(6,4)  DEFAULT 0.01,
      alert_large_tx       DECIMAL(18,2) DEFAULT 5000,
      webhook_url          VARCHAR(500)  DEFAULT '',
      updated_at           TIMESTAMPTZ   DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reconciliation_alerts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    UUID REFERENCES tenants(id),
      fiat_balance DECIMAL(18,2),
      onchain_balance DECIMAL(18,2),
      delta        DECIMAL(18,2),
      resolved     BOOLEAN DEFAULT false,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[db] tables ready');
}
