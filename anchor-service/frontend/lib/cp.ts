'use client';

// ── Token + selected-anchor helpers ────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_token');
}

export function setToken(t: string) { localStorage.setItem('cp_token', t); }
export function clearToken()        { localStorage.removeItem('cp_token'); localStorage.removeItem('cp_anchor_id'); }
export function isLoggedIn()        { return !!getToken(); }

// An operator owns many anchors; the console works against a "selected" one.
export function setSelectedAnchor(id: string) { localStorage.setItem('cp_anchor_id', id); }
export function getSelectedAnchor(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_anchor_id');
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`/cp${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error ?? 'Request failed');
  return json as T;
}

// ── Types ───────────────────────────────────────────────────────────────────

export type StackStatus = 'pending' | 'provisioning' | 'active' | 'error' | 'suspended' | 'removed';

export interface Keypair {
  role: 'signing' | 'distribution' | 'issuer';
  public_key: string;
}

export interface AnchorAdapters {
  kyc_provider: string;
  deposit_provider: string;
  payout_provider: string;
  fee_provider: string;
}

export interface Anchor {
  id: string;
  name: string;
  slug: string;
  status: string;
  stack_status: StackStatus;
  status_detail?: string;
  network: string;
  home_domain?: string;
  asset_code?: string;
  asset_issuer?: string;
  fiat_balance?: string;
  onchain_balance?: string | null;
  keypairs?: Keypair[];
  adapters?: AnchorAdapters;
  kyc_provider?: string;
  deposit_provider?: string;
  payout_provider?: string;
  fee_provider?: string;
  active_alerts?: number;
  owner_email?: string;
  created_at?: string;
}

/** @deprecated use Anchor */
export type Tenant = Anchor;

export interface TenantConfig {
  min_deposit: number;
  max_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
  daily_limit: number;
  deposit_fee_pct: number;
  withdrawal_fee_pct: number;
  fiat_method_name: string;
  fiat_bank_name: string;
  fiat_account_number: string;
  fiat_routing_number: string;
  settlement_days: number;
  alert_mismatch_pct: number;
  alert_large_tx: number;
  webhook_url: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface Alert {
  id: string;
  fiat_balance: string;
  onchain_balance: string;
  delta: string;
  created_at: string;
}

// ── Auth (operator only — no auto-anchor) ──────────────────────────────────────

export async function register(email: string, password: string) {
  const data = await call<{ token: string; user: AuthUser }>('POST', '/auth/register', { email, password });
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await call<{ token: string; user: AuthUser }>('POST', '/auth/login', { email, password });
  setToken(data.token);
  return data;
}

// ── Anchors ─────────────────────────────────────────────────────────────────

export interface AdapterChoice { kyc?: string; deposit?: string; payout?: string; fee?: string }

export function listAnchors()                 { return call<Anchor[]>('GET', '/anchors'); }
export function createAnchor(name: string, adapters?: AdapterChoice) {
  return call<Anchor>('POST', '/anchors', { name, adapters });
}
export function getAnchor(id: string)          { return call<Anchor>('GET', `/anchors/${id}`); }
export function getAnchorStatus(id: string)    { return call<{ stack_status: StackStatus; status_detail?: string; home_domain?: string }>('GET', `/anchors/${id}/status`); }
export function provisionAnchor(id: string)    { return call<{ message: string; slug: string }>('POST', `/anchors/${id}/provision`); }
export function teardownAnchor(id: string)     { return call<{ ok: boolean }>('DELETE', `/anchors/${id}`); }

// ── Config (per anchor) ────────────────────────────────────────────────────────

export function getConfig(anchorId: string)                        { return call<TenantConfig>('GET', `/config/${anchorId}`); }
export function saveConfig(anchorId: string, cfg: Partial<TenantConfig>) { return call<{ ok: boolean }>('PUT', `/config/${anchorId}`, cfg); }
export function getAlerts(anchorId: string)                        { return call<Alert[]>('GET', `/config/${anchorId}/alerts`); }
export function injectAlert(anchorId: string)                      { return call<{ ok: boolean }>('POST', `/config/${anchorId}/alerts/inject`); }
export function resolveAlert(anchorId: string, id: string)         { return call<{ ok: boolean }>('POST', `/config/${anchorId}/alerts/${id}/resolve`); }

// ── Admin (platform-admin) ─────────────────────────────────────────────────────

export function adminGetAnchors() {
  return call<(Anchor & { owner_email: string; active_alerts: number })[]>('GET', '/admin/anchors');
}
