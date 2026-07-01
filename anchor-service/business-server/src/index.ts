import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  Keypair, Networks, Horizon, Memo,
  TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ─── Environment ─────────────────────────────────────────────────────────────

const PLATFORM_API_URL    = process.env.PLATFORM_API_URL    ?? 'http://anchor-platform:8085';
const DISTRIBUTION_PUBLIC = process.env.DISTRIBUTION_PUBLIC ?? '';
const DISTRIBUTION_SECRET = process.env.DISTRIBUTION_SECRET ?? '';
const ASSET_ISSUER_PUBLIC = process.env.ASSET_ISSUER_PUBLIC ?? '';
const ASSET_CODE          = process.env.ASSET_CODE          ?? 'ANCH';
const HORIZON_URL         = process.env.HORIZON_URL         ?? 'https://horizon-testnet.stellar.org';
const NET_PASS            = process.env.NETWORK_PASSPHRASE  ?? Networks.TESTNET;
const IS_MAINNET          = !HORIZON_URL.includes('testnet');

// ─── Platform API helpers ─────────────────────────────────────────────────────

async function fetchTransaction(id: string): Promise<Record<string, any>> {
  const res = await fetch(`${PLATFORM_API_URL}/transactions/${id}`);
  if (!res.ok) throw new Error(`Platform GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function patchTransaction(id: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PLATFORM_API_URL}/transactions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ transaction: { id, ...fields } }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Platform PATCH ${res.status}: ${body}`);
  }
}

async function listTransactions(params: Record<string, string>): Promise<any[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${PLATFORM_API_URL}/transactions?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.records ?? [];
}

// ─── Memo helper ─────────────────────────────────────────────────────────────
// Deterministic memo derived from the transaction ID.
// Used for withdrawal: the Platform stores this memo and the Observer matches
// incoming Stellar payments by it.

function generateMemo(transactionId: string): string {
  return transactionId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

// ─── Stellar payment (deposit: Distribution → user's wallet) ─────────────────

async function sendAnch(destinationAccount: string, amount: string): Promise<string> {
  if (!DISTRIBUTION_SECRET) throw new Error('DISTRIBUTION_SECRET not set');
  const horizonServer = new Horizon.Server(HORIZON_URL);
  const keypair = Keypair.fromSecret(DISTRIBUTION_SECRET);
  const asset = new Asset(ASSET_CODE, ASSET_ISSUER_PUBLIC);

  const distAccount = await horizonServer.loadAccount(DISTRIBUTION_PUBLIC);
  const tx = new TransactionBuilder(distAccount, {
    fee: BASE_FEE,
    networkPassphrase: NET_PASS,
  })
    .addOperation(Operation.payment({ destination: destinationAccount, asset, amount }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await horizonServer.submitTransaction(tx);
  return (result as any).hash;
}

// ─── Withdrawal processing ───────────────────────────────────────────────────
// Called by the polling loop when a withdrawal reaches pending_anchor.
// At this point the Observer has confirmed the user's ANCH has arrived.

async function processWithdrawal(id: string, tx: Record<string, any>): Promise<void> {
  const amount = tx.amount_expected?.amount ?? '0';
  const assetId = `stellar:${ASSET_CODE}:${ASSET_ISSUER_PUBLIC}`;

  console.log(`[withdrawal] Processing ${id}: ${amount} ${ASSET_CODE} from ${tx.destination_account}`);

  // Simulate fiat disbursement (bank transfer, ACH, etc.)
  // In production: call your bank's API here.
  console.log(`[withdrawal] Simulating fiat payout of ${amount} to ${tx.destination_account}`);

  await patchTransaction(id, {
    status: 'completed',
    amount_in:  { amount, asset: assetId },
    amount_out: { amount, asset: assetId },
    amount_fee: { amount: '0', asset: assetId },
  });

  console.log(`[withdrawal] ${id} → completed`);
}

// ─── Polling loop ─────────────────────────────────────────────────────────────
// Every 15 s: check for withdrawal transactions the Observer moved to pending_anchor.

async function pollWithdrawals(): Promise<void> {
  try {
    const records = await listTransactions({ sep: '24', status: 'pending_anchor' });
    const withdrawals = records.filter((r: any) => r.kind === 'withdrawal');
    for (const tx of withdrawals) {
      await processWithdrawal(tx.id, tx).catch(err =>
        console.error(`[withdrawal] Error processing ${tx.id}:`, err.message)
      );
    }
  } catch (err) {
    console.error('[poller] error:', (err as Error).message);
  }
}

setInterval(pollWithdrawals, 15_000);

// ─── Frontend API (no CDN needed in browser) ─────────────────────────────────
// These let the browser do Stellar operations without importing @stellar/stellar-sdk.

// HORIZON_URL from env

// Account balances
app.get('/api/account/:address', async (req, res) => {
  const r = await fetch(`${HORIZON_URL}/accounts/${req.params.address}`);
  if (!r.ok) { res.json({ xlm: null, anch: null, error: 'Account not found' }); return; }
  const data = await r.json();
  const xlm  = data.balances?.find((b: any) => b.asset_type === 'native')?.balance ?? '0';
  const anch = data.balances?.find((b: any) => b.asset_code === ASSET_CODE)?.balance ?? null;
  res.json({ xlm, anch });
});

// Build unsigned changeTrust XDR
app.post('/api/xdr/trustline', async (req, res) => {
  const { account } = req.body as { account: string };
  try {
    const h   = new Horizon.Server(HORIZON_URL);
    const acc = await h.loadAccount(account);
    const tx  = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NET_PASS })
      .addOperation(Operation.changeTrust({ asset: new Asset(ASSET_CODE, ASSET_ISSUER_PUBLIC), limit: '10000000' }))
      .setTimeout(30).build();
    res.json({ xdr: tx.toEnvelope().toXDR('base64') });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// Build unsigned payment XDR (withdrawal transfer: user → Distribution)
app.post('/api/xdr/payment', async (req, res) => {
  const { from, to, amount, memo } = req.body as Record<string, string>;
  try {
    const h       = new Horizon.Server(HORIZON_URL);
    const acc     = await h.loadAccount(from);
    const builder = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NET_PASS })
      .addOperation(Operation.payment({ destination: to, asset: new Asset(ASSET_CODE, ASSET_ISSUER_PUBLIC), amount }));
    if (memo) builder.addMemo(Memo.text(memo));
    const tx = builder.setTimeout(30).build();
    res.json({ xdr: tx.toEnvelope().toXDR('base64') });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// Submit signed XDR to Horizon
app.post('/api/submit', async (req, res) => {
  const { xdr } = req.body as { xdr: string };
  try {
    const h      = new Horizon.Server(HORIZON_URL);
    const tx     = TransactionBuilder.fromXDR(xdr, NET_PASS);
    const result = await h.submitTransaction(tx);
    res.json({ hash: (result as any).hash });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// Derive public key from secret (secret-key fallback path)
app.post('/api/pubkey', (req, res) => {
  try {
    const { secret } = req.body as { secret: string };
    const kp = Keypair.fromSecret(secret);
    res.json({ publicKey: kp.publicKey() });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// Random keypair for dev use
app.get('/api/pubkey/random', (_req, res) => {
  const kp = Keypair.random();
  res.json({ publicKey: kp.publicKey(), secret: kp.secret() });
});

// Sign an XDR with a secret key (dev-only; stays local to this server)
app.post('/api/sign', (req, res) => {
  try {
    const { xdr, secret } = req.body as { xdr: string; secret: string };
    const kp = Keypair.fromSecret(secret);
    const tx = TransactionBuilder.fromXDR(xdr, NET_PASS);
    tx.sign(kp);
    res.json({ signed: tx.toEnvelope().toXDR('base64') });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

// ─── SEP proxy (browser → business server → SEP server) ─────────────────────
// The frontend is served from localhost:3000. Direct calls to localhost:8080
// would be cross-origin and blocked by the browser. These routes forward the
// critical SEP-10 and SEP-24 calls so everything stays on the same origin.

const SEP_BASE = 'http://anchor-platform:8080';

app.get('/sep/auth', async (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const r = await fetch(`${SEP_BASE}/auth?${qs}`);
  res.status(r.status).json(await r.json());
});

app.post('/sep/auth', async (req, res) => {
  const r = await fetch(`${SEP_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  res.status(r.status).json(await r.json());
});

app.post('/sep/deposit', async (req, res) => {
  const r = await fetch(`${SEP_BASE}/sep24/transactions/deposit/interactive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    body: JSON.stringify(req.body),
  });
  res.status(r.status).json(await r.json());
});

app.post('/sep/withdraw', async (req, res) => {
  const r = await fetch(`${SEP_BASE}/sep24/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    body: JSON.stringify(req.body),
  });
  res.status(r.status).json(await r.json());
});

app.get('/sep/tx/:id', async (req, res) => {
  const r = await fetch(`${SEP_BASE}/sep24/transactions/${req.params.id}`, {
    headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
  });
  res.status(r.status).json(await r.json());
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'business-server' });
});

// ─── SEP-24 Interactive form (GET) ────────────────────────────────────────────

app.get('/sep24/interactive', async (req, res) => {
  const { transaction_id, token } = req.query as Record<string, string>;

  if (!transaction_id) { res.status(400).send('<h3>Missing transaction_id</h3>'); return; }

  let jwtClaims: Record<string, any> = {};
  try {
    jwtClaims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch { /* fall back to Platform API data */ }

  let tx: Record<string, any>;
  try {
    tx = await fetchTransaction(transaction_id);
  } catch (err) {
    res.status(500).send(`<h3>Error</h3><pre>${err}</pre>`);
    return;
  }

  const amount = tx.amount_expected?.amount ?? jwtClaims.data?.amount ?? '?';
  const kind   = tx.kind ?? 'deposit';
  const memo   = generateMemo(transaction_id);

  const isWithdrawal = kind === 'withdrawal';

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${isWithdrawal ? 'Withdraw' : 'Deposit'} ${ASSET_CODE}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; color: #111; }
    h2   { font-size: 1.4rem; margin-bottom: 0.25rem; }
    .sub { font-size: 0.8rem; color: #666; margin-bottom: 1.5rem; }
    .card { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 8px;
            padding: 0.9rem 1rem; margin: 0.75rem 0; }
    .label { font-size: 0.75rem; color: #888; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-family: monospace; font-size: 0.88rem; word-break: break-all; }
    .big   { font-size: 1.6rem; font-weight: 700; font-family: inherit; }
    .note  { font-size: 0.78rem; color: #888; margin: 0.75rem 0 1rem; line-height: 1.5; }
    button { display: block; width: 100%; padding: 0.8rem; background: ${isWithdrawal ? '#7c3aed' : '#2563eb'};
             color: #fff; font-size: 1rem; border: none; border-radius: 8px; cursor: pointer; margin-top: 0.5rem; }
    button:hover { opacity: 0.9; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e;
             font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
  </style>
</head>
<body>
  <h2>${isWithdrawal ? 'Withdraw' : 'Deposit'} ${ASSET_CODE} <span class="badge">${IS_MAINNET ? 'MAINNET' : 'TESTNET'}</span></h2>
  <p class="sub">Transaction: <code>${transaction_id}</code></p>

  <div class="card">
    <div class="label">Amount</div>
    <div class="value big">${amount} ${ASSET_CODE}</div>
  </div>

  ${isWithdrawal ? `
  <div class="card">
    <div class="label">Send your ${ASSET_CODE} tokens to this Stellar address</div>
    <div class="value">${DISTRIBUTION_PUBLIC}</div>
  </div>
  <div class="card">
    <div class="label">Required memo (text) — include this exactly</div>
    <div class="value">${memo}</div>
  </div>
  <p class="note">
    After sending ${ASSET_CODE} tokens on Stellar with the memo above, click confirm.
    The anchor will verify receipt and release your fiat (simulated — no real bank wired).
  </p>
  ` : `
  <div class="card">
    <div class="label">Wire transfer to</div>
    <div class="value">ACME Test Bank · Account #4821-7700<br>Routing: 021000021</div>
  </div>
  <div class="card">
    <div class="label">Required wire memo</div>
    <div class="value">${memo}</div>
  </div>
  <p class="note">
    No real bank transfer needed here. Click confirm to simulate the wire transfer
    and instantly receive ${ASSET_CODE} tokens in your Stellar wallet.
  </p>
  `}

  <form method="POST" action="/sep24/interactive/complete">
    <input type="hidden" name="transaction_id"      value="${transaction_id}" />
    <input type="hidden" name="destination_account" value="${tx.destination_account ?? ''}" />
    <input type="hidden" name="amount"              value="${amount}" />
    <input type="hidden" name="kind"                value="${kind}" />
    <input type="hidden" name="memo"                value="${memo}" />
    <button type="submit">
      ${isWithdrawal ? `Confirm — I have sent ${amount} ${ASSET_CODE}` : `Confirm — Release ${amount} ${ASSET_CODE} to my wallet`}
    </button>
  </form>
</body>
</html>`);
});

// ─── SEP-24 Interactive complete (POST) ───────────────────────────────────────

app.post('/sep24/interactive/complete', async (req, res) => {
  const { transaction_id, destination_account, amount, kind, memo } = req.body as Record<string, string>;
  const log: string[] = [];
  const assetId = `stellar:${ASSET_CODE}:${ASSET_ISSUER_PUBLIC}`;
  let stellarTxHash = '';

  try {
    if (kind === 'withdrawal') {
      // ── Withdrawal path ──────────────────────────────────────────────────────
      // Mark as pending_user_transfer_start AND include memo so the Platform
      // stores it. The Observer will match incoming ANCH payments by this memo.

      log.push('Updating status → pending_user_transfer_start…');
      await patchTransaction(transaction_id, {
        status: 'pending_user_transfer_start',
        memo,
        memo_type: 'text',
      });
      log.push(`✓ Status: pending_user_transfer_start (memo: ${memo})`);

      res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Waiting for transfer</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; }
    .title { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; }
    .card { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 8px;
            padding: 0.9rem 1rem; margin: 0.75rem 0; }
    .label { font-size: 0.75rem; color: #888; margin-bottom: 3px; text-transform: uppercase; }
    .value { font-family: monospace; font-size: 0.88rem; word-break: break-all; }
    .note  { font-size: 0.82rem; color: #555; margin-top: 1rem; line-height: 1.5; }
    .log   { font-size: 0.8rem; color: #666; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="title">⏳ Waiting for your ANCH transfer</div>

  <div class="card">
    <div class="label">Send to</div>
    <div class="value">${DISTRIBUTION_PUBLIC}</div>
  </div>
  <div class="card">
    <div class="label">Amount</div>
    <div class="value">${amount} ${ASSET_CODE}</div>
  </div>
  <div class="card">
    <div class="label">Memo (text) — required</div>
    <div class="value">${memo}</div>
  </div>

  <p class="note">
    Once you send ${amount} ${ASSET_CODE} to the address above with memo <strong>${memo}</strong>,
    the anchor's Observer will detect the payment and automatically release your fiat.
    This page can be closed — the transaction will complete in the background.
  </p>
  <div class="log">${log.map(l => `<div>${l}</div>`).join('')}</div>
  <script>
    try { window.parent.postMessage({ type: 'sep24_withdrawal_pending', txId: '${transaction_id}', memo: '${memo}', amount: '${amount}', destination: '${DISTRIBUTION_PUBLIC}' }, '*'); } catch(e) {}
  </script>
</body>
</html>`);
      return;
    }

    // ── Deposit path ────────────────────────────────────────────────────────────

    log.push('Updating status → pending_anchor…');
    await patchTransaction(transaction_id, { status: 'pending_anchor' });
    log.push('✓ Status: pending_anchor');

    log.push(`Sending ${amount} ${ASSET_CODE} to ${destination_account}…`);
    stellarTxHash = await sendAnch(destination_account, amount);
    log.push(`✓ Stellar tx: ${stellarTxHash}`);

    log.push('Updating status → completed…');
    await patchTransaction(transaction_id, {
      status: 'completed',
      amount_in:  { amount, asset: assetId },
      amount_out: { amount, asset: assetId },
      amount_fee: { amount: '0', asset: assetId },
      stellar_transactions: [{ id: stellarTxHash }],
    });
    log.push('✓ Status: completed');

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Deposit Complete</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; }
    .ok  { color: #16a34a; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .row { font-size: 0.85rem; padding: 3px 0; color: #444; }
    a    { color: #2563eb; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="ok">✓ Deposit complete</div>
  <p>${amount} ${ASSET_CODE} sent to your Stellar wallet.</p>
  <div style="margin-top:1rem">${log.map(l => `<div class="row">${l}</div>`).join('')}</div>
  <p style="margin-top:1rem">
    <a href="https://stellar.expert/explorer/${IS_MAINNET ? 'public' : 'testnet'}/tx/${stellarTxHash}" target="_blank">
      View on Stellar Expert →
    </a>
  </p>
  <script>
    try { window.parent.postMessage({ type: 'sep24_deposit_complete', txId: '${transaction_id}', hash: '${stellarTxHash}' }, '*'); } catch(e) {}
  </script>
</body>
</html>`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[complete] error:', msg);
    res.status(500).type('html').send(`<html><body style="font-family:monospace;padding:1rem;color:#dc2626">
      <h3>Error</h3><pre>${msg}</pre>
      <h4>Steps before error:</h4>${log.map(l => `<div>${l}</div>`).join('')}
    </body></html>`);
  }
});

// ─── Callback: Unique Address ─────────────────────────────────────────────────

app.post('/callbacks/unique_address', (req, res) => {
  console.log('[callback] unique_address body:', JSON.stringify(req.body));
  // Generate a deterministic memo from the transaction ID (if available).
  const txId = req.body?.transaction?.id ?? '';
  const memo = txId ? generateMemo(txId) : Math.random().toString(36).slice(2, 8).toUpperCase();
  res.json({
    uniqueAddress: {
      stellarAddress: DISTRIBUTION_PUBLIC,
      memo,
      memoType: 'text',
    },
  });
});

// ─── Callback: Fee ────────────────────────────────────────────────────────────

app.post('/callbacks/fee', (req, res) => {
  console.log('[callback] fee', req.body);
  res.json({
    fee: {
      asset: req.body.sendAsset ?? `stellar:${ASSET_CODE}:${ASSET_ISSUER_PUBLIC}`,
      amount: '0',
    },
  });
});

// ─── Callback: Customer (GET) ─────────────────────────────────────────────────

app.get('/callbacks/customer', (req, res) => {
  res.json({ id: (req.query.id as string) ?? 'stub', status: 'ACCEPTED', fields: {} });
});

app.put('/callbacks/customer', (req, res) => {
  res.json({ id: req.body.id ?? 'stub' });
});

app.delete('/callbacks/customer/:id', (_req, res) => {
  res.status(204).send();
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nBusiness Server listening on :${PORT}`);
  console.log(`  Distribution: ${DISTRIBUTION_PUBLIC || '(not set)'}`);
  console.log(`  Issuer:       ${ASSET_ISSUER_PUBLIC || '(not set)'}`);
  console.log(`  Platform API: ${PLATFORM_API_URL}`);
  console.log(`  Polling withdrawals every 15 s\n`);
});
