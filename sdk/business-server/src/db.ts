import pg from 'pg';
import { DATABASE_URL } from './config.js';

// ─── Durable store (Postgres) ──────────────────────────────────────────────────
// The business-server persists KYC state and the money-move outbox/guard tables in a
// dedicated `nordstern` schema inside the stack's `anchordb` Postgres (never colliding
// with the AP's Flyway-managed tables).
//
// Schema is now managed by versioned migrations (R6 M4.2): see ../migrations and
// src/migrate.ts. Runtime initSchema() DDL was removed; the server runs
// `runMigrations()` on start. The idempotent baseline preserves full backwards
// compatibility with existing anchor databases (no financial data is touched).

const { Pool } = pg;

export const pool = new Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => console.error('[db] idle client error:', err.message));
