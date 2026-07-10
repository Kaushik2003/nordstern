import { pool } from '../../db.js';
import {
  DIDIT_API_KEY, DIDIT_WORKFLOW_ID, PUBLIC_BASE_URL, KYC_REVERIFY_TTL_SECONDS,
  NORDSTERN_API_URL, SERVICE_SECRET,
} from '../../config.js';
import { KycProvider, CustomerQuery, CustomerResult, KycStatus, KycSessionResult } from './KycProvider.js';
import { propagateKycToPlatform } from '../../kycPropagate.js';

// ─── DIDIT KYC ──────────────────────────────────────────────────────────────────
// Real identity verification (document OCR + passive liveness + face match) via
// DIDIT's hosted flow, embedded as an iframe inside the SEP-24 webview. This module
// is the SPINE — the SEP-24 gate and the webhook call it directly. It is backed by
// the durable store (db.ts), keyed on `vendor_data` = the user's SEP-10 account, so:
//   • a returning, still-valid user skips KYC entirely, and
//   • an expired record (past KYC_REVERIFY_TTL_SECONDS, or a "Kyc Expired" webhook)
//     forces re-verification.
// The webhook is the SOURCE OF TRUTH for the decision; the iframe finishing is a UI
// hint only. We persist the verification OUTCOME only — never raw PAN/document data
// (COMPLIANCE — minimal PII).

const DIDIT_BASE = 'https://verification.didit.me';

export interface SessionResult {
  url: string;
  sessionToken: string;   // web ignores this; the native mobile SDK will use it later
  status: KycStatus;
}

// Map DIDIT's (case-sensitive) session status strings → our KycStatus.
function mapStatus(diditStatus: string): KycStatus {
  switch (diditStatus) {
    case 'Approved':    return 'ACCEPTED';
    case 'Declined':    return 'REJECTED';
    case 'In Review':
    case 'In Progress':
    case 'Not Started':
    case 'Awaiting User':
    case 'Resubmitted':  return 'PROCESSING';
    case 'Expired':
    case 'Abandoned':
    case 'Kyc Expired':  return 'NEEDS_INFO';
    default:             return 'PROCESSING';
  }
}

// Redacted outcome pulled from the V3 plural decision arrays (index 0 per module).
// Name + document_type + per-check pass/fail only — no raw document numbers/images.
function summarizeDecision(decision: any): Record<string, unknown> | null {
  if (!decision || typeof decision !== 'object') return null;
  // v3 webhooks / GET decision expose plural arrays; v2 webhooks use singular objects.
  const id       = decision.id_verifications?.[0] ?? decision.id_verification;
  const liveness = decision.liveness_checks?.[0]  ?? decision.liveness;
  const face     = decision.face_matches?.[0]     ?? decision.face_match;
  const ip       = decision.ip_analyses?.[0]      ?? decision.ip_analysis;
  return {
    id_verification: id ? {
      status: id.status, document_type: id.document_type,
      first_name: id.first_name, last_name: id.last_name, issuing_state: id.issuing_state,
    } : null,
    liveness:  liveness ? { status: liveness.status, score: liveness.score } : null,
    face_match: face ? { status: face.status, score: face.score } : null,
    ip_analysis: ip ? {
      status: ip.status,
      country: ip.country ?? ip.ip_country_code ?? ip.ip_country,
      vpn: ip.vpn ?? ip.is_vpn_or_tor,
      proxy: ip.proxy ?? ip.is_data_center,
    } : null,
  };
}

// A minimal queryable — the shared pool OR a checked-out client inside a transaction.
// Lets persistDecision run either standalone (API poll) or inside applyWebhook's tx.
interface Queryable { query: (text: string, params?: any[]) => Promise<any>; }

// Persist a DIDIT session decision (from a webhook OR an API poll) → our KycStatus.
// Extracted so both delivery paths converge on identical DB state. `db` defaults to
// the pool; the webhook path passes a transaction client so the dedupe insert and
// this upsert commit atomically.
async function persistDecision(
  account: string,
  diditStatus: string,
  sessionId: string | null,
  decision: any,
  db: Queryable = pool,
): Promise<KycStatus> {
  const status = mapStatus(diditStatus);
  const summary = summarizeDecision(decision);

  if (diditStatus === 'Approved') {
    const verifiedAt = new Date();
    const expiresAt  = new Date(verifiedAt.getTime() + KYC_REVERIFY_TTL_SECONDS * 1000);
    await db.query(
      `INSERT INTO nordstern.kyc_verifications
         (vendor_data, status, didit_session_id, decision_summary, verified_at, expires_at, updated_at)
       VALUES ($1, 'ACCEPTED', $2, $3, $4, $5, now())
       ON CONFLICT (vendor_data) DO UPDATE SET
         status = 'ACCEPTED',
         didit_session_id = COALESCE(EXCLUDED.didit_session_id, nordstern.kyc_verifications.didit_session_id),
         decision_summary = EXCLUDED.decision_summary, verified_at = EXCLUDED.verified_at,
         expires_at = EXCLUDED.expires_at, updated_at = now()`,
      [account, sessionId, summary, verifiedAt, expiresAt],
    );
  } else if (diditStatus === 'Kyc Expired') {
    await db.query(
      `UPDATE nordstern.kyc_verifications
         SET status = 'NEEDS_INFO', expires_at = now(), updated_at = now()
       WHERE vendor_data = $1`,
      [account],
    );
  } else {
    await db.query(
      `INSERT INTO nordstern.kyc_verifications (vendor_data, status, didit_session_id, decision_summary, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (vendor_data) DO UPDATE SET
         status = EXCLUDED.status,
         didit_session_id = COALESCE(EXCLUDED.didit_session_id, nordstern.kyc_verifications.didit_session_id),
         decision_summary = COALESCE(EXCLUDED.decision_summary, nordstern.kyc_verifications.decision_summary),
         updated_at = now()`,
      [account, status, sessionId, summary],
    );
  }

  // Standalone (no central platform): mirror the decision into the anchor-local customers
  // table. In hosted mode (NORDSTERN_API_URL set) the central profile is updated via
  // propagateKycToPlatform instead, and these local tables don't exist — so skip.
  if (!NORDSTERN_API_URL) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let customerId: string | null = null;
    if (UUID_RE.test(account)) {
      customerId = account;
    } else if (/^[G][A-Z2-7]{55}$/.test(account)) {
      const custRes = await db.query(
        `SELECT customer_id FROM nordstern.customer_wallets WHERE address = $1`,
        [account]
      );
      if (custRes.rows[0]) {
        customerId = custRes.rows[0].customer_id;
      }
    }

    if (customerId) {
      const mappedKyc = status === 'ACCEPTED' ? 'approved' : (status === 'REJECTED' ? 'declined' : 'pending');
      await db.query(
        `UPDATE nordstern.customers 
         SET kyc_status = $1, didit_session_id = $2, didit_verified_at = $3, updated_at = now() 
         WHERE id = $4`,
        [mappedKyc, sessionId, diditStatus === 'Approved' ? new Date() : null, customerId]
      );
    }
  }

  return status;
}

// Best-effort pull of a session's live status + decision from DIDIT's API. The
// webhook is the intended source of truth, but this lets the gate resolve even when
// the callback can't be delivered (e.g. a network that blocks the webhook). Returns
// null on any error so callers fall back to the stored status.
async function fetchSessionStatus(sessionId: string): Promise<{ status: string; decision: any } | null> {
  try {
    const res = await fetch(`${DIDIT_BASE}/v3/session/${sessionId}/decision/`, {
      headers: { 'x-api-key': DIDIT_API_KEY },
    });
    if (!res.ok) { console.warn(`[didit] poll ${sessionId} → HTTP ${res.status}`); return null; }
    const body: any = await res.json();
    const status = body?.status ?? body?.session?.status;
    return status ? { status: String(status), decision: body?.decision ?? body } : null;
  } catch (e: any) {
    console.warn(`[didit] poll ${sessionId} failed: ${e?.message ?? e}`);
    return null;
  }
}

// "Verify once, reuse everywhere": before making an account do DIDIT, ask platform-api
// whether the CENTRAL customer who owns this wallet is already approved. If so, this anchor
// trusts that central decision — no second verification. Keyed on the wallet address, which
// the customer linked to their central profile when they connected it. Best-effort: any error
// / 404 (wallet not linked to a customer) → null → caller falls back to normal verification.
async function centralKycApproved(account: string): Promise<boolean> {
  if (!NORDSTERN_API_URL || !SERVICE_SECRET) return false;
  try {
    const res = await fetch(
      `${NORDSTERN_API_URL}/api/v1/internal/customers/kyc?walletAddress=${encodeURIComponent(account)}`,
      { headers: { 'x-service-secret': SERVICE_SECRET } },
    );
    if (!res.ok) return false;
    const body: any = await res.json();
    return body?.status === 'approved';
  } catch (e: any) {
    console.warn(`[didit] central KYC lookup failed for ${account}: ${e?.message ?? e}`);
    return false;
  }
}

// GET current verification status for an account, applying the TTL. An ACCEPTED
// record whose expires_at has passed is reported NEEDS_INFO → the gate re-shows.
export async function getStatus(account: string): Promise<KycStatus> {
  const { rows } = await pool.query(
    'SELECT status, expires_at, didit_session_id FROM nordstern.kyc_verifications WHERE vendor_data = $1',
    [account],
  );
  const rec = rows[0];

  // Locally ACCEPTED and unexpired → done, no lookup needed.
  const localAccepted =
    rec?.status === 'ACCEPTED' && !(rec.expires_at && new Date(rec.expires_at).getTime() <= Date.now());
  if (localAccepted) return 'ACCEPTED';

  // Not locally accepted (no row, PROCESSING, NEEDS_INFO, or an expired ACCEPTED) — reuse a
  // CENTRAL approval before ever sending the user through DIDIT again. This must run even when
  // a stale PROCESSING/NEEDS_INFO row exists (e.g. a session was opened on this account), or a
  // verified-once customer would be re-prompted. Cache it locally so the money-release path and
  // subsequent checks are fast and consistent.
  if (await centralKycApproved(account)) {
    await persistDecision(account, 'Approved', rec?.didit_session_id ?? null, null);
    console.log(`[didit] ${account} reused central KYC approval → ACCEPTED`);
    return 'ACCEPTED';
  }

  if (!rec) return 'NEEDS_INFO';

  // A previously-ACCEPTED record whose TTL has passed (and no central approval to reuse) →
  // re-verify. Return here so the poll/fall-through below can't report the stale 'ACCEPTED'.
  if (rec.status === 'ACCEPTED') return 'NEEDS_INFO';

  // PROCESSING → actively poll DIDIT so the gate resolves without depending on webhook
  // delivery. Only persist when the session has advanced past "processing"
  // (Approved/Declined/Expired); otherwise leave it PROCESSING and report as-is.
  if (rec.status === 'PROCESSING' && rec.didit_session_id && DIDIT_API_KEY) {
    const live = await fetchSessionStatus(rec.didit_session_id);
    if (live) {
      const mapped = mapStatus(live.status);
      if (mapped !== 'PROCESSING') {
        await persistDecision(account, live.status, rec.didit_session_id, live.decision);
        // #6: the poll path resolved a decision the webhook may never deliver (local dev, or
        // a dropped callback). In platform mode, propagate it to the CENTRAL customer profile
        // too — otherwise the app (which polls central KYC) hangs on "Finishing verification"
        // even though DIDIT approved. (Local mode already updates local customers in persist.)
        if (NORDSTERN_API_URL && SERVICE_SECRET) {
          // Include the decision so the central profile can seed verified name + country.
          await propagateKycToPlatform({ vendor_data: account, status: live.status, decision: live.decision });
        }
        console.log(`[didit] poll ${account}: ${live.status} → ${mapped}`);
        return mapped;
      }
    }
  }

  return rec.status as KycStatus;
}

// ─── Background KYC reconciler ──────────────────────────────────────────────────
// A single DIDIT account serves every anchor, and DIDIT delivers its decision webhook to ONE
// configured URL — so the callback can't reach a per-anchor subdomain (<slug>.nordstern.live),
// and PROCESSING sessions never advance. The customer app polls the CENTRAL profile, which only
// the webhook updates → "Finishing verification" hangs forever even though DIDIT approved.
// This reconciler makes KYC self-healing without webhooks: periodically re-run getStatus() for
// every PROCESSING session (getStatus polls DIDIT and, on a resolved decision, persists it AND
// propagates to the central customer). Applies to all anchors.
const KYC_RECONCILE_MS = 15000;

export async function reconcilePendingKyc(): Promise<void> {
  if (!DIDIT_API_KEY) return; // no real provider configured → nothing to poll
  const { rows } = await pool.query(
    `SELECT vendor_data FROM nordstern.kyc_verifications
     WHERE status = 'PROCESSING' AND didit_session_id IS NOT NULL
       AND updated_at > now() - interval '2 days'`,
  );
  for (const r of rows) {
    // getStatus() polls DIDIT for this session and, when it has advanced past PROCESSING,
    // persists the decision + propagates it to the central profile the app polls.
    await getStatus(r.vendor_data).catch((e) =>
      console.warn(`[kyc-reconcile] ${r.vendor_data}: ${e?.message ?? e}`),
    );
  }
}

export function startKycReconciler(): void {
  if (!DIDIT_API_KEY) return;
  console.log(`[kyc-reconcile] DIDIT session reconciler every ${KYC_RECONCILE_MS / 1000}s`);
  setInterval(() => { reconcilePendingKyc().catch(() => {}); }, KYC_RECONCILE_MS);
}

// Create (or reuse) a DIDIT session for an account. Reuses a still-open PROCESSING
// session URL so repeat clicks / reloads don't mint new sessions. Throws on API
// failure (e.g. 400 "not enough credits", 403 bad key) — the caller surfaces it.
export async function createSession(account: string, transactionId?: string, callbackOverride?: string): Promise<SessionResult> {
  const existing = await pool.query(
    'SELECT status, didit_session_url FROM nordstern.kyc_verifications WHERE vendor_data = $1',
    [account],
  );
  const prior = existing.rows[0];
  if (prior?.status === 'PROCESSING' && prior.didit_session_url) {
    return { url: prior.didit_session_url, sessionToken: '', status: 'PROCESSING' };
  }

  if (!DIDIT_API_KEY) throw new Error('DIDIT_API_KEY not configured');

  // Customer-app flow passes its own return URL; the SEP-24 webview flow returns to
  // the interactive page. Either way DIDIT redirects the user back after verifying.
  const callback = callbackOverride
    ?? (`${PUBLIC_BASE_URL}/sep24/interactive`
      + (transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : ''));

  const res = await fetch(`${DIDIT_BASE}/v3/session/`, {
    method: 'POST',
    headers: { 'x-api-key': DIDIT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: DIDIT_WORKFLOW_ID, vendor_data: account, callback }),
  });
  if (!res.ok) {
    // 400 => insufficient credits (top up at business.didit.me); 403 => bad/rotated key.
    const detail = await res.text();
    throw new Error(`DIDIT session create failed (${res.status}): ${detail}`);
  }
  const session = await res.json(); // { session_id, session_token, url, status, ... }

  await pool.query(
    `INSERT INTO nordstern.kyc_verifications (vendor_data, status, didit_session_id, didit_session_url, updated_at)
     VALUES ($1, 'PROCESSING', $2, $3, now())
     ON CONFLICT (vendor_data) DO UPDATE SET
       status = 'PROCESSING', didit_session_id = EXCLUDED.didit_session_id,
       didit_session_url = EXCLUDED.didit_session_url, updated_at = now()`,
    [account, session.session_id, session.url],
  );

  return { url: session.url, sessionToken: session.session_token ?? '', status: 'PROCESSING' };
}

// Apply a verified webhook decision. Durable dedupe on event_id happens first.
export async function applyWebhook(payload: any): Promise<void> {
  // Only the SESSION decision drives our gate. DIDIT also emits entity-level and
  // side events — user.status.updated / business.status.updated (status "Active"),
  // data.updated, activity.created, transaction.* — which carry NON-session
  // statuses; processing them would clobber the ACCEPTED state. Ignore all but
  // session status.updated. (Absent webhook_type ⇒ legacy payload ⇒ process.)
  const webhookType = String(payload?.webhook_type ?? '');
  if (webhookType && webhookType !== 'status.updated') {
    console.log(`[didit] ignoring '${webhookType}' webhook for ${payload?.vendor_data ?? 'unknown'}`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventId = payload?.event_id;
    if (eventId) {
      const dedupe = await client.query(
        'INSERT INTO nordstern.kyc_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id',
        [eventId],
      );
      if (dedupe.rowCount === 0) {
        console.log(`[didit] duplicate webhook event ${eventId} — skipping`);
        await client.query('ROLLBACK');
        return;
      }
    }

    const account = payload?.vendor_data;
    if (!account) {
      console.warn('[didit] webhook missing vendor_data — ignoring');
      await client.query('ROLLBACK');
      return;
    }

    const diditStatus = String(payload.status ?? '');
    const status = await persistDecision(account, diditStatus, payload.session_id ?? null, payload.decision, client);
    await client.query('COMMIT');
    console.log(`[didit] webhook applied for ${account}: ${diditStatus} → ${status}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[didit] webhook transaction failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

// ─── Thin SEP-12 provider (KYC_PROVIDER=didit) ──────────────────────────────────
// Keeps the /customer callback consistent with the seam by READING the store. The
// hosted flow itself is driven in the SEP-24 webview, not through putCustomer.
export class DiditKycProvider implements KycProvider {
  async getCustomer(q: CustomerQuery): Promise<CustomerResult> {
    const account = q.id ?? q.account ?? 'anon';
    const status = await getStatus(account);
    if (status === 'NEEDS_INFO') {
      // Signal the wallet that verification is needed; it happens in the SEP-24 webview.
      return { id: account, status, message: 'Identity verification required — complete it in the deposit/withdraw window.' };
    }
    return { id: account, status };
  }

  async putCustomer(params: { id?: string; account?: string; fields: Record<string, any> }): Promise<{ id: string; status: KycStatus }> {
    const account = params.id ?? params.account ?? 'anon';
    return { id: account, status: await getStatus(account) };
  }

  async deleteCustomer(id: string): Promise<void> {
    await pool.query('DELETE FROM nordstern.kyc_verifications WHERE vendor_data = $1', [id]);
  }

  // SEP-24 gate + interactive session, delegated to the module-level DIDIT flow.
  async getStatus(subject: string): Promise<KycStatus> {
    return getStatus(subject);
  }
  async startSession(subject: string, transactionId?: string, returnUrl?: string): Promise<KycSessionResult> {
    return createSession(subject, transactionId, returnUrl);
  }
}
