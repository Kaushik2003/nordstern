import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://anchor:anchor@db:5432/anchordb',
});

// Helper for the cryptographic audit logger (runtime insert — not schema DDL).
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

// Schema is now managed by versioned migrations (R6 M4.3): see ../migrations and
// src/migrate.ts. Runtime initSchema() DDL was removed; the server runs
// `runMigrations()` on start. The idempotent baseline preserves full backwards
// compatibility with existing aggregator databases (routing policies, quotes,
// health metrics, audit logs, registry, and seeds all unchanged).
