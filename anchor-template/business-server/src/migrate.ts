import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { DATABASE_URL } from './config.js';

// R6 M4.2 — versioned migrations replace runtime initSchema() table creation for the
// business-server money DB. Applies pending migrations in ./migrations. Runs on boot
// (migrate-on-start) and via the `db:migrate` script for CI/ops.
//
// The business-server shares the per-anchor database with the Anchor Platform, which
// manages the `public` schema with Flyway and REFUSES to start if it finds a non-empty
// `public` without a Flyway history table. All our money tables already live in the
// dedicated `nordstern` schema; we keep node-pg-migrate's own bookkeeping table there
// too (createMigrationsSchema auto-creates it) so `public` stays entirely the AP's —
// letting the two schema managers coexist in one DB regardless of boot order.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  await runner({
    databaseUrl: DATABASE_URL,
    dir: path.resolve(__dirname, '../migrations'),
    direction,
    count: direction === 'up' ? Infinity : 1,
    migrationsSchema: 'nordstern',
    createMigrationsSchema: true,
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
