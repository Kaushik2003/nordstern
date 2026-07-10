import { PLATFORM_API_URL } from './config.js';

// ─── Platform API helpers ─────────────────────────────────────────────────────
// Transaction state is authoritative in the Anchor Platform DB. We read it and
// advance it via the Platform API (port 8085). Never treat money moves as
// synchronous — drive them by status transitions.

export async function fetchTransaction(id: string): Promise<Record<string, any>> {
  const res = await fetch(`${PLATFORM_API_URL}/transactions/${id}`);
  if (!res.ok) throw new Error(`Platform GET ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function patchTransaction(id: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PLATFORM_API_URL}/transactions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ transaction: { id, ...fields } }] }),
  });
  if (!res.ok) throw new Error(`Platform PATCH ${res.status}: ${await res.text()}`);
}

export async function listTransactions(params: Record<string, string>): Promise<any[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${PLATFORM_API_URL}/transactions?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.records ?? [];
}
