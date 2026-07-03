import { DepositProvider, DepositInstructions } from './DepositProvider.js';

// Placeholder fiat-in screen — no real money moves. Clicking "confirm" in the
// interactive flow simply proceeds to release USDC (sandbox). A real UPI/bank
// collection with backend verification replaces this in Phase D.
export class MockDepositProvider implements DepositProvider {
  async instructions({ inrAmount, memo }: {
    transactionId: string; inrAmount: string; usdcAmount: string; memo: string;
  }): Promise<DepositInstructions> {
    return {
      label: 'Pay (simulated) — INR in',
      lines: [
        `Amount: ₹${inrAmount}`,
        'Beneficiary: ACME Test Bank / UPI (sandbox)',
        `Reference / memo: ${memo}`,
      ],
      note: 'Sandbox: no real payment is taken. Confirming releases USDC to your wallet.',
    };
  }
}
