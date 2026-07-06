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

    // Real handoff. SEP-24 is WALLET-driven: SEP-10 authentication is signed by the
    // user's Stellar key, which only the wallet holds — the aggregator cannot mint a
    // transaction_id or an interactive URL on the user's behalf. So we resolve the
    // selected anchor's REAL SEP discovery (its stellar.toml) and hand the wallet the
    // genuine endpoints to drive SEP-10 → SEP-24 against. No fabricated ids.
    const base = (anchor.api_url as string)?.replace(/\/$/, '') || `https://${anchor.domain}`;
    let transferServer = `${base}/sep24`;
    let webAuthEndpoint = `${base}/auth`;
    try {
      const toml = await fetch(`https://${anchor.domain}/.well-known/stellar.toml`).then((r) => (r.ok ? r.text() : ''));
      const ts = toml.match(/TRANSFER_SERVER_SEP0024\s*=\s*"([^"]+)"/)?.[1];
      const wa = toml.match(/WEB_AUTH_ENDPOINT\s*=\s*"([^"]+)"/)?.[1];
      if (ts) transferServer = ts;
      if (wa) webAuthEndpoint = wa;
    } catch { /* fall back to derived endpoints */ }

    res.json({
      success: true,
      anchorId: quote.anchor_id,
      anchorName: anchor.name,
      account,
      quoteId,
      handoff: {
        homeDomain: anchor.domain,
        webAuthEndpoint,       // SEP-10 — wallet signs the challenge here
        transferServer,        // SEP-24 — wallet POSTs /transactions/deposit/interactive here
        asset: quote.dest_asset,
        amount: quote.fiat_amount,
      },
      next: 'Wallet performs SEP-10 auth against webAuthEndpoint, then POST {transferServer}/transactions/deposit/interactive with the SEP-10 JWT to obtain the real interactive URL. The aggregator does not hold the user key and cannot initiate SEP-24 server-side.',
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 8. POST /anchors
// Registers or updates an anchor in the registry dynamically.
sdkRouter.post('/anchors', async (req, res) => {
  const { id, name, domain, api_url, status, regions, capabilities, limits, fee_config } = req.body;
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
    // Prefer the real reachable endpoint the provisioner reports; fall back to the
    // container-DNS template only if the caller didn't supply one.
    const apiUrl = api_url || `http://business-server-${id}:3000`;
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
