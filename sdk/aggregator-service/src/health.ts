import { pool } from './db.js';

export async function checkAnchorHealth(anchorId: string, apiUrl: string) {
  const start = Date.now();
  try {
    // Prefer the rich /admin/summary (anchor-template); fall back to /health, which
    // EVERY anchor exposes (incl. the anchor-service/ANCH stack that the provisioner
    // launches). Basic reachability drives availability; treasury is best-effort.
    let res = await fetch(`${apiUrl}/admin/summary`, { signal: AbortSignal.timeout(5000), headers: { 'Cache-Control': 'no-store' } });
    let summary: any = res.ok ? await res.json().catch(() => ({})) : {};
    if (!res.ok) {
      res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000), headers: { 'Cache-Control': 'no-store' } });
      summary = res.ok ? await res.json().catch(() => ({})) : {};
    }

    const latency = Date.now() - start;

    if (res.ok) {
      const horizonUp = summary.health?.horizonConnectivity === 'up' || summary.status === 'ok';
      // Unknown treasury (e.g. the ANCH anchor's /health) → don't block liquidity routing.
      const usdcCapacity = summary.treasury?.usdc ? parseFloat(summary.treasury.usdc)
        : summary.treasuryUsdc ? parseFloat(summary.treasuryUsdc)
        : 1_000_000;
      
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
