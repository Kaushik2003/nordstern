import express from 'express';
import { callbacksRouter } from './callbacks.js';
import { sep24Router } from './sep24.js';
import { adminRouter } from './admin.js';
import { requireOperator } from './adminAuth.js';
import { customerApiRouter } from './customerApi.js';
import { webhooksRouter } from './webhooks.js';
import { walletRouter } from './walletApi.js';
import { ASSET_CODE, TREASURY_PUBLIC } from './config.js';
import { getTreasuryUsdcBalance } from './stellar.js';
import { requestLogger } from './logger.js';

export function createApp() {
  const app = express();
  // Structured request logging + correlation id (X-Request-Id) — first, so every
  // request (including auth rejections) is traced.
  app.use(requestLogger);
  // Stash the raw request bytes so webhook handlers can verify HMAC signatures
  // over the exact payload (DIDIT's X-Signature) without re-serialisation drift.
  app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', async (_req, res) => {
    let treasuryUsdc: string | null = null;
    try { treasuryUsdc = await getTreasuryUsdcBalance(); } catch { /* horizon unreachable */ }
    res.json({ status: 'ok', service: 'business-server', asset: ASSET_CODE, treasury: TREASURY_PUBLIC, treasuryUsdc });
  });

  // AP v4.4.0 calls callbacks at the base_url root: /customer, /rate.
  app.use('/', callbacksRouter);
  app.use('/sep24', sep24Router);
  app.use('/', walletRouter);

  // Operator dashboard + money-admin API. Gated by requireOperator: every /admin call
  // must carry a valid platform operator session (`ns_access`), so financial operations
  // (treasury sweep/pause, refund, retry, key management) can't be invoked anonymously —
  // including directly against the public Traefik `api.<slug>` host.
  app.use('/admin', requireOperator, adminRouter);

  // Customer-facing API (ns_customer session): this customer's history + KYC start.
  app.use('/', customerApiRouter);

  // Webhooks
  app.use('/', webhooksRouter);

  // SEP-6 more_info_url stub (config points here; SEP-6 is not an active flow).
  app.get('/sep6/transaction', (req, res) => {
    res.json({ id: req.query.transaction_id ?? null, note: 'sep6 more_info stub (Phase A)' });
  });

  return app;
}
