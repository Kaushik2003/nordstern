// ─── PayoutProvider seam (fiat-out) ────────────────────────────────────────────
// Disburses INR to the user after their USDC withdrawal is received on-chain.
// Phase C ships a mock (simulated UTR); Phase D swaps in Cashfree Payouts /
// RazorpayX (sandbox) with webhook signature verification + backend re-verification
// behind this same interface — no change to the poller.

export interface PayoutResult {
  status: 'completed' | 'pending' | 'failed';
  reference?: string;  // e.g. bank UTR / PSP payout id
  message?: string;
}

export interface PayoutProvider {
  disburse(args: {
    transactionId: string;
    inrAmount: string;
    usdcAmount: string;
    destination?: string;  // symbolic in sandbox; real bank/UPI handle in Phase D
  }): Promise<PayoutResult>;
}
