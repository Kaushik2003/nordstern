'use client';

// Lightweight client-side transaction history. SEP-24 has no per-account list endpoint
// in our API, so we remember the transactions THIS browser initiated (id + kind + when)
// and refresh each one's live status via the existing getTransaction call. Purely
// additive — no API or backend change. Scoped per wallet address.

export interface TxRef {
  id: string;
  kind: 'deposit' | 'withdraw';
  amount: string;
  startedAt: number;
}

const key = (address: string) => `ns.tx.${address}`;

export function recordTx(address: string, ref: TxRef) {
  if (typeof window === 'undefined') return;
  const list = loadTxs(address).filter((t) => t.id !== ref.id);
  list.unshift(ref);
  localStorage.setItem(key(address), JSON.stringify(list.slice(0, 25)));
}

export function loadTxs(address: string): TxRef[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key(address)) ?? '[]') as TxRef[];
  } catch {
    return [];
  }
}
