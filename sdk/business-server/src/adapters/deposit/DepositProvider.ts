// ─── DepositProvider seam (fiat-in) ────────────────────────────────────────────
// Produces the instructions shown to the user for paying INR into the anchor and,
// for real PSPs, actually VERIFIES the money arrived before USDC is released.
//   `mock` — plain "wire" screen; confirming releases USDC (sandbox, no verification).
//   `upi`  — real upi://pay intent + QR; still unverified collection (sandbox UX).
//   `razorpay` — real Razorpay Checkout: creates an order, verifies the captured
//                payment server-side, and gates the release on it.
//
// The base contract is `instructions()` + `isPaid()`. Providers that collect a
// verified payment (Razorpay) also implement the optional order/claim/mark methods;
// providers that don't (mock/upi) leave them undefined and report `isPaid → true`
// so the release flow is unchanged for them.

export interface DepositInstructions {
  label: string;
  lines: string[];
  note: string;
  intentUrl?: string;   // e.g. upi://pay?... (deep link)
  qrDataUri?: string;   // data:image/png;base64,... for the intent
}

// What the webview needs to open Razorpay Checkout. `keyId` is public; the amount
// is echoed back in paise so Checkout and the created order can never disagree.
export interface DepositOrder {
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  inrAmount: string;     // effective (locked) INR — display shows exactly this
  inrPerUsdc: string;
  rateSource: string;
  name: string;
}

export interface DepositProvider {
  instructions(args: {
    transactionId: string;
    inrAmount: string;
    usdcAmount: string;
    memo: string;
  }): Promise<DepositInstructions>;

  // Has a verified payment been collected for this transaction? Providers without
  // real collection return `true` (the confirm click is the "payment" in sandbox).
  isPaid(args: { transactionId: string }): Promise<boolean>;

  // ── Optional: real PSP collection (Razorpay) ──────────────────────────────────
  // Create (or reuse) the payment order. INR is locked here and reused verbatim.
  createOrder?(args: {
    transactionId: string;
    usdcAmount: string;
    inrAmount: string;      // freshly quoted; only used when minting a NEW order
    inrPerUsdc: string;
    rateSource: string;
    account: string;
    destination: string;
  }): Promise<DepositOrder>;

  // Atomically claim a `paid` payment for release (paid → releasing). Returns the
  // locked amounts to settle with, or null if it can't be claimed (not paid yet, or
  // already being/already released) — the double-send guard shared by the webview
  // return path and the webhook.
  claimForRelease?(transactionId: string): Promise<{
    amountUsdc: string; inrAmount: string; inrPerUsdc: string; rateSource: string;
  } | null>;

  markReleased?(transactionId: string, stellarTxHash: string): Promise<void>;
  markReleaseFailed?(transactionId: string, message: string): Promise<void>;
}
