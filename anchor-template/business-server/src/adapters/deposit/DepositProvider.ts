// ─── DepositProvider seam (fiat-in) ────────────────────────────────────────────
// Produces the instructions shown to the user for paying INR into the anchor.
// `mock` is a plain "wire" screen; `upi` emits a real upi://pay intent + QR.
// Real payment *verification* (confirming the INR actually landed before releasing
// USDC) requires a PSP collection integration (Cashfree auto-collect / virtual
// accounts) — a credential-gated hardening step.

export interface DepositInstructions {
  label: string;
  lines: string[];
  note: string;
  intentUrl?: string;   // e.g. upi://pay?... (deep link)
  qrDataUri?: string;   // data:image/png;base64,... for the intent
}

export interface DepositProvider {
  instructions(args: {
    transactionId: string;
    inrAmount: string;
    usdcAmount: string;
    memo: string;
  }): Promise<DepositInstructions>;
}
