import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { DATABASE_URL } from './config.js';

// R6 M4.3 — versioned migrations replace runtime initSchema() DDL for the aggregator.
// Applies pending migrations in ./migrations. Runs on boot (migrate-on-start) and via
// the `db:migrate` script for CI/ops.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  await runner({
    databaseUrl: DATABASE_URL,
    dir: path.resolve(__dirname, '../migrations'),
    direction,
    count: direction === 'up' ? Infinity : 1,
    migrationsTable: 'pgmigrations',
    log: (msg: string) => console.log('[migrate]', msg),
  });
}

// Allow `tsx src/migrate.ts [up|down]` as a CLI (used by npm run db:migrate).
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = (process.argv[2] as 'up' | 'down') ?? 'up';
  runMigrations(dir)
    .then(() => { console.log('[migrate] done'); process.exit(0); })
    .catch((err) => { console.error('[migrate] failed:', err); process.exit(1); });
}
