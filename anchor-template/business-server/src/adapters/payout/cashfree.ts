import { PayoutProvider, PayoutResult } from './PayoutProvider.js';

// ─── Cashfree Payouts (V2, sandbox) ────────────────────────────────────────────
// Real INR disbursal behind the PayoutProvider seam. Selected via
// PAYOUT_PROVIDER=cashfree; gated on CASHFREE_APP_ID + CASHFREE_SECRET (without
// them this throws and the operator stays on mock). Follows the repo's Cashfree
// skills (frontend/.claude/skills/cashfree-skills/payouts).
//
// Payouts are ASYNC: POST /transfers returns RECEIVED, final status arrives on the
// TRANSFER_SUCCESS/FAILED webhook (see webhooks.ts, HMAC-SHA256 verified). So
// disburse() returns 'pending' on success; the withdrawal is completed by the
// webhook after backend re-verification. transfer_id = our tx id makes retries
// idempotent (Cashfree dedups by transfer_id — never blind-retry on 5xx).
//
// Go-live (do NOT call production-ready until done): swap CASHFREE_BASE_URL to
// https://api.cashfree.com/payout + PROD_ keys, complete KYC, whitelist prod
// webhook IPs, enable IP-whitelist/RSA 2FA, backend re-verify status, remove test
// VPAs. See frontend/.claude/skills/cashfree-skills/pg/go-live.

const BASE   = process.env.CASHFREE_BASE_URL ?? 'https://sandbox.cashfree.com/payout';
const APP_ID = process.env.CASHFREE_APP_ID ?? '';
const SECRET = process.env.CASHFREE_SECRET ?? '';
const API_VERSION = process.env.CASHFREE_API_VERSION ?? '2024-01-01';
const TEST_VPA = process.env.CASHFREE_TEST_VPA ?? 'success@upi'; // sandbox

function headers() {
  return {
    'x-client-id': APP_ID,
    'x-client-secret': SECRET,
    'x-api-version': API_VERSION,
    'Content-Type': 'application/json',
  };
}

export class CashfreePayoutProvider implements PayoutProvider {
  async disburse({ transactionId, inrAmount, destination }: {
    transactionId: string; inrAmount: string; usdcAmount: string; destination?: string;
  }): Promise<PayoutResult> {
    if (!APP_ID || !SECRET) {
      throw new Error('CASHFREE_APP_ID / CASHFREE_SECRET not configured — cannot use PAYOUT_PROVIDER=cashfree');
    }

    const beneficiaryId = `bene_${transactionId.slice(0, 12)}`;
    const vpa = destination && destination.includes('@') ? destination : TEST_VPA;

    // 1. Upsert beneficiary (idempotent by beneficiary_id).
    await fetch(`${BASE}/beneficiary`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        beneficiary_id: beneficiaryId,
        beneficiary_name: 'NordStern Withdrawal',
        beneficiary_instrument_details: { vpa },
        beneficiary_contact_details: { beneficiary_email: 'ops@nordstern.example', beneficiary_phone: '9999999999' },
      }),
    }).catch(() => { /* likely already exists; transfer will surface real errors */ });

    // 2. Initiate transfer. transfer_id = our tx id (idempotent).
    const res = await fetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        transfer_id: transactionId,
        transfer_amount: Number(inrAmount),
        transfer_currency: 'INR',
        transfer_mode: 'upi',
        beneficiary_details: { beneficiary_id: beneficiaryId },
        transfer_remarks: 'NordStern USDC off-ramp',
      }),
    });
    const body: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { status: 'failed', message: body?.message ?? `cashfree ${res.status}` };
    }
    // RECEIVED/PENDING/QUEUED → async; SUCCESS is rare here. Completion via webhook.
    const status = body?.data?.status ?? body?.status ?? 'RECEIVED';
    if (status === 'SUCCESS') return { status: 'completed', reference: body?.data?.cf_transfer_id ?? transactionId };
    if (['FAILED', 'REJECTED', 'REVERSED'].includes(status)) return { status: 'failed', message: status };
    return { status: 'pending', reference: body?.data?.cf_transfer_id ?? transactionId };
  }
}
