import { Router } from 'express';
import { pool } from './db.js';
import { createQuote, getQuote } from './quote.js';
import { calculateBestRoute } from './routing.js';

export const sdkRouter = Router();

// 1. GET /anchors
sdkRouter.get('/anchors', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, domain, status, regions, capabilities, limits, current_availability FROM aggregator.anchors'
    );
    res.json({ anchors: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. POST /quote
sdkRouter.post('/quote', async (req, res) => {
  const { amount, currency, asset, rail, region } = req.body;
  if (!amount || !currency || !asset || !rail) {
    res.status(400).json({ error: 'Missing required parameters: amount, currency, asset, rail' });
    return;
  }
  try {
    const quote = await createQuote(
      Number(amount),
      String(currency),
      String(asset),
      String(rail),
      region ? String(region) : undefined
    );
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. GET /quote/:id
sdkRouter.get('/quote/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const quote = await getQuote(id);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 4. POST /route
sdkRouter.post('/route', async (req, res) => {
  const { amount, currency, asset, rail, region } = req.body;
  if (!amount || !currency || !asset || !rail) {
    res.status(400).json({ error: 'Missing required parameters: amount, currency, asset, rail' });
    return;
  }
  try {
    const route = await calculateBestRoute(
      Number(amount),
      String(currency),
      String(asset),
      String(rail),
      region ? String(region) : undefined
    );
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. GET /health
sdkRouter.get('/health', async (_req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    const anchorsRes = await pool.query(
      'SELECT COUNT(*), SUM(CASE WHEN current_availability = true THEN 1 ELSE 0 END) as healthy FROM aggregator.anchors'
    );
    const count = parseInt(anchorsRes.rows[0].count);
    const healthy = parseInt(anchorsRes.rows[0].healthy ?? 0);
    
    res.json({
      status: 'up',
      database: dbCheck.rows.length === 1 ? 'connected' : 'disconnected',
      anchors: {
        total: count,
        healthy,
        unhealthy: count - healthy
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'down', error: (err as Error).message });
  }
});

// 6. GET /capabilities
sdkRouter.get('/capabilities', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT capabilities FROM aggregator.anchors WHERE status = 'active'`
    );
    
    // Consolidate capabilities across all active anchors
    const supportedAssets = new Set<string>();
    const supportedRails = new Set<string>();
    const supportedBanks = new Set<string>();
    
    for (const r of rows) {
      const caps = r.capabilities;
      if (caps.supportedAssets) caps.supportedAssets.forEach((a: string) => supportedAssets.add(a));
      if (caps.supportedRails) caps.supportedRails.forEach((r: string) => supportedRails.add(r));
      if (caps.supportedBanks) caps.supportedBanks.forEach((b: string) => supportedBanks.add(b));
    }
    
    res.json({
      supportedAssets: Array.from(supportedAssets),
      supportedRails: Array.from(supportedRails),
      supportedBanks: Array.from(supportedBanks)
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 7. POST /transactions/start
// Initiates the transaction. Returns the interactive webview URL for the client.
sdkRouter.post('/transactions/start', async (req, res) => {
  const { quoteId, account } = req.body;
  if (!quoteId || !account) {
    res.status(400).json({ error: 'Missing required parameters: quoteId, account' });
    return;
  }
  try {
    const quote = await getQuote(quoteId);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found or expired' });
      return;
    }
    
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      res.status(410).json({ error: 'Quote has expired. Please request a new quote.' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT name, api_url FROM aggregator.anchors WHERE id = $1',
      [quote.anchor_id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Selected anchor is no longer active' });
      return;
    }

    const anchor = rows[0];
    
    // We generate the interactive redirect URL. 
    // In production, the aggregator coordinates the transaction creation with the Anchor's SEP-24 endpoints.
    // For local dev, we build a mock interactive redirect straight to the selected anchor's webview.
    // We simulate a generated transaction ID and construct the handoff target.
    const mockTxId = `agg-tx-${Math.random().toString(36).substring(2, 10)}`;
    const interactiveUrl = `${anchor.api_url}/sep24/interactive?transaction_id=${mockTxId}&amount=${quote.fiat_amount}`;

    res.json({
      success: true,
      anchorId: quote.anchor_id,
      anchorName: anchor.name,
      transactionId: mockTxId,
      interactiveUrl
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. POST /anchors
// Registers or updates an anchor in the registry dynamically.
sdkRouter.post('/anchors', async (req, res) => {
  const { id, name, domain, status, regions, capabilities, limits, fee_config } = req.body;
  if (!id || !name || !domain) {
    res.status(400).json({ error: 'Missing required parameters: id, name, domain' });
    return;
  }
  try {
    const query = `
      INSERT INTO aggregator.anchors (id, name, domain, api_url, status, regions, capabilities, limits, fee_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        api_url = EXCLUDED.api_url,
        status = EXCLUDED.status,
        regions = EXCLUDED.regions,
        capabilities = EXCLUDED.capabilities,
        limits = EXCLUDED.limits,
        fee_config = EXCLUDED.fee_config,
        updated_at = now()
      RETURNING *
    `;
    const apiUrl = `http://business-server-${id}:3000`; // internal docker/k8s dns template
    const { rows } = await pool.query(query, [
      id,
      name,
      domain,
      apiUrl,
      status || 'active',
      regions || ['India'],
      capabilities || {},
      limits || {},
      fee_config || {}
    ]);
    res.json({ success: true, anchor: rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
