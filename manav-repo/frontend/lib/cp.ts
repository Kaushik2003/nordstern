'use client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cp_token');
}

export function setToken(t: string) { localStorage.setItem('cp_token', t); }
export function clearToken()        { localStorage.removeItem('cp_token'); }
export function isLoggedIn()        { return !!getToken(); }

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
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'funding' | 'active' | 'error';
  network: string;
  fiat_balance: string;
  onchain_balance: string | null;
  keypairs: Keypair[] | null;
}

export interface Keypair {
  role: 'signing' | 'distribution' | 'issuer';
  public_key: string;
}

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
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  network: string;
}

export interface Alert {
  id: string;
  fiat_balance: string;
  onchain_balance: string;
  delta: string;
  created_at: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string, network: string) {
  const data = await call<{ token: string; user: AuthUser }>('POST', '/auth/register', { name, email, password, network });
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await call<{ token: string; user: AuthUser }>('POST', '/auth/login', { email, password });
  setToken(data.token);
  return data;
}

// ── Tenant ────────────────────────────────────────────────────────────────────

export function getTenant()                        { return call<Tenant>('GET', '/tenants/me'); }
export function getTenantStatus(id: string)        { return call<{ status: string; keypairs: Keypair[] }>('GET', `/tenants/${id}/status`); }
export function provision(id: string)              { return call<{ accounts: Record<string, string> }>('POST', `/tenants/${id}/provision`); }

// ── Config ────────────────────────────────────────────────────────────────────

export function getConfig()                        { return call<TenantConfig>('GET', '/config'); }
export function saveConfig(cfg: Partial<TenantConfig>) { return call<{ ok: boolean }>('PUT', '/config', cfg); }
export function getAlerts()                        { return call<Alert[]>('GET', '/config/alerts'); }
export function injectAlert()                      { return call<{ ok: boolean }>('POST', '/config/alerts/inject'); }
export function resolveAlert(id: string)           { return call<{ ok: boolean }>('POST', `/config/alerts/${id}/resolve`); }

// ── Admin ─────────────────────────────────────────────────────────────────────

export function adminGetTenants() {
  return call<(Tenant & { user_count: number; active_alerts: number })[]>('GET', '/admin/tenants');
}
