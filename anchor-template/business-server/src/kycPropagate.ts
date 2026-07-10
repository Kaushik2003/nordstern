import { NORDSTERN_API_URL, SERVICE_SECRET } from './config.js';

// After a DIDIT decision lands on this anchor (server-side truth in nordstern.kyc_verifications),
// propagate it to the CENTRAL customer profile in platform-api so identity is "verify once,
// reuse across anchors". This is a trusted backend→backend call authenticated by the shared
// SERVICE_SECRET — the customer client can never set its own KYC status. Best-effort: the
// anchor already holds the authoritative record, so a transient platform outage never loses
// the decision (it can be re-synced), and we never fail the DIDIT webhook because of it.

type PlatformKyc = 'unverified' | 'pending' | 'approved' | 'declined';

// DIDIT status strings → central customer KYC status.
function mapStatus(raw: string | undefined): PlatformKyc {
  const s = String(raw ?? '').toLowerCase();
  if (/approv|accept|verified/.test(s)) return 'approved';
  if (/declin|reject|fail|abandon/.test(s)) return 'declined';
  if (/review|pending|progress|process/.test(s)) return 'pending';
  return 'pending';
}

// The DIDIT webhook body carries the vendor reference and a status. The reference is either
// a customerId (customer-app KYC flow) or a Stellar account (legacy SEP-24 webview flow); the
// central profile is resolved by whichever it is.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pull the verified full name + country out of a DIDIT decision, tolerant of both the v3
// plural arrays (id_verifications[]/ip_analyses[]) and v2 singular objects. Returns undefined
// fields when absent — the platform fills identity only when values are present AND empty.
function extractIdentity(body: Record<string, any>): { fullName?: string; country?: string } {
  const d = body?.decision ?? body;
  const idv = d?.id_verifications?.[0] ?? d?.id_verification ?? {};
  const ip = d?.ip_analyses?.[0] ?? d?.ip_analysis ?? {};
  const name = [idv.first_name, idv.last_name].filter(Boolean).join(' ').trim();
  const country = idv.nationality ?? idv.issuing_state ?? ip.country ?? ip.ip_country_code ?? ip.ip_country;
  return {
    fullName: name || undefined,
    country: typeof country === 'string' && country ? country : undefined,
  };
}

export async function propagateKycToPlatform(body: Record<string, any>): Promise<void> {
  if (!NORDSTERN_API_URL || !SERVICE_SECRET) return; // not wired (standalone dev) — skip quietly
  const ref = body?.vendor_data ?? body?.session?.vendor_data;
  const status = mapStatus(body?.status ?? body?.session?.status ?? body?.decision?.status);
  if (!ref) return;
  const identity = status === 'approved' ? extractIdentity(body) : {};
  const base = UUID_RE.test(ref) ? { customerId: ref, status } : { walletAddress: ref, status };
  const payload = { ...base, ...identity };
  try {
    const res = await fetch(`${NORDSTERN_API_URL}/api/v1/internal/customers/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-secret': SERVICE_SECRET },
      body: JSON.stringify(payload),
    });
    // 404 = that account isn't linked to any central customer (e.g. a wallet-only user); fine.
    if (!res.ok && res.status !== 404) {
      console.warn(`[kyc-propagate] platform returned ${res.status} for ${ref}`);
    }
  } catch (err) {
    console.warn('[kyc-propagate] platform unreachable:', err instanceof Error ? err.message : err);
  }
}
