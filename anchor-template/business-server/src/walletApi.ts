import { Router } from 'express';
import {
  Keypair, Horizon, Memo, TransactionBuilder, BASE_FEE, Operation, Asset,
} from '@stellar/stellar-sdk';
import { ASSET_CODE, ASSET_ISSUER_PUBLIC, HORIZON_URL, NET_PASS, SEP_SERVER_URL } from './config.js';
import { rate } from './adapters/index.js';
import { pool } from './db.js';

// ─── Browser helper API + SEP proxy ────────────────────────────────────────────
// Lets the (same-origin) wallet UI do Stellar ops without bundling the SDK, and
// forwards SEP-10/24 calls so everything stays on one origin. Legacy single-anchor
// convenience; end users in the factory hit <slug>.anchors.localhost via Traefik.

export const walletRouter = Router();

// Public price quote for the customer app's Buy/Sell amount screen. Read-only, no money
// movement — just the live INR↔asset rate so the UI can show "you pay ₹X / you get Y".
walletRouter.get('/api/quote', async (req, res) => {
  try {
    const q = await rate.quote();
    const inrPerUnit = Number(q.inrPerUsdc);
    const amount = Number(req.query.amount);
    const side = (req.query.side as string) === 'sell' ? 'sell' : 'buy';
    // Surface the anchor's operational min/max (asset units) so the Buy/Sell screen can
    // validate AS THE USER TYPES — instead of only failing later inside the SEP-24 gate.
    const strategy = await pool
      .query('SELECT config FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1')
      .then((r) => r.rows[0]?.config ?? null)
      .catch(() => null);
    const body: Record<string, unknown> = {
      assetCode: ASSET_CODE,
      inrPerUnit: inrPerUnit.toFixed(2),
      source: q.source,
      minAmount: strategy?.minDeposit ?? null,
      maxAmount: strategy?.maxDeposit ?? null,
    };
    if (Number.isFinite(amount) && amount > 0) {
      // buy: enter asset amount → INR to pay. sell: enter asset amount → INR received.
      body.assetAmount = amount.toFixed(2);
      body.inrAmount = (amount * inrPerUnit).toFixed(2);
      body.side = side;
    }
    res.json(body);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

walletRouter.get('/api/account/:address', async (req, res) => {
  const r = await fetch(`${HORIZON_URL}/accounts/${req.params.address}`);
  if (!r.ok) { res.json({ xlm: null, anch: null, error: 'Account not found' }); return; }
  const data: any = await r.json();
  const xlm  = data.balances?.find((b: any) => b.asset_type === 'native')?.balance ?? '0';
  const anch = data.balances?.find((b: any) => b.asset_code === ASSET_CODE)?.balance ?? null;
  res.json({ xlm, anch });
});

walletRouter.post('/api/xdr/trustline', async (req, res) => {
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

walletRouter.post('/api/xdr/payment', async (req, res) => {
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

walletRouter.post('/api/submit', async (req, res) => {
  const { xdr } = req.body as { xdr: string };
  try {
    const h      = new Horizon.Server(HORIZON_URL);
    const tx     = TransactionBuilder.fromXDR(xdr, NET_PASS);
    const result = await h.submitTransaction(tx as any);
    res.json({ hash: (result as any).hash });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

walletRouter.post('/api/pubkey', (req, res) => {
  try {
    const { secret } = req.body as { secret: string };
    res.json({ publicKey: Keypair.fromSecret(secret).publicKey() });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

walletRouter.get('/api/pubkey/random', (_req, res) => {
  const kp = Keypair.random();
  res.json({ publicKey: kp.publicKey(), secret: kp.secret() });
});

walletRouter.post('/api/sign', (req, res) => {
  try {
    const { xdr, secret } = req.body as { xdr: string; secret: string };
    const tx = TransactionBuilder.fromXDR(xdr, NET_PASS);
    tx.sign(Keypair.fromSecret(secret));
    res.json({ signed: tx.toEnvelope().toXDR('base64') });
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

async function safeForward(r: any, res: any) {
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    res.status(r.status).json(json);
  } catch {
    console.error(`[walletApi proxy] Non-JSON response (status ${r.status}):`, text);
    res.status(r.status).send(text);
  }
}

// SEP proxy (same-origin forwarding to this anchor's SEP server).
walletRouter.get('/sep/auth', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const r = await fetch(`${SEP_SERVER_URL}/auth?${qs}`);
    await safeForward(r, res);
  } catch (err) {
    console.error('[walletApi proxy GET /sep/auth error]:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

walletRouter.post('/sep/auth', async (req, res) => {
  try {
    const r = await fetch(`${SEP_SERVER_URL}/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body),
    });
    await safeForward(r, res);
  } catch (err) {
    console.error('[walletApi proxy POST /sep/auth error]:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

walletRouter.post('/sep/deposit', async (req, res) => {
  try {
    const r = await fetch(`${SEP_SERVER_URL}/sep24/transactions/deposit/interactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      body: JSON.stringify(req.body),
    });
    await safeForward(r, res);
  } catch (err) {
    console.error('[walletApi proxy POST /sep/deposit error]:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

walletRouter.post('/sep/withdraw', async (req, res) => {
  try {
    const r = await fetch(`${SEP_SERVER_URL}/sep24/transactions/withdraw/interactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      body: JSON.stringify(req.body),
    });
    await safeForward(r, res);
  } catch (err) {
    console.error('[walletApi proxy POST /sep/withdraw error]:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

walletRouter.get('/sep/tx/:id', async (req, res) => {
  try {
    const r = await fetch(`${SEP_SERVER_URL}/sep24/transactions/${req.params.id}`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
    });
    await safeForward(r, res);
  } catch (err) {
    console.error('[walletApi proxy GET /sep/tx/:id error]:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
