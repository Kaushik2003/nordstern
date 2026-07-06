import { Router } from 'express';
import { listTransactions } from './platform.js';
import { getTreasuryBalances } from './stellar.js';
import { ASSET_CODE, ASSET_ISSUER_PUBLIC, TREASURY_PUBLIC, IS_MAINNET, assetId } from './config.js';
import { rate } from './adapters/index.js';

// ─── Admin API (operator dashboard) ────────────────────────────────────────────
// Read-only, live data for the Next.js dashboard: treasury float, transaction
// ledger, and roll-ups. Reads from the Platform API + Horizon (state stays
// authoritative in the Platform DB). Not authenticated yet — same-origin dev only;
// real auth/API-keys are a Phase E/F concern.

export const adminRouter = Router();

const num = (a: any) => Number(a?.amount ?? 0);

function normalize(tx: Record<string, any>) {
  return {
    id: tx.id,
    kind: tx.kind,
    status: tx.status,
    amountIn: tx.amount_in ?? null,
    amountOut: tx.amount_out ?? null,
    amountExpected: tx.amount_expected ?? null,
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
    const deposits = txs.filter((t) => t.kind === 'deposit');
    const withdrawals = txs.filter((t) => t.kind === 'withdrawal');
    const pending = txs.filter((t) => !['completed', 'error', 'refunded'].includes(t.status));

    res.json({
      network: IS_MAINNET ? 'mainnet' : 'testnet',
      asset: { code: ASSET_CODE, issuer: ASSET_ISSUER_PUBLIC, id: assetId() },
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
        inrCollected: deposits.filter(completed).reduce((s, t) => s + num(t.amountIn), 0).toFixed(2),
        usdcDeposited: deposits.filter(completed).reduce((s, t) => s + num(t.amountOut), 0).toFixed(2),
        // Withdrawal (off-ramp): USDC in → INR out.
        usdcWithdrawn: withdrawals.filter(completed).reduce((s, t) => s + num(t.amountIn), 0).toFixed(2),
        inrPaidOut: withdrawals.filter(completed).reduce((s, t) => s + num(t.amountOut), 0).toFixed(2),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/users', async (_req, res) => {
  try {
    const records = await listTransactions({ sep: '24', order: 'desc' });
    
    // Group transactions by the authenticated user's Stellar account
    const usersMap = new Map<string, any>();

    for (const tx of records) {
      // Find the best identifier for the user (SEP-10 account, sender, or destination)
      const account = tx.sep10_account ?? tx.customers?.sender?.account ?? tx.destination_account;
      if (!account) continue;

      const txAmount = Number(tx.amount_expected?.amount ?? tx.amount_in?.amount ?? tx.amount_out?.amount ?? 0);
      const isCompleted = tx.status === 'completed';

      if (!usersMap.has(account)) {
        usersMap.set(account, {
          id: account,
          name: `User ${account.slice(0, 4)}...${account.slice(-4)}`,
          initials: 'U',
          email: `${account.slice(0, 8)}@example.com`,
          phone: '+91 ••••• ••••',
          city: 'Unknown',
          state: 'Unknown',
          lat: 0,
          lng: 0,
          status: 'verified', // Mock KYC status
          tier: 'T1', // Mock tier
          risk: 'low',
          riskFactors: [],
          lifetimeVolume: 0,
          txCount: 0,
          lastSeen: tx.started_at ? new Date(tx.started_at).getTime() : Date.now(),
          joined: tx.started_at ? new Date(tx.started_at).getTime() : Date.now(),
          address: 'Stellar Network',
          matchScore: 98,
          source: 'Testnet',
          verifiedAcross: 1,
        });
      }

      const user = usersMap.get(account);
      user.txCount += 1;
      
      if (isCompleted) {
        user.lifetimeVolume += txAmount;
      }
      
      // Update lastSeen if this tx is newer
      const txTime = tx.started_at ? new Date(tx.started_at).getTime() : Date.now();
      if (txTime > user.lastSeen) {
        user.lastSeen = txTime;
      }

      // Dynamically adjust mock tier and risk based on volume for visual variety
      if (user.lifetimeVolume > 5000) {
        user.tier = 'T2';
      }
      if (user.lifetimeVolume > 15000) {
        user.risk = 'med';
      }
    }

    const users = Array.from(usersMap.values()).sort((a, b) => b.lastSeen - a.lastSeen);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
