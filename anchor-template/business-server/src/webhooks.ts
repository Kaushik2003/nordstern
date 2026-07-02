import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { fetchTransaction, patchTransaction } from './platform.js';
import { assetId } from './config.js';

// ─── Webhooks Router ────────────────────────────────────────────────────────
// Handles incoming async event notifications from external providers.
// Currently handles Cashfree Payouts status webhooks for Phase D slice 2.

export const webhooksRouter = Router();

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
