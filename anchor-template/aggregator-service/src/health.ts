import { pool } from './db.js';

export async function checkAnchorHealth(anchorId: string, apiUrl: string) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    // Check against the /admin/summary endpoint we just enriched!
    const res = await fetch(`${apiUrl}/admin/summary`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-store' }
    });
    
    clearTimeout(timeout);
    const latency = Date.now() - start;
    
    if (res.ok) {
      const summary = await res.json().catch(() => ({}));
      const horizonUp = summary.health?.horizonConnectivity === 'up';
      const usdcCapacity = summary.treasury?.usdc ? parseFloat(summary.treasury.usdc) : 0;
      
      // Log healthy metrics
      await pool.query(
        `INSERT INTO aggregator.health_metrics (anchor_id, api_available, latency_ms, horizon_connected, failure_rate_30d)
         VALUES ($1, $2, $3, $4, $5)`,
        [anchorId, true, latency, horizonUp, 0.00]
      );
      
      // Update registry availability and treasury capacities from live values
      await pool.query(
        `UPDATE aggregator.anchors 
         SET current_availability = true, treasury_capacity = $1, updated_at = now()
         WHERE id = $2`,
        [usdcCapacity, anchorId]
      );
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    const latency = Date.now() - start;
    
    // Log failure metrics
    await pool.query(
      `INSERT INTO aggregator.health_metrics (anchor_id, api_available, latency_ms, horizon_connected, failure_rate_30d)
       VALUES ($1, $2, $3, $4, $5)`,
      [anchorId, false, Math.min(5000, latency), false, 15.00]
    );
    
    // Mark anchor unavailable in registry
    await pool.query(
      `UPDATE aggregator.anchors 
       SET current_availability = false, updated_at = now()
       WHERE id = $1`,
      [anchorId]
    );
  }
}

export async function pollAllAnchors() {
  try {
    const { rows } = await pool.query('SELECT id, api_url FROM aggregator.anchors WHERE status != \'suspended\'');
    for (const row of rows) {
      checkAnchorHealth(row.id, row.api_url).catch(e => {
        console.error(`[health-monitor] failed checking ${row.id}:`, e);
      });
    }
  } catch (err) {
    console.error('[health-monitor] failed to query anchors:', err);
  }
}
