'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types (mirror the business-server /admin API) ──────────────────────────────
export interface Amount { amount: string; asset: string; }

export interface Tx {
  id: string;
  kind: 'deposit' | 'withdrawal';
  status: string;
  amountIn: Amount | null;
  amountOut: Amount | null;
  amountExpected: Amount | null;
  memo: string | null;
  destination: string | null;
  stellarTx: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface Summary {
  network: string;
  asset: { code: string; issuer: string; id: string };
  treasury: { address: string; usdc: string | null; xlm: string | null };
  rate: { inrPerUsdc: string; source: string; asOf: string };
  counts: { total: number; deposits: number; withdrawals: number; completed: number; pending: number };
  volume: { inrCollected: string; usdcDeposited: string; usdcWithdrawn: string; inrPaidOut: string };
}

// ─── Live polling hook ──────────────────────────────────────────────────────────
// Fetches through the /biz proxy (→ business-server admin API) every `ms`.
export function useLive<T>(path: string, ms = 5000): { data: T | null; error: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/biz${path}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (alive) { setData(json); setError(null); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'error');
      } finally {
        if (alive) setLoading(false);
      }
    };
    tick();
    timer.current = setInterval(tick, ms);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, [path, ms]);

  return { data, error, loading };
}

// ─── Formatting ─────────────────────────────────────────────────────────────────
export function fmtAsset(a: Amount | null): string {
  if (!a) return '—';
  const n = Number(a.amount);
  if (a.asset.startsWith('iso4217:INR')) return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (a.asset.includes('USDC')) return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`;
  return `${a.amount} ${a.asset.split(':')[1] ?? ''}`.trim();
}

export function fmtNum(v: string | null, opts?: Intl.NumberFormatOptions): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2, ...opts });
}

export function shortKey(k: string | null, n = 4): string {
  if (!k) return '—';
  return k.length > n * 2 ? `${k.slice(0, n)}…${k.slice(-n)}` : k;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
