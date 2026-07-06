import pg from 'pg';
import { DATABASE_URL } from './config.js';

// ─── Durable store (Postgres) ──────────────────────────────────────────────────
// The business-server is otherwise stateless (transaction state lives in the
// Anchor Platform DB). KYC is the one thing WE must persist: whether an account
// verified, when, and until when — so returning users skip KYC and expired ones
// re-verify. We reuse the stack's existing `anchordb` Postgres under a dedicated
// `nordstern` schema so we never collide with the AP's Flyway-managed tables.

const { Pool } = pg;

export const pool = new Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

// Idempotent DDL (CREATE … IF NOT EXISTS) — matches the template's lightweight,
// no-migration-framework style. Run once at startup before the server listens.
export async function initSchema(): Promise<void> {
  await pool.query('CREATE SCHEMA IF NOT EXISTS nordstern');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.kyc_verifications (
      vendor_data       TEXT PRIMARY KEY,          -- SEP-10 account = our stable user id / DIDIT vendor id
      status            TEXT NOT NULL,             -- ACCEPTED | PROCESSING | NEEDS_INFO | REJECTED
      didit_session_id  TEXT,
      didit_session_url TEXT,                       -- reused so repeat clicks don't spam new sessions
      decision_summary  JSONB,                      -- redacted outcome only — never raw doc numbers/images
      verified_at       TIMESTAMPTZ,
      expires_at        TIMESTAMPTZ,                -- verified_at + KYC_REVERIFY_TTL_SECONDS
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Durable webhook idempotency — dedupe DIDIT deliveries on event_id.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.kyc_webhook_events (
      event_id    TEXT PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // SEP-24 lets the initial request omit `amount`; the Anchor Platform's PATCH
  // /transactions endpoint has no field for setting amount_expected after the
  // fact (it only accepts amountIn/amountOut), so when we collect the amount
  // from the user in our own interactive form, we hold it here ourselves.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.interactive_amounts (
      transaction_id TEXT PRIMARY KEY,
      amount         TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Razorpay deposit collection (DEPOSIT_PROVIDER=razorpay). One row per deposit
  // transaction: the Razorpay order we created, the INR amount LOCKED at order
  // creation (never recomputed, so the charge, the display, and amount_in agree),
  // and the collection→release lifecycle. `status` is the money-safety guard:
  //   created  → order made, awaiting payment
  //   paid     → payment captured + verified server-side (release may proceed)
  //   releasing→ a single caller (webview return OR webhook) has atomically claimed
  //              the release (UPDATE … WHERE status='paid') — blocks double-send
  //   released → USDC sent + Platform tx completed
  //   failed   → release errored after claim; needs reconciliation
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.razorpay_payments (
      transaction_id  TEXT PRIMARY KEY,
      order_id        TEXT UNIQUE,                 -- Razorpay order id (webhook looks us up by this)
      payment_id      TEXT,                        -- Razorpay payment id (set once captured)
      amount_usdc     TEXT NOT NULL,               -- USDC the user receives
      amount_inr      TEXT NOT NULL,               -- INR charged (locked at order creation)
      amount_paise    BIGINT NOT NULL,             -- amount_inr in paise (what Razorpay charged)
      inr_per_usdc    TEXT NOT NULL,               -- FX rate locked at order creation
      rate_source     TEXT,
      status          TEXT NOT NULL DEFAULT 'created',
      account         TEXT,                        -- SEP-10 account (KYC identity)
      destination     TEXT,                        -- Stellar address USDC is released to
      stellar_tx_hash TEXT,
      last_error      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Durable webhook idempotency — dedupe Razorpay deliveries on X-Razorpay-Event-Id.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.razorpay_webhook_events (
      event_id    TEXT PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Deposit release OUTBOX (Transfer-After-Commit). The authoritative local record
  // of the USDC money-move, written BEFORE we submit to Stellar so a crash between
  // "submit" and "record" is recoverable instead of a stuck/lost transfer. Holds
  // everything the reconciler needs to finish the Anchor Platform transaction on its
  // own. `memo` is the deterministic on-chain key that lets us ask the chain whether
  // the transfer actually landed. Lifecycle:
  //   submitting → row committed, about to / currently submitting to Horizon
  //   submitted  → Horizon accepted; stellar_tx_hash known; AP completion pending
  //   completed  → Platform tx patched to completed; terminal success
  //   failed     → errored after claim; the reconciler re-drives (safe: the memo
  //                scan makes a re-submit idempotent — it adopts a landed transfer)
  await pool.query(`
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
    )
  `);
  // Reconciler scans by non-terminal status; index keeps that cheap as rows accrue.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS deposit_releases_status_idx
      ON nordstern.deposit_releases (status) WHERE status <> 'completed'
  `);

  // Withdrawal payout guard (off-ramp mirror of deposit_releases). The AP's status
  // query filter is unreliable, so the poller must not rely on it to avoid re-paying.
  // This row is the durable AT-MOST-ONCE record: a withdrawal is claimed here before
  // any fiat payout, so a re-listed or crash-replayed withdrawal can never disburse
  // twice. Lifecycle: processing → completed (paid + AP reflects it) | failed (retry).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.withdrawal_payouts (
      transaction_id TEXT PRIMARY KEY,
      amount_usdc    TEXT NOT NULL,
      amount_inr     TEXT NOT NULL,
      status         TEXT NOT NULL,
      reference      TEXT,
      last_error     TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Phase E: Audit logs table for tamper-evident tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.audit_logs (
      seq           SERIAL PRIMARY KEY,
      action        TEXT NOT NULL,
      detail        TEXT NOT NULL,
      actor         TEXT NOT NULL,
      hash          TEXT NOT NULL,
      prev_hash     TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Phase E: API keys table for developer console
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.api_keys (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      secret        TEXT NOT NULL UNIQUE,
      scopes        TEXT[] NOT NULL,
      live          BOOLEAN NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Phase E: Webhook deliveries table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.webhook_deliveries (
      id            TEXT PRIMARY KEY,
      event         TEXT NOT NULL,
      status        INT NOT NULL,
      attempts      INT NOT NULL DEFAULT 1,
      ms            INT NOT NULL,
      payload       JSONB NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Phase E: Compliance cases table
  await pool.query(`
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
    )
  `);

  // Seeding
  const casesCount = await pool.query('SELECT COUNT(*) FROM nordstern.compliance_cases');
  if (parseInt(casesCount.rows[0].count) === 0) {
    const seedCases = [
      { id: 'CASE-4120', userId: 'usr1', userName: 'Aravind Nair', userInitials: 'AN', reason: 'Large single deposit > ₹2,00,000', severity: 'high', assignee: 'Ananya Rao', status: 'open', note: 'Awaiting source-of-funds documentation.', amount: '250000', relatedTx: 3 },
      { id: 'CASE-4119', userId: 'usr2', userName: 'Rohan Sharma', userInitials: 'RS', reason: 'Velocity spike — 5x the 7-day average', severity: 'high', assignee: 'Imran Sheikh', status: 'in_review', note: 'Escalated to MLRO for review.', amount: '180000', relatedTx: 5 },
      { id: 'CASE-4118', userId: 'usr3', userName: 'Sneha Patel', userInitials: 'SP', reason: 'Structuring pattern — repeated ₹49,000 deposits', severity: 'med', assignee: 'Unassigned', status: 'open', note: 'Awaiting ID validation.', amount: '147000', relatedTx: 3 },
      { id: 'CASE-4117', userId: 'usr4', userName: 'Vikram Singh', userInitials: 'VS', reason: 'Sanctions watchlist near-match', severity: 'high', assignee: 'Kavya Nair', status: 'cleared', note: 'Cleared after EDD; counterparty verified.', amount: '95000', relatedTx: 2 }
    ];
    for (const c of seedCases) {
      await pool.query(
        `INSERT INTO nordstern.compliance_cases (id, user_id, user_name, user_initials, reason, severity, assignee, status, note, amount, related_tx)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [c.id, c.userId, c.userName, c.userInitials, c.reason, c.severity, c.assignee, c.status, c.note, c.amount, c.relatedTx]
      );
    }
  }

  const auditCount = await pool.query('SELECT COUNT(*) FROM nordstern.audit_logs');
  if (parseInt(auditCount.rows[0].count) === 0) {
    const actions = [
      { actor: 'system', action: 'reserve.attested', detail: 'ratio 102.4% · hash-chained' },
      { actor: 'Dev Kapoor', action: 'apikey.rolled', detail: 'Production server key rotated' },
      { actor: 'system', action: 'kyc.approved', detail: 'T2 upgrade · match 0.97' },
      { actor: 'Priya Menon', action: 'pricing.updated', detail: 'off-ramp spread 1.50% → 1.40%' },
      { actor: 'Ananya Rao', action: 'str.filed', detail: 'FIU-STR-2026-004417' }
    ];
    let prevHash = '0000000000000000';
    const crypto = await import('crypto');
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const hashInput = prevHash + String(i) + a.action + a.detail;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
      await pool.query(
        `INSERT INTO nordstern.audit_logs (action, detail, actor, hash, prev_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [a.action, a.detail, a.actor, hash, prevHash]
      );
      prevHash = hash;
    }
  }

  const keysCount = await pool.query('SELECT COUNT(*) FROM nordstern.api_keys');
  if (parseInt(keysCount.rows[0].count) === 0) {
    const defaultKeys = [
      { id: 'key_1', name: 'Production Backend API Key', secret: 'ns_live_abc123xyz7890pqrstuvw', scopes: ['read', 'write'], live: true },
      { id: 'key_2', name: 'Test Ingress API Key', secret: 'ns_test_def456uvw1234lmnopoqr', scopes: ['read'], live: false }
    ];
    for (const k of defaultKeys) {
      await pool.query(
        `INSERT INTO nordstern.api_keys (id, name, secret, scopes, live)
         VALUES ($1, $2, $3, $4, $5)`,
        [k.id, k.name, k.secret, k.scopes, k.live]
      );
    }
  }

  // Phase E: Strategy config table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nordstern.strategy_config (
      id            SERIAL PRIMARY KEY,
      version       INT NOT NULL DEFAULT 1,
      config        JSONB NOT NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Seed default strategy config if empty
  const strategyCount = await pool.query('SELECT COUNT(*) FROM nordstern.strategy_config');
  if (parseInt(strategyCount.rows[0].count) === 0) {
    const defaultConfig = {
      minDeposit: 500,
      maxDeposit: 500000,
      maxSingleTx: 100000,
      dailyVolumeLimit: 1000000,
      fixedFee: 8.00,
      percentageFee: 0.05,
      feeTiers: [
        { limit: 10000, fee: 0.05 },
        { limit: 50000, fee: 0.03 },
        { limit: 200000, fee: 0.01 }
      ],
      supportedRails: ["UPI", "IMPS", "NEFT"],
      emergencyStop: false,
      maintenanceMode: false,
      autoPauseThreshold: 5000,
      riskScoreThreshold: 75,
      settlementBufferMin: 30
    };
    await pool.query(
      `INSERT INTO nordstern.strategy_config (version, config) VALUES (1, $1)`,
      [defaultConfig]
    );
  }

  console.log('[db] nordstern schema ready (kyc_verifications, kyc_webhook_events, interactive_amounts, razorpay_payments, razorpay_webhook_events, deposit_releases, withdrawal_payouts, audit_logs, api_keys, webhook_deliveries, compliance_cases, strategy_config)');
}
