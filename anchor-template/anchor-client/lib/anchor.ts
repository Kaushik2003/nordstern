import { initiateSep24, getTransaction } from '@/lib/api';
import type { SettlementSession } from '@/lib/settlement';

// Customer-facing money operations, all over the /biz proxy → this anchor's business-server.
// Blockchain terms never surface here; callers speak in "buy / sell / amount / status".

export interface Quote { assetCode: string; inrPerUnit: string; assetAmount?: string; inrAmount?: string; source: string }

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
  // Technical (collapsed under "Advanced details" in the UI):
  rawStatus: string;
  stellarId: string | null;
  destination: string | null;
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
