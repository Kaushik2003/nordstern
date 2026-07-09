import { initiateSep24, getTransaction, buildPaymentXdr, submitXdr } from '@/lib/api';
import { signTransaction } from '@/lib/freighter';
import type { SettlementSession } from '@/lib/settlement';

// Customer-facing money operations, all over the /biz proxy → this anchor's business-server.
// Blockchain terms never surface here; callers speak in "buy / sell / amount / status".

export interface Quote { assetCode: string; inrPerUnit: string; assetAmount?: string; inrAmount?: string; source: string; minAmount?: number | null; maxAmount?: number | null }

export async function getQuote(amount: number, side: 'buy' | 'sell'): Promise<Quote> {
  const r = await fetch(`/biz/api/quote?amount=${amount}&side=${side}`);
  if (!r.ok) throw new Error('Could not fetch price');
  return r.json();
}

// Start a buy (on-ramp): the wallet has already authorised (session). Returns the anchor
// transaction id + the payment handoff URL for the fiat step.
export async function startBuy(session: SettlementSession, amount: string, assetCode: string): Promise<{ id: string; paymentUrl: string }> {
  const r = await initiateSep24('deposit', amount, session.token, assetCode);
  return { id: r.id, paymentUrl: r.url };
}

export async function startSell(session: SettlementSession, amount: string, assetCode: string): Promise<{ id: string; instructionsUrl: string }> {
  const r = await initiateSep24('withdraw', amount, session.token, assetCode);
  return { id: r.id, instructionsUrl: r.url };
}

// ── Customer-language transaction view ──────────────────────────────────────────
export type Phase = 'awaiting_payment' | 'payment_received' | 'processing' | 'completing' | 'completed' | 'failed' | 'refunded';

export interface CustomerTx {
  id: string;
  kind: 'buy' | 'sell';
  phase: Phase;
  assetAmount: string | null;
  inrAmount: string | null;
  createdAt: string | null;
  completedAt: string | null;
  reference: string | null;   // customer-facing reference
  payoutReference?: string | null;   // sell only: bank UTR / PSP payout id
  assetCode?: string;
  // Technical (collapsed under "Advanced details" in the UI):
  rawStatus: string;
  stellarId: string | null;
  destination: string | null;
}

// ── Customer-scoped, session-authenticated (no wallet signing needed) ────────────
// History + a single transaction for THIS anchor, scoped to the signed-in customer's
// linked wallets by the business-server (ns_customer cookie flows through /biz).
export async function myTransactions(): Promise<CustomerTx[]> {
  const r = await fetch('/biz/customer/transactions', { credentials: 'include' });
  if (!r.ok) throw new Error('Could not load your activity');
  const body = (await r.json()) as { transactions: CustomerTx[] };
  return body.transactions;
}

// Where to send the asset for a withdrawal (native "click to send").
export async function withdrawInstructions(txId: string): Promise<{ treasury: string; memo: string; assetCode: string }> {
  const r = await fetch(`/biz/customer/withdraw/${txId}`, { credentials: 'include' });
  if (!r.ok) throw new Error('Could not load transfer details');
  return r.json();
}

// Native send: build the asset payment to the treasury with the required memo, sign it in the
// customer's wallet (the "secure confirmation"), and submit. Returns the Stellar tx hash. The
// anchor's Observer then detects it by memo and pays out — the caller just polls status.
export async function sendWithdrawal(from: string, treasury: string, amount: string, memo: string): Promise<string> {
  const xdr = await buildPaymentXdr(from, treasury, amount, memo);
  const signed = await signTransaction(xdr);
  return submitXdr(signed);
}

export async function myTransaction(id: string): Promise<CustomerTx | null> {
  const r = await fetch(`/biz/customer/transactions/${id}`, { credentials: 'include' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Could not load this transaction');
  return r.json();
}

// Start identity verification (DIDIT), tied to the customer identity server-side. Returns
// the hosted verification URL. The client never sets its own status.
export async function startKyc(returnUrl: string): Promise<{ url: string }> {
  const r = await fetch('/biz/customer/kyc/start', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl }),
  });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error ?? 'Could not start verification'); }
  return r.json();
}

// Map the SEP-24 status vocabulary to friendly customer phases. Only real statuses.
function toPhase(kind: 'buy' | 'sell', status: string): Phase {
  const s = status.toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'refunded') return 'refunded';
  if (s === 'error' || s === 'expired') return 'failed';
  if (s === 'pending_stellar') return 'completing';
  if (s === 'pending_anchor' || s === 'pending_external') return 'processing';
  if (s.startsWith('pending_user')) return 'awaiting_payment';
  if (s === 'incomplete') return 'awaiting_payment';
  return 'processing';
}

const amt = (a: any): string | null => (a && a.amount != null ? String(a.amount) : null);

export async function getTx(id: string, token: string): Promise<CustomerTx | null> {
  const tx = await getTransaction(id, token);
  if (!tx) return null;
  const kind: 'buy' | 'sell' = tx.kind === 'withdrawal' ? 'sell' : 'buy';
  return {
    id: tx.id,
    kind,
    phase: toPhase(kind, String(tx.status ?? '')),
    assetAmount: amt(tx.amount_out) ?? amt(tx.amount_expected) ?? amt(tx.amount_in),
    inrAmount: amt(tx.amount_in),
    createdAt: tx.started_at ?? null,
    completedAt: tx.completed_at ?? null,
    reference: (tx.id ?? '').slice(0, 8).toUpperCase() || null,
    rawStatus: String(tx.status ?? ''),
    stellarId: tx.stellar_transactions?.[0]?.id ?? null,
    destination: tx.destination_account ?? null,
  };
}
