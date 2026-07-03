import { pool } from '../../db.js';
import {
  DIDIT_API_KEY, DIDIT_WORKFLOW_ID, PUBLIC_BASE_URL, KYC_REVERIFY_TTL_SECONDS,
} from '../../config.js';
import { KycProvider, CustomerQuery, CustomerResult, KycStatus } from './KycProvider.js';

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

// GET current verification status for an account, applying the TTL. An ACCEPTED
// record whose expires_at has passed is reported NEEDS_INFO → the gate re-shows.
export async function getStatus(account: string): Promise<KycStatus> {
  const { rows } = await pool.query(
    'SELECT status, expires_at FROM nordstern.kyc_verifications WHERE vendor_data = $1',
    [account],
  );
  if (rows.length === 0) return 'NEEDS_INFO';
  const rec = rows[0];
  if (rec.status === 'ACCEPTED') {
    if (rec.expires_at && new Date(rec.expires_at).getTime() <= Date.now()) return 'NEEDS_INFO';
    return 'ACCEPTED';
  }
  return rec.status as KycStatus;
}

// Create (or reuse) a DIDIT session for an account. Reuses a still-open PROCESSING
// session URL so repeat clicks / reloads don't mint new sessions. Throws on API
// failure (e.g. 400 "not enough credits", 403 bad key) — the caller surfaces it.
export async function createSession(account: string, transactionId?: string): Promise<SessionResult> {
  const existing = await pool.query(
    'SELECT status, didit_session_url FROM nordstern.kyc_verifications WHERE vendor_data = $1',
    [account],
  );
  const prior = existing.rows[0];
  if (prior?.status === 'PROCESSING' && prior.didit_session_url) {
    return { url: prior.didit_session_url, sessionToken: '', status: 'PROCESSING' };
  }

  if (!DIDIT_API_KEY) throw new Error('DIDIT_API_KEY not configured');

  const callback = `${PUBLIC_BASE_URL}/sep24/interactive`
    + (transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : '');

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

  const eventId = payload?.event_id;
  if (eventId) {
    const dedupe = await pool.query(
      'INSERT INTO nordstern.kyc_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id',
      [eventId],
    );
    if (dedupe.rowCount === 0) {
      console.log(`[didit] duplicate webhook event ${eventId} — skipping`);
      return;
    }
  }

  const account = payload?.vendor_data;
  if (!account) { console.warn('[didit] webhook missing vendor_data — ignoring'); return; }

  const diditStatus = String(payload.status ?? '');
  const status = mapStatus(diditStatus);
  const summary = summarizeDecision(payload.decision);

  if (diditStatus === 'Approved') {
    const verifiedAt = new Date();
    const expiresAt  = new Date(verifiedAt.getTime() + KYC_REVERIFY_TTL_SECONDS * 1000);
    await pool.query(
      `INSERT INTO nordstern.kyc_verifications
         (vendor_data, status, didit_session_id, decision_summary, verified_at, expires_at, updated_at)
       VALUES ($1, 'ACCEPTED', $2, $3, $4, $5, now())
       ON CONFLICT (vendor_data) DO UPDATE SET
         status = 'ACCEPTED', didit_session_id = EXCLUDED.didit_session_id,
         decision_summary = EXCLUDED.decision_summary, verified_at = EXCLUDED.verified_at,
         expires_at = EXCLUDED.expires_at, updated_at = now()`,
      [account, payload.session_id ?? null, summary, verifiedAt, expiresAt],
    );
  } else if (diditStatus === 'Kyc Expired') {
    await pool.query(
      `UPDATE nordstern.kyc_verifications
         SET status = 'NEEDS_INFO', expires_at = now(), updated_at = now()
       WHERE vendor_data = $1`,
      [account],
    );
  } else {
    await pool.query(
      `INSERT INTO nordstern.kyc_verifications (vendor_data, status, didit_session_id, decision_summary, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (vendor_data) DO UPDATE SET
         status = EXCLUDED.status, didit_session_id = EXCLUDED.didit_session_id,
         decision_summary = COALESCE(EXCLUDED.decision_summary, nordstern.kyc_verifications.decision_summary),
         updated_at = now()`,
      [account, status, payload.session_id ?? null, summary],
    );
  }

  console.log(`[didit] webhook applied for ${account}: ${diditStatus} → ${status}`);
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
}
