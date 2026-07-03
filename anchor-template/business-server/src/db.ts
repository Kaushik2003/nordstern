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

  console.log('[db] nordstern schema ready (kyc_verifications, kyc_webhook_events)');
}
