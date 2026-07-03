import { PayoutProvider, PayoutResult } from './PayoutProvider.js';

// Simulated INR payout — returns a fake UTR immediately. No real money moves.
// A real PSP (Cashfree/RazorpayX) with async webhooks replaces this in Phase D;
// until a payout is confirmed there, disburse() should return 'pending'.
export class MockPayoutProvider implements PayoutProvider {
  async disburse({ transactionId, inrAmount }: {
    transactionId: string; inrAmount: string; usdcAmount: string; destination?: string;
  }): Promise<PayoutResult> {
    const reference = `UTR-SIM-${transactionId.slice(0, 8).toUpperCase()}`;
    console.log(`[payout:mock] disbursed ₹${inrAmount} (ref ${reference})`);
    return { status: 'completed', reference };
  }
}
