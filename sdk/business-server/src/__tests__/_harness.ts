import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Pool } from 'pg';

// Shared money-flow test harness (R6 M3): a REAL Postgres in a throwaway container,
// so the actual claim/idempotency SQL (ON CONFLICT, unique constraints, concurrency)
// is exercised — no in-memory fakes for the part that guards the money.
//
// DATABASE_URL must be set BEFORE db.js is imported (config.ts reads it at module
// load), so callers set env here and then dynamically import the modules under test.
export interface TestDb {
  container: StartedPostgreSqlContainer;
  pool: Pool;
  stop: () => Promise<void>;
}

export async function startTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:15').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // Minimal env the business-server config expects at import time.
  process.env.ASSET_CODE = 'USDC';
  process.env.ASSET_ISSUER_PUBLIC = 'GISSUERTESTONLY';

  const db = await import('../db.js');
  // Set up the schema the same way production does now — via migrations (R6 M4.2).
  const { runMigrations } = await import('../migrate.js');
  await runMigrations();
  return {
    container,
    pool: db.pool as unknown as Pool,
    stop: async () => {
      await db.pool.end().catch(() => {});
      await container.stop();
    },
  };
}
