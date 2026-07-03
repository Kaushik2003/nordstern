import { Router } from 'express';
import { randomUUID } from 'crypto';
import { kyc, rate } from './adapters/index.js';

// ─── Platform callbacks (AP v4.4.0) ────────────────────────────────────────────
// The Anchor Platform delegates exactly two decisions to us in this version, at
// the callback_api base_url root:
//   GET/PUT/DELETE /customer  — SEP-12 KYC   (→ KycProvider seam)
//   GET /rate                 — SEP-38 quote (→ RateProvider seam, INR ↔ USDC)
// (There is NO /unique_address or /fee callback in AP v4.4.0.)

export const callbacksRouter = Router();

// ── SEP-12 customer (KYC) — delegated to the KycProvider ────────────────────────
callbacksRouter.get('/customer', async (req, res) => {
  const result = await kyc.getCustomer({
    id: req.query.id as string | undefined,
    account: req.query.account as string | undefined,
    memo: req.query.memo as string | undefined,
    type: req.query.type as string | undefined,
  });
  res.json(result);
});

callbacksRouter.put('/customer', async (req, res) => {
  const result = await kyc.putCustomer({ id: req.body?.id, account: req.body?.account, fields: req.body ?? {} });
  res.json(result);
});

callbacksRouter.delete('/customer/:account', async (req, res) => {
  await kyc.deleteCustomer(req.params.account);
  res.status(200).send();
});

// ── SEP-38 /rate — INR ↔ USDC quote from the RateProvider ───────────────────────
// Amounts are made internally consistent (sell = price × buy) at the assets'
// significant_decimals (2) so the AP's rate validation passes.
const isUsdc = (a?: string) => !!a && a.includes('USDC');
const isInr  = (a?: string) => !!a && a.startsWith('iso4217:INR');

callbacksRouter.get('/rate', async (req, res) => {
  const q = req.query as Record<string, string>;
  const sellAsset = q.sell_asset;
  const buyAsset = q.buy_asset;

  // FX price expressed as INR per 1 USDC (USDC ≈ USD).
  const { inrPerUsdc } = await rate.quote();
  const fx = Number(inrPerUsdc);

  // price is "sell units per 1 buy unit".
  let fxPrice: number;
  if (isInr(sellAsset) && isUsdc(buyAsset)) fxPrice = fx;         // sell INR, buy USDC
  else if (isUsdc(sellAsset) && isInr(buyAsset)) fxPrice = 1 / fx; // sell USDC, buy INR
  else { res.status(400).json({ error: `unsupported pair ${sellAsset} → ${buyAsset}` }); return; }

  const round2 = (n: number) => Number(n.toFixed(2));
  let sell: number;
  let buy: number;
  if (q.sell_amount != null) { sell = round2(Number(q.sell_amount)); buy = round2(sell / fxPrice); }
  else if (q.buy_amount != null) { buy = round2(Number(q.buy_amount)); sell = round2(buy * fxPrice); }
  else { res.status(400).json({ error: 'sell_amount or buy_amount required' }); return; }

  if (!(buy > 0) || !(sell > 0)) { res.status(400).json({ error: 'amount too small' }); return; }

  // Define price from the rounded amounts so sell == price × buy exactly.
  const price = (sell / buy).toFixed(7);
  const rateObj: Record<string, unknown> = {
    price,
    sell_amount: sell.toFixed(2),
    buy_amount: buy.toFixed(2),
    fee: { total: '0.00', asset: sellAsset },
  };
  if (q.type === 'firm') {
    rateObj.id = randomUUID();
    rateObj.expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  res.json({ rate: rateObj });
});
