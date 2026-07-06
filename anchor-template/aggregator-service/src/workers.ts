import { pollAllAnchors } from './health.js';
import { pool } from './db.js';
import { HEALTH_CHECK_INTERVAL_MS } from './config.js';

let healthTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startBackgroundWorkers() {
  console.log('[workers] starting aggregator daemon workers...');

  // 1. Health polling loop
  healthTimer = setInterval(() => {
    pollAllAnchors();
  }, HEALTH_CHECK_INTERVAL_MS);

  // Trigger once at startup
  pollAllAnchors();

  // 2. Quote cleanup loop (runs every 5 minutes to clean quotes expired > 1 hour ago)
  cleanupTimer = setInterval(async () => {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM aggregator.quotes WHERE expires_at < now() - interval '1 hour'`
      );
      if (rowCount && rowCount > 0) {
        console.log(`[workers] cleaned up ${rowCount} expired stale quotes.`);
      }
    } catch (err) {
      console.error('[workers] failed quote cleanup:', err);
    }
  }, 300000);
}

export function stopBackgroundWorkers() {
  if (healthTimer) clearInterval(healthTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  console.log('[workers] background workers stopped.');
}
