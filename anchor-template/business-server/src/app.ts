import express from 'express';
import { callbacksRouter } from './callbacks.js';
import { sep24Router } from './sep24.js';
import { ASSET_CODE, TREASURY_PUBLIC } from './config.js';
import { getTreasuryUsdcBalance } from './stellar.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', async (_req, res) => {
    let treasuryUsdc: string | null = null;
    try { treasuryUsdc = await getTreasuryUsdcBalance(); } catch { /* horizon unreachable */ }
    res.json({ status: 'ok', service: 'business-server', asset: ASSET_CODE, treasury: TREASURY_PUBLIC, treasuryUsdc });
  });

  // AP v4.4.0 calls callbacks at the base_url root: /customer, /rate.
  app.use('/', callbacksRouter);
  app.use('/sep24', sep24Router);

  // SEP-6 more_info_url stub (config points here; SEP-6 is not an active flow).
  app.get('/sep6/transaction', (req, res) => {
    res.json({ id: req.query.transaction_id ?? null, note: 'sep6 more_info stub (Phase A)' });
  });

  return app;
}
