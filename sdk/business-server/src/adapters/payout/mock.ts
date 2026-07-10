import { PayoutProvider, PayoutResult } from './PayoutProvider.js';

// Simulated INR payout — models a real PSP sandbox (Cashfree Payouts / RazorpayX test
// mode): it returns a realistic bank UTR + PSP payout id and a brief async settle, WITHOUT
// moving any real money. Everything runs on testnet (the UI shows a TESTNET badge), so this
// is an honest simulation, not a claim that a bank actually paid out. A real PSP with signed
// webhooks + backend re-verification replaces this behind the same interface (Phase D); until
// a payout is confirmed there, disburse() should return 'pending'.
export class MockPayoutProvider implements PayoutProvider {
  async disburse({ transactionId, inrAmount }: {
    transactionId: string; inrAmount: string; usdcAmount: string; destination?: string;
  }): Promise<PayoutResult> {
    // A bank-style 12-digit UTR (what a customer recognises on their statement) plus a
    // PSP-style payout id (what an operator reconciles against), like a real sandbox response.
    const utr = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    const payoutId = 'pout_' + Math.random().toString(36).slice(2, 12).toUpperCase();
    const reference = `${utr} · ${payoutId}`;
    // Brief settle so the "processing" state is visible, as a real async payout would be.
    await new Promise((r) => setTimeout(r, 1800));
    console.log(`[payout:mock] disbursed ₹${inrAmount} for ${transactionId} (UTR ${utr}, ${payoutId})`);
    return { status: 'completed', reference };
  }
}
