import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { fetchTransaction, patchTransaction } from './platform.js';
import { assetId, DIDIT_WEBHOOK_SECRET, RAZORPAY_WEBHOOK_SECRET } from './config.js';
import { applyWebhook } from './adapters/kyc/didit.js';
import { markPaidByOrder } from './adapters/deposit/razorpay.js';
import { releaseDeposit } from './sep24.js';
import { pool } from './db.js';

// ─── Webhooks Router ────────────────────────────────────────────────────────
// Handles incoming async event notifications from external providers:
//   POST /payout-webhook     — Cashfree Payouts status (Phase D slice 2)
//   POST /webhooks/didit     — DIDIT KYC decision (source of truth for verification)
//   POST /webhooks/razorpay  — Razorpay deposit collection (source of truth for payment)

export const webhooksRouter = Router();

// ─── DIDIT KYC webhook ──────────────────────────────────────────────────────
// The authoritative signal that a user's identity check finished. We authenticate
// with DIDIT's `X-Signature` = HMAC-SHA256 over the EXACT raw request bytes
// (captured in app.ts via express.json's `verify` hook, so we never re-stringify).
// Hashing the raw body — rather than re-canonicalising the parsed JSON like the
// X-Signature-V2 scheme — avoids any JS↔Python serialisation drift and is stable
// across webhook versions (v1/v2/v3). See docs.didit.me/integration/webhooks.

// NOTE: DIDIT's hosted-config delivery posts to the webhook host ROOT ("/"),
// dropping any path we register in /v3/webhook/. We therefore accept BOTH the
// descriptive "/webhooks/didit" and "/" (no other POST "/" handler exists — the
// SEP callbacks use /customer, /rate). The X-Signature check gates either path.
webhooksRouter.post(['/webhooks/didit', '/'], async (req, res) => {
  if (!DIDIT_WEBHOOK_SECRET || DIDIT_WEBHOOK_SECRET.startsWith('<')) {
    console.error('[didit-webhook] DIDIT_WEBHOOK_SECRET not configured');
    res.status(500).send('not configured');
    return;
  }

  const sig = (req.headers['x-signature'] as string) ?? '';
  const ts = Number(req.headers['x-timestamp']);
  const raw: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;

  // 1. Freshness — reject anything older/newer than 300s (replay protection).
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    res.status(401).send('stale');
    return;
  }

  // 2. Authenticate: HMAC-SHA256 of the RAW body bytes must equal X-Signature,
  //    compared in constant time. Never re-stringify the parsed body for this.
  if (!raw || !raw.length) {
    console.error('[didit-webhook] raw body unavailable');
    res.status(400).send('no body');
    return;
  }
  const expected = crypto.createHmac('sha256', DIDIT_WEBHOOK_SECRET).update(raw).digest('hex');
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    res.status(401).send('bad sig');
    return;
  }

  // 4. Apply the decision (light DB work — 2 queries, well within the 5s budget),
  //    then ack. On failure return 500 so DIDIT retries (~1m, then ~4m) instead of
  //    silently dropping the decision.
  //    HARDENING: the dedupe-insert and the decision-upsert are wrapped in a single,
  //    atomic DB transaction inside applyWebhook, ensuring crash consistency.
  try {
    await applyWebhook(req.body);
    res.status(200).send('ok');
  } catch (err) {
    console.error('[didit-webhook] apply error:', err instanceof Error ? err.message : err);
    res.status(500).send('processing error');
  }
});

// ─── Razorpay deposit webhook (source of truth for collection) ──────────────────
// payment.captured / order.paid confirm the INR landed. We authenticate with
// X-Razorpay-Signature = HMAC-SHA256 over the EXACT raw request bytes (captured in
// app.ts via express.json's `verify` hook — never re-stringify), dedupe on
// X-Razorpay-Event-Id, ack fast, then RE-VERIFY against the Razorpay API and release
// USDC through the shared, idempotent releaseDeposit. This is what makes a user who
// paid and closed the tab still get their tokens — and the atomic paid→releasing
// claim inside releaseDeposit means it can never double-send with the webview path.
webhooksRouter.post('/webhooks/razorpay', async (req, res) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    res.status(500).send('not configured');
    return;
  }

  const sig = (req.headers['x-razorpay-signature'] as string) ?? '';
  const raw: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!raw || !raw.length) { res.status(400).send('no body'); return; }

  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    res.status(401).send('bad sig');
    return;
  }

  const event = String(req.body?.event ?? '');
  const eventId = (req.headers['x-razorpay-event-id'] as string) ?? '';
  const orderId = req.body?.payload?.payment?.entity?.order_id
    ?? req.body?.payload?.order?.entity?.id ?? null;
  const paymentId = req.body?.payload?.payment?.entity?.id ?? null;

  // Ack immediately (Razorpay expects a fast 2xx), then process asynchronously.
  res.status(200).send('ok');

  if (event !== 'payment.captured' && event !== 'order.paid') return;
  if (!orderId) return;

  (async () => {
    try {
      // Durable dedupe. The idempotent release makes this best-effort, not load-bearing.
      if (eventId) {
        const dup = await pool.query(
          'INSERT INTO nordstern.razorpay_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id',
          [eventId],
        );
        if (dup.rowCount === 0) { console.log(`[razorpay-webhook] duplicate event ${eventId} — skipping`); return; }
      }
      const transactionId = await markPaidByOrder(orderId, paymentId);   // re-verify + mark paid
      if (!transactionId) { console.log(`[razorpay-webhook] order ${orderId} not paid / unknown — skipping`); return; }
      const outcome = await releaseDeposit(transactionId);
      console.log(`[razorpay-webhook] ${event} order=${orderId} → release: ${outcome.kind}`);
    } catch (err) {
      console.error('[razorpay-webhook] processing error:', err instanceof Error ? err.message : err);
    }
  })();
});

const APP_ID = process.env.CASHFREE_APP_ID ?? '';
const SECRET = process.env.CASHFREE_SECRET ?? '';
const BASE = process.env.CASHFREE_BASE_URL ?? 'https://sandbox.cashfree.com/payout';
const API_VERSION = process.env.CASHFREE_API_VERSION ?? '2024-01-01';

async function verifyTransferStatus(transferId: string): Promise<string> {
  const res = await fetch(`${BASE}/transfers?transfer_id=${transferId}`, {
    headers: {
      'x-client-id': APP_ID,
      'x-client-secret': SECRET,
      'x-api-version': API_VERSION,
    }
  });
  if (!res.ok) throw new Error(`Backend verification failed: ${res.status}`);
  const data = (await res.json()) as any;
  return data?.data?.status ?? data?.status ?? 'UNKNOWN';
}

webhooksRouter.post('/payout-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  const signature = req.headers['x-webhook-signature'] as string;
  const rawBody = req.body.toString();

  if (!SECRET) {
    console.error('[webhook] Cashfree secret not configured');
    res.status(500).send('Configuration error');
    return;
  }

  const computedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(timestamp + rawBody)
    .digest('base64');

  if (computedSignature !== signature) {
    console.error('[webhook] Invalid Cashfree signature');
    res.status(400).send('Invalid signature');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  const txId = payload.data?.transfer_id || payload.data?.cf_transfer_id;
  if (!txId) {
    // Acknowledge immediately for invalid payload to prevent retries
    res.status(200).send('OK');
    return;
  }

  console.log(`[webhook] Received ${payload.type} for ${txId}`);
  res.status(200).send('OK');

  // Async event processing
  (async () => {
    try {
      const tx = await fetchTransaction(txId);
      if (!tx || tx.kind !== 'withdrawal' || tx.status !== 'pending_anchor') {
        console.log(`[webhook] Tx ${txId} not pending_anchor, ignoring.`);
        return;
      }

      // Perform backend re-verification to ensure real status
      const status = await verifyTransferStatus(txId);
      console.log(`[webhook] Backend re-verified status for ${txId}: ${status}`);

      if (status === 'SUCCESS') {
        await patchTransaction(txId, {
          status: 'completed',
          amount_in: { amount: tx.amount_expected?.amount ?? '0', asset: assetId() },
          amount_out: { amount: String(payload.data?.transfer_amount ?? '0'), asset: 'iso4217:INR' },
          amount_fee: { amount: '0', asset: assetId() },
        });
        console.log(`[webhook] Completed tx ${txId}`);
      } else if (['FAILED', 'REJECTED', 'REVERSED', 'MANUALLY_REJECTED'].includes(status)) {
        await patchTransaction(txId, {
          status: 'error',
          message: `Payout failed: ${status}`
        });
        console.log(`[webhook] Errored tx ${txId}`);
      }
    } catch (err) {
      console.error(`[webhook] Error processing tx ${txId}:`, err);
    }
  })();
});
