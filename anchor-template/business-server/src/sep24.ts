import { Router } from 'express';
import { ASSET_CODE, IS_MAINNET } from './config.js';
import { fetchTransaction } from './platform.js';
import { generateMemo } from './stellar.js';

// ─── SEP-24 interactive (Phase A skeleton) ─────────────────────────────────────
// The Anchor Platform opens this URL in the wallet's webview. Phase A proves the
// full handshake (SEP-10 → SEP-24 → interactive → reads the tx from the Platform
// API) and renders a placeholder. The real deposit form + USDC transfer (Phase B)
// and withdrawal instructions + Observer detection (Phase C) replace the body.

export const sep24Router = Router();

sep24Router.get('/interactive', async (req, res) => {
  const { transaction_id } = req.query as Record<string, string>;
  if (!transaction_id) { res.status(400).send('<h3>Missing transaction_id</h3>'); return; }

  let tx: Record<string, any>;
  try {
    tx = await fetchTransaction(transaction_id);
  } catch (err) {
    res.status(500).send(`<h3>Platform API error</h3><pre>${err}</pre>`);
    return;
  }

  const amount = tx.amount_expected?.amount ?? '?';
  const kind   = tx.kind ?? 'deposit';
  const memo   = generateMemo(transaction_id);

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${kind === 'withdrawal' ? 'Withdraw' : 'Deposit'} ${ASSET_CODE}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; color: #111; }
    h2 { font-size: 1.4rem; margin-bottom: .25rem; }
    .sub { font-size: .8rem; color: #666; margin-bottom: 1.25rem; }
    .card { background: #f6f6f8; border: 1px solid #e5e5ea; border-radius: 8px; padding: .9rem 1rem; margin: .6rem 0; }
    .label { font-size: .72rem; color: #888; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px; }
    .value { font-family: monospace; font-size: .9rem; word-break: break-all; }
    .big { font-size: 1.5rem; font-weight: 700; }
    .badge { display:inline-block; background:#ede9fe; color:#6d28d9; font-size:.7rem; padding:2px 7px; border-radius:5px; margin-left:6px; }
    .phase { margin-top:1.25rem; padding:.8rem 1rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; font-size:.82rem; color:#92400e; line-height:1.5; }
  </style>
</head>
<body>
  <h2>${kind === 'withdrawal' ? 'Withdraw' : 'Deposit'} ${ASSET_CODE}
      <span class="badge">${IS_MAINNET ? 'MAINNET' : 'TESTNET'}</span></h2>
  <p class="sub">Transaction <code>${transaction_id}</code></p>

  <div class="card"><div class="label">Kind</div><div class="value">${kind}</div></div>
  <div class="card"><div class="label">Amount expected</div><div class="value big">${amount} ${ASSET_CODE}</div></div>
  <div class="card"><div class="label">Memo (derived)</div><div class="value">${memo}</div></div>

  <div class="phase">
    <strong>Phase A skeleton.</strong> The handshake works: this page read the
    transaction from the Platform API. The USDC on-ramp (deposit + treasury
    transfer) lands in Phase B; the off-ramp (withdrawal + Observer detection) in
    Phase C.
  </div>
</body>
</html>`);
});

// more_info_url stub (config points the AP here). Real detail view: Phase E.
sep24Router.get('/transaction', (req, res) => {
  res.json({ id: req.query.transaction_id ?? null, note: 'more_info stub (Phase A)' });
});
