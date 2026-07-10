import type { BadgeTone } from '@/components/ui/badge';

// ─── Money & time formatting (one source of truth) ──────────────────────────────
export const num = (v: string | number | null | undefined, dp = 2): string =>
  v == null || v === '' ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp });

export const inr = (v: string | number | null | undefined): string =>
  v == null || v === '' ? '—' : `₹${num(v)}`;

export const usdc = (v: string | number | null | undefined): string =>
  v == null || v === '' ? '—' : `${num(v)} USDC`;

export const dateTime = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// "just now", "3m ago", "2h ago", "5d ago" — for the live activity feed.
export function relativeTime(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const shortId = (id: string | null | undefined, n = 8): string =>
  id ? (id.length > n * 2 ? `${id.slice(0, n)}…${id.slice(-4)}` : id) : '—';

// ─── Transaction status → tone + human label ────────────────────────────────────
// The Anchor Platform SEP-24 status vocabulary, mapped to the console's semantic tones
// so "is this transaction healthy?" is answerable at a glance in every module.
export function txStatus(status: string): { tone: BadgeTone; label: string; stuck: boolean } {
  const s = status.toLowerCase();
  if (s === 'completed') return { tone: 'success', label: 'Completed', stuck: false };
  if (s === 'refunded') return { tone: 'neutral', label: 'Refunded', stuck: false };
  if (s === 'error') return { tone: 'danger', label: 'Error', stuck: true };
  if (s === 'expired') return { tone: 'danger', label: 'Expired', stuck: true };
  if (s.startsWith('pending_user')) return { tone: 'warning', label: 'Awaiting user', stuck: false };
  if (s.startsWith('pending_anchor')) return { tone: 'info', label: 'Processing', stuck: false };
  if (s.startsWith('pending')) return { tone: 'info', label: 'Processing', stuck: false };
  if (s === 'incomplete') return { tone: 'neutral', label: 'Incomplete', stuck: false };
  return { tone: 'neutral', label: status, stuck: false };
}

// Health string ("up"/"down"/percentage) → tone.
export function healthTone(v: string | null | undefined): BadgeTone {
  if (!v) return 'neutral';
  const s = String(v).toLowerCase();
  if (s === 'up' || s === 'ok' || s === 'healthy' || s.startsWith('100') || s.startsWith('99')) return 'success';
  if (s === 'down' || s === 'error' || s === 'unhealthy') return 'danger';
  return 'warning';
}
