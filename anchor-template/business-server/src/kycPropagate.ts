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

// The DIDIT webhook body carries the vendor reference (the Stellar account we KYC'd) and a
// status. The central customer is resolved by the linked wallet address on the platform side.
export async function propagateKycToPlatform(body: Record<string, any>): Promise<void> {
  if (!NORDSTERN_API_URL || !SERVICE_SECRET) return; // not wired (standalone dev) — skip quietly
  const account = body?.vendor_data ?? body?.session?.vendor_data;
  const status = mapStatus(body?.status ?? body?.session?.status ?? body?.decision?.status);
  if (!account) return;
  try {
    const res = await fetch(`${NORDSTERN_API_URL}/api/v1/internal/customers/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-secret': SERVICE_SECRET },
      body: JSON.stringify({ walletAddress: account, status }),
    });
    // 404 = that account isn't linked to any central customer (e.g. a wallet-only user); fine.
    if (!res.ok && res.status !== 404) {
      console.warn(`[kyc-propagate] platform returned ${res.status} for ${account}`);
    }
  } catch (err) {
    console.warn('[kyc-propagate] platform unreachable:', err instanceof Error ? err.message : err);
  }
}
