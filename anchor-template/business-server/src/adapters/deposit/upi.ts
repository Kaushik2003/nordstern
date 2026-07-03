import QRCode from 'qrcode';
import { DepositProvider, DepositInstructions } from './DepositProvider.js';

// ─── UPI deposit (intent + QR) ─────────────────────────────────────────────────
// Builds a standards UPI deep link (`upi://pay?...`) plus a scannable QR to the
// anchor's VPA, with the transaction memo as the note. On mobile the link opens
// the user's UPI app; on desktop they scan the QR.
//
// NOTE: this is the fiat-in UX. Confirming still simulates the collection in
// sandbox — verifying the INR actually arrived before releasing USDC requires a
// PSP collection webhook (Cashfree auto-collect / virtual accounts), which is
// credential-gated. So this is realistic UX, not yet a verified collection.

const VPA  = process.env.ANCHOR_UPI_VPA  ?? 'nordstern.anchor@upi';
const NAME = process.env.ANCHOR_UPI_NAME ?? 'NordStern Anchor';

export class UpiDepositProvider implements DepositProvider {
  async instructions({ inrAmount, memo }: {
    transactionId: string; inrAmount: string; usdcAmount: string; memo: string;
  }): Promise<DepositInstructions> {
    const params = new URLSearchParams({
      pa: VPA, pn: NAME, am: inrAmount, cu: 'INR', tn: `NordStern ${memo}`,
    });
    const intentUrl = `upi://pay?${params.toString()}`;
    let qrDataUri: string | undefined;
    try {
      qrDataUri = await QRCode.toDataURL(intentUrl, { margin: 1, width: 220 });
    } catch { /* QR is best-effort; the intent link still works */ }

    return {
      label: 'Pay via UPI',
      lines: [`Amount: ₹${inrAmount}`, `UPI ID: ${VPA}`, `Reference: ${memo}`],
      note: 'Scan the QR or tap “Open UPI app”. Sandbox: confirming releases USDC (real collection verification is a PSP step).',
      intentUrl,
      qrDataUri,
    };
  }
}
