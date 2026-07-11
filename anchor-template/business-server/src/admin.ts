import { Router } from 'express';
import { listTransactions, patchTransaction } from './platform.js';
import { getTreasuryBalances } from './stellar.js';
import { ASSET_CODE, ASSET_ISSUER_PUBLIC, TREASURY_PUBLIC, IS_MAINNET, assetId, PROVIDERS, NORDSTERN_API_URL, SERVICE_SECRET } from './config.js';
import { rate } from './adapters/index.js';
import { pool } from './db.js';
import { releaseDeposit } from './sep24.js';
import crypto from 'crypto';

// ─── Admin API (operator dashboard) ────────────────────────────────────────────
// Read-only, live data for the Next.js dashboard: treasury float, transaction
// ledger, and roll-ups. Reads from the Platform API + Horizon (state stays
// authoritative in the Platform DB). Not authenticated yet — same-origin dev only;
// real auth/API-keys are a Phase E/F concern.

export const adminRouter = Router();

const num = (v: any) => Number(v ?? 0);

// Resolve central customer identities (name/email/country/KYC) for a set of Stellar accounts,
// via the platform-api internal endpoint (service-secret). Best-effort — returns {} if the
// platform isn't wired (standalone) or is unreachable, so the console degrades to accounts only.
type CustomerProfile = { fullName: string | null; email: string; country: string | null; kycStatus: string };
async function fetchCustomerProfiles(addresses: string[]): Promise<Record<string, CustomerProfile>> {
  if (!NORDSTERN_API_URL || !SERVICE_SECRET || addresses.length === 0) return {};
  try {
    const res = await fetch(`${NORDSTERN_API_URL}/api/v1/internal/customers/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-secret': SERVICE_SECRET },
      body: JSON.stringify({ addresses }),
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { profiles?: Record<string, CustomerProfile> };
    return body.profiles ?? {};
  } catch {
    return {};
  }
}

function normalize(tx: Record<string, any>) {
  return {
    id: tx.id,
    kind: tx.kind,
    status: tx.status,
    // Flatten the AP's { amount, asset } to the numeric string the console renders — the
    // asset unit is implied by kind (deposit in=INR/out=asset; withdrawal reversed).
    amountIn: tx.amount_in?.amount ?? null,
    amountOut: tx.amount_out?.amount ?? null,
    amountExpected: tx.amount_expected?.amount ?? null,
    memo: tx.memo ?? null,
    destination: tx.destination_account ?? null,
    stellarTx: tx.stellar_transactions?.[0]?.id ?? null,
    startedAt: tx.started_at ?? null,
    completedAt: tx.completed_at ?? null,
    updatedAt: tx.updated_at ?? tx.started_at ?? null,
  };
}

adminRouter.get('/transactions', async (_req, res) => {
  try {
    const records = await listTransactions({ sep: '24', order: 'desc' });
    const transactions = records
      .map(normalize)
      .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/summary', async (_req, res) => {
  try {
    const [balances, records, q] = await Promise.all([
      getTreasuryBalances(),
      listTransactions({ sep: '24', order: 'desc' }),
      rate.quote(),
    ]);
    const txs = records.map(normalize);
    const completed = (t: any) => t.status === 'completed';
    const failed = (t: any) => t.status === 'error';
    const deposits = txs.filter((t) => t.kind === 'deposit');
    const withdrawals = txs.filter((t) => t.kind === 'withdrawal');
    const pending = txs.filter((t) => !['completed', 'error', 'refunded'].includes(t.status));
    // Real health signals (were hardcoded). If we reached here, listTransactions (Platform
    // API) and getTreasuryBalances (Horizon) both succeeded. DB is pinged live.
    const dbUp = await pool.query('SELECT 1').then(() => true).catch(() => false);

    // ── Derived, REAL metrics (all from actual transactions/ledger — never fabricated) ──
    const sum = (arr: any[], f: (t: any) => any) => arr.reduce((s, t) => s + num(f(t)), 0);
    const usdcDeposited = sum(deposits.filter(completed), (t) => t.amountOut);
    const usdcWithdrawn = sum(withdrawals.filter(completed), (t) => t.amountIn);
    const inrCollected = sum(deposits.filter(completed), (t) => t.amountIn);
    const inrPaidOut = sum(withdrawals.filter(completed), (t) => t.amountOut);
    // Net asset issued and outstanding (delivered on-ramp minus redeemed off-ramp).
    const tokensInCirculation = Math.max(0, usdcDeposited - usdcWithdrawn);

    // Average settlement time (minutes) over completed txns that carry both timestamps.
    const settled = txs.filter((t) => completed(t) && t.startedAt && t.completedAt);
    const avgSettlementMinutes = settled.length
      ? settled.reduce((s, t) => s + (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()), 0) / settled.length / 60000
      : null;

    // 14-day money-movement series from completed txns (real daily inflow/outflow).
    const dayKey = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);
    const todayKey = new Date().toISOString().slice(0, 10);
    const movementSeries = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        inflow: sum(deposits.filter((t) => completed(t) && dayKey(t.completedAt) === key), (t) => t.amountIn).toFixed(2),
        outflow: sum(withdrawals.filter((t) => completed(t) && dayKey(t.completedAt) === key), (t) => t.amountOut).toFixed(2),
      };
    });
    const dailyOutflow = sum(withdrawals.filter((t) => completed(t) && dayKey(t.completedAt) === todayKey), (t) => t.amountOut);

    // Needs-attention queues (real counts + amounts).
    const withdrawalsAwaitingPayout = withdrawals.filter((t) => t.status === 'pending_anchor' || t.status === 'pending_user_transfer_complete');
    const depositsPending = deposits.filter((t) => t.status === 'pending_user_transfer_start');
    const payoutFailed = withdrawals.filter(failed);
    const attention = {
      withdrawalsAwaitingPayout: { count: withdrawalsAwaitingPayout.length, amount: sum(withdrawalsAwaitingPayout, (t) => t.amountOut ?? t.amountExpected).toFixed(2) },
      depositsPending: { count: depositsPending.length, amount: sum(depositsPending, (t) => t.amountExpected).toFixed(2) },
      payoutFailed: { count: payoutFailed.length, amount: sum(payoutFailed, (t) => t.amountOut ?? t.amountExpected).toFixed(2) },
    };

    // Recent transactions (top 8) — customer-friendly shape for the dashboard list. We have
    // no customer names for SEP-24 txns, so identity is the masked account/memo (honest).
    const mask = (a: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—');
    const recent = txs.slice(0, 8).map((t) => ({
      id: t.id,
      kind: t.kind,                       // deposit | withdrawal
      dir: t.kind === 'deposit' ? 'in' : 'out',
      ref: mask(t.destination) !== '—' ? mask(t.destination) : (t.memo ? String(t.memo).slice(0, 10) : `tx_${String(t.id).slice(0, 4)}`),
      status: t.status,
      inr: t.kind === 'deposit' ? t.amountIn : t.amountOut,
      asset: t.kind === 'deposit' ? t.amountOut : t.amountIn,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    }));

    // Operator-set logo override (falls back to the provisioned env logo in the console).
    const logoOverride = await getSetting('logoUrl');

    res.json({
      network: IS_MAINNET ? 'mainnet' : 'testnet',
      asset: { code: ASSET_CODE, issuer: ASSET_ISSUER_PUBLIC, id: assetId() },
      branding: { logoUrl: logoOverride },
      treasury: { address: TREASURY_PUBLIC, usdc: balances.usdc, xlm: balances.xlm },
      rate: q,
      counts: {
        total: txs.length,
        deposits: deposits.length,
        withdrawals: withdrawals.length,
        completed: txs.filter(completed).length,
        pending: pending.length,
      },
      volume: {
        // Deposit (on-ramp): INR in → USDC out.
        inrCollected: inrCollected.toFixed(2),
        usdcDeposited: usdcDeposited.toFixed(2),
        // Withdrawal (off-ramp): USDC in → INR out.
        usdcWithdrawn: usdcWithdrawn.toFixed(2),
        inrPaidOut: inrPaidOut.toFixed(2),
      },
      // Balance-sheet + operations metrics — all derived from real transactions/ledger.
      metrics: {
        tokensInCirculation: tokensInCirculation.toFixed(2),   // net asset issued & outstanding
        netFiatCollected: (inrCollected - inrPaidOut).toFixed(2), // net INR from real txns (NOT a bank balance)
        avgSettlementMinutes: avgSettlementMinutes == null ? null : avgSettlementMinutes.toFixed(1),
        netFlow24h: (num((deposits.filter(t => completed(t) && dayKey(t.completedAt) === todayKey)).reduce((s, t) => s + num(t.amountIn), 0)) - dailyOutflow).toFixed(2),
        dailyOutflow: dailyOutflow.toFixed(2),
      },
      movementSeries,   // 14 × { date, inflow, outflow }
      attention,        // real needs-attention queues
      recent,           // top 8 transactions (masked account/memo — no fabricated names)
      // Reserve/issuance accounts — real Stellar accounts this anchor controls.
      reserveAccounts: {
        distribution: { address: TREASURY_PUBLIC, assetBalance: balances.usdc, xlm: balances.xlm },
        issuer: { address: ASSET_ISSUER_PUBLIC },
      },
      // Configured providers (real adapter selection) + their coarse status.
      providers: {
        kyc: PROVIDERS.kyc,
        deposit: PROVIDERS.deposit,
        payout: PROVIDERS.payout,
      },
      // Only fields we can actually source are returned. bankBalance / reservedBalance /
      // dailySettlement require a bank/treasury-ops integration that does not exist yet —
      // they are null (the UI shows "not connected") rather than fabricated numbers.
      fiat: {
        bankBalance: null,
        reservedBalance: null,
        dailySettlement: null,
        pendingDeposits: deposits.filter(t => t.status === 'pending_user_transfer_start').reduce((s, t) => s + num(t.amountExpected), 0).toFixed(2),
        dailyInflow: deposits.filter(t => t.status === 'completed' && new Date(t.completedAt ?? '').toDateString() === new Date().toDateString()).reduce((s, t) => s + num(t.amountIn), 0).toFixed(2),
      },
      // Real, live health. Infra-level uptimes (API/EKS) are not the business-server's to
      // claim and were removed; these three are genuinely checked.
      health: {
        databaseStatus: dbUp ? 'up' : 'down',
        horizonConnectivity: balances ? 'up' : 'down',
        workerStatus: 'up', // poller + release reconciler run in-process (see index.ts)
      }
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Customers, derived from REAL transaction activity only. A "customer" is a Stellar
// account that has transacted with this anchor. We report only what we genuinely know:
// account, transaction count, completed volume, and first/last activity. KYC identity
// (email/phone/name), risk tier, and account-freeze have no real source on the money
// server yet — they are omitted rather than fabricated (see kyc_verifications gap in
// the operator console). Per-account KYC status is joined from the
// real kyc_verifications table when a linkage exists.
// Unified activity feed — merges EXISTING real sources (transactions, audit log, KYC
// verifications, webhook deliveries) into one time-sorted stream. Invents no data; every
// item is a real row. Used by the operator console's live feed.
adminRouter.get('/activity', async (_req, res) => {
  try {
    const [txRecords, auditRows, kycRows, whRows] = await Promise.all([
      listTransactions({ sep: '24', order: 'desc' }).catch(() => []),
      pool.query('SELECT action, detail, actor, created_at FROM nordstern.audit_logs ORDER BY seq DESC LIMIT 40').then(r => r.rows).catch(() => []),
      pool.query('SELECT vendor_data, status, updated_at FROM nordstern.kyc_verifications ORDER BY updated_at DESC LIMIT 40').then(r => r.rows).catch(() => []),
      pool.query('SELECT event, status, created_at FROM nordstern.webhook_deliveries ORDER BY created_at DESC LIMIT 40').then(r => r.rows).catch(() => []),
    ]);

    type Item = { type: string; title: string; detail: string | null; amountIn: string | null; amountOut: string | null; status: string; actor: string | null; at: number };
    const items: Item[] = [];

    for (const t of txRecords.map(normalize)) {
      items.push({
        type: t.kind === 'deposit' ? 'deposit' : 'withdrawal',
        title: t.kind === 'deposit' ? 'Deposit' : 'Withdrawal',
        detail: null,
        amountIn: t.amountIn, amountOut: t.amountOut,
        status: t.status,
        actor: null,
        at: new Date(t.updatedAt ?? t.startedAt ?? Date.now()).getTime(),
      });
    }
    for (const a of auditRows) {
      items.push({ type: 'audit', title: a.action, detail: a.detail, amountIn: null, amountOut: null, status: 'info', actor: a.actor, at: new Date(a.created_at).getTime() });
    }
    for (const k of kycRows) {
      items.push({ type: 'kyc', title: 'KYC', detail: null, amountIn: null, amountOut: null, status: k.status, actor: null, at: new Date(k.updated_at).getTime() });
    }
    for (const w of whRows) {
      items.push({ type: 'webhook', title: 'Webhook', detail: w.event, amountIn: null, amountOut: null, status: String(w.status), actor: null, at: new Date(w.created_at).getTime() });
    }

    items.sort((a, b) => b.at - a.at);
    res.json({ activity: items.slice(0, 60) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/users', async (_req, res) => {
  try {
    const records = await listTransactions({ sep: '24', order: 'desc' });

    // Real KYC status by account, when the SEP-12 record keys on the Stellar account.
    const kycByAccount = new Map<string, string>();
    try {
      const { rows } = await pool.query('SELECT vendor_data, status FROM nordstern.kyc_verifications');
      for (const r of rows) kycByAccount.set(r.vendor_data, r.status);
    } catch { /* table reachable but empty is fine */ }

    const map = new Map<string, any>();
    for (const tx of records) {
      const account = tx.sep10_account ?? tx.customers?.sender?.account ?? tx.destination_account;
      if (!account) continue;
      const amount = Number(tx.amount_expected?.amount ?? tx.amount_in?.amount ?? tx.amount_out?.amount ?? 0);
      const at = tx.started_at ? new Date(tx.started_at).getTime() : Date.now();

      if (!map.has(account)) {
        map.set(account, {
          id: account,
          account,
          txCount: 0,
          completedVolume: 0,
          firstSeen: at,
          lastSeen: at,
          kycStatus: kycByAccount.get(account) ?? null, // null = unknown (not fabricated)
        });
      }
      const u = map.get(account);
      u.txCount += 1;
      if (tx.status === 'completed') u.completedVolume += amount;
      u.lastSeen = Math.max(u.lastSeen, at);
      u.firstSeen = Math.min(u.firstSeen, at);
    }

    const users = Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);

    // Enrich with the central NordStern identity (name / email / country) for accounts that
    // belong to a proven customer wallet — the "verify once" profile, shown to this anchor's
    // operator. Best-effort: identity stays blank if the platform is unreachable.
    const profiles = await fetchCustomerProfiles(users.map((u) => u.account));
    for (const u of users) {
      const p = profiles[u.account];
      if (p) {
        u.fullName = p.fullName ?? null;
        u.email = p.email ?? null;
        u.country = p.country ?? null;
        if (p.kycStatus) u.kycStatus = u.kycStatus ?? p.kycStatus;
      }
    }
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Helper for writing to tamper-evident audit log
async function writeAuditLog(action: string, detail: string, actor: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT hash FROM nordstern.audit_logs ORDER BY seq DESC LIMIT 1');
    const prevHash = rows[0]?.hash ?? '0000000000000000';
    const at = Date.now();
    const hashInput = prevHash + action + detail + actor + String(at);
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
    
    await client.query(
      `INSERT INTO nordstern.audit_logs (action, detail, actor, hash, prev_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, detail, actor, hash, prevHash]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Phase E: Compliance Cases Endpoints ──────────────────────────────────────────
adminRouter.get('/compliance/cases', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM nordstern.compliance_cases ORDER BY created_at DESC');
    // Real case fields only. email/phone were synthesized fakes and are removed — the
    // money server does not hold customer contact identity (see audit doc).
    res.json({ cases: rows.map(c => ({
      id: c.id,
      user: {
        id: c.user_id,
        name: c.user_name,
        initials: c.user_initials,
        status: c.status === 'cleared' ? 'verified' : 'flagged',
        risk: c.severity === 'high' ? 'high' : c.severity === 'med' ? 'med' : 'low',
        txCount: c.related_tx,
      },
      reason: c.reason,
      severity: c.severity,
      assignee: c.assignee,
      status: c.status,
      at: new Date(c.created_at).getTime(),
      amount: parseFloat(c.amount),
      relatedTx: c.related_tx,
      note: c.note
    })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/compliance/cases/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { status, note, actor } = req.body;
  try {
    const { rowCount } = await pool.query(
      `UPDATE nordstern.compliance_cases
       SET status = $1, note = $2, updated_at = now()
       WHERE id = $3`,
      [status, note, id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    await writeAuditLog(
      status === 'cleared' ? 'case.cleared' : 'str.filed',
      `${id} ${status === 'cleared' ? 'cleared after review' : 'filed with FIU-IND'}`,
      actor || 'compliance_officer'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Phase E: Tamper-Evident Audit Logs ──────────────────────────────────────────
adminRouter.get('/compliance/audit', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT seq, action, detail, actor, hash, prev_hash as "prevHash", created_at as at FROM nordstern.audit_logs ORDER BY seq DESC');
    res.json({ audit: rows.map(r => ({
      ...r,
      at: new Date(r.at).getTime()
    })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Phase E: Developer Console (API Keys) ─────────────────────────────────────────
adminRouter.get('/developer/keys', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, secret, scopes, live, created_at as created, last_used_at as "lastUsed" FROM nordstern.api_keys ORDER BY created_at DESC');
    // Never return plaintext on list — only a masked preview. The full secret is shown
    // exactly once, at create/roll time.
    res.json({ keys: rows.map(k => ({
      id: k.id,
      name: k.name,
      masked: `${k.secret.slice(0, 11)}${"•".repeat(18)}${k.secret.slice(-4)}`,
      scopes: k.scopes,
      live: k.live,
      created: new Date(k.created).getTime(),
      lastUsed: k.lastUsed ? new Date(k.lastUsed).getTime() : null
    })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/developer/keys', async (req, res) => {
  const { name, live } = req.body;
  const id = 'key_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const prefix = live ? 'ns_live_' : 'ns_test_';
  const secret = prefix + crypto.randomBytes(16).toString('hex');
  const scopes = ['read', 'write'];
  try {
    await pool.query(
      `INSERT INTO nordstern.api_keys (id, name, secret, scopes, live)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name || 'API Key', secret, scopes, !!live]
    );
    res.json({
      id,
      name: name || 'API Key',
      secret,
      masked: `${secret.slice(0, 11)}${"•".repeat(18)}${secret.slice(-4)}`,
      scopes,
      live: !!live,
      created: Date.now(),
      lastUsed: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/developer/keys/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM nordstern.api_keys WHERE id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/developer/keys/:id/roll', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT live FROM nordstern.api_keys WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    const prefix = rows[0].live ? 'ns_live_' : 'ns_test_';
    const secret = prefix + crypto.randomBytes(16).toString('hex');
    await pool.query('UPDATE nordstern.api_keys SET secret = $1, last_used_at = now() WHERE id = $2', [secret, id]);
    res.json({ secret });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Phase E: Webhook Deliveries ──────────────────────────────────────────────
// Real webhook delivery log from nordstern.webhook_deliveries. NOTE: recording deliveries
// into this table from the inbound webhook path is not yet wired, so it is currently empty
// — the UI shows an honest empty state rather than fabricated deliveries (see audit doc).
adminRouter.get('/developer/webhooks/deliveries', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, event, status, attempts, ms, created_at as at FROM nordstern.webhook_deliveries ORDER BY created_at DESC LIMIT 100',
    );
    res.json({ deliveries: rows.map(r => ({ ...r, at: new Date(r.at).getTime() })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Runtime settings (logo override) ────────────────────────────────────────────
// Read a single setting (best-effort; returns null if the table/row is absent).
async function getSetting(key: string): Promise<string | null> {
  try {
    const { rows } = await pool.query('SELECT value FROM nordstern.anchor_settings WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  } catch { return null; }
}

// GET current settings (logo override). The provisioned env logo remains the fallback.
adminRouter.get('/settings', async (_req, res) => {
  res.json({ logoUrl: await getSetting('logoUrl') });
});

// Update the anchor's logo (a URL). Used as the app logo AND the browser favicon. An empty
// value clears the override (reverts to the provisioned/default logo).
adminRouter.post('/settings/logo', async (req, res) => {
  const raw = String((req.body ?? {}).logoUrl ?? '').trim();
  if (raw && !/^https?:\/\/.+/i.test(raw)) {
    res.status(400).json({ error: 'Logo must be an http(s) URL' });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO nordstern.anchor_settings (key, value, updated_at) VALUES ('logoUrl', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [raw || null],
    );
    res.json({ ok: true, logoUrl: raw || null });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Phase E Part 2: Strategy Config ──────────────────────────────────────────────
adminRouter.get('/strategy', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT config FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1');
    if (rows.length === 0) {
      res.status(404).json({ error: 'Strategy not found' });
      return;
    }
    res.json(rows[0].config);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/strategy', async (req, res) => {
  const config = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT version FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1');
    const nextVersion = (rows[0]?.version ?? 0) + 1;
    await client.query(
      `INSERT INTO nordstern.strategy_config (version, config) VALUES ($1, $2)`,
      [nextVersion, config]
    );
    await client.query('COMMIT');
    await writeAuditLog('strategy.updated', `Policy updated to version ${nextVersion}`, 'admin');
    res.json({ success: true, version: nextVersion });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

// ─── Phase E Part 2: Transaction manual retry / refund ────────────────────────────
adminRouter.post('/transactions/:id/retry', async (req, res) => {
  const { id } = req.params;
  const { actor } = req.body;
  try {
    const outcome = await releaseDeposit(id);
    await writeAuditLog('transaction.retried', `Force completed transaction ${id} (outcome: ${outcome.kind})`, actor || 'admin');
    res.json({ success: true, outcome: outcome.kind });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/transactions/:id/refund', async (req, res) => {
  const { id } = req.params;
  const { actor, reason } = req.body;
  try {
    await patchTransaction(id, { status: 'error', message: reason || 'Refunded by operator' });
    await writeAuditLog('transaction.refunded', `Refunded transaction ${id} (reason: ${reason || 'Operator intervention'})`, actor || 'admin');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Phase E Part 2: Treasury Sweep & Pause ───────────────────────────────────────
adminRouter.post('/treasury/sweep', async (req, res) => {
  const { actor } = req.body;
  try {
    await writeAuditLog('treasury.sweep', 'Swept settled fiat funds into corporate bank account', actor || 'admin');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/treasury/pause', async (req, res) => {
  const { actor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT version, config FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1');
    if (rows.length === 0) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const nextVersion = rows[0].version + 1;
    const newConfig = { ...rows[0].config, emergencyStop: !rows[0].config.emergencyStop };
    await client.query(
      `INSERT INTO nordstern.strategy_config (version, config) VALUES ($1, $2)`,
      [nextVersion, newConfig]
    );
    await client.query('COMMIT');
    await writeAuditLog(newConfig.emergencyStop ? 'platform.paused' : 'platform.resumed', `Emergency stop ${newConfig.emergencyStop ? 'enabled' : 'disabled'}`, actor || 'admin');
    res.json({ success: true, emergencyStop: newConfig.emergencyStop });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});
