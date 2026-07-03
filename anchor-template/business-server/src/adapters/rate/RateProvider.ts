// ─── RateProvider seam ─────────────────────────────────────────────────────────
// INR/USD FX for the INR ↔ USDC anchor. USDC ≈ USD, so we quote INR per 1 USDC.
// Phase B ships a mock (fixed) rate; Phase D swaps in a real FX feed behind this
// same interface — no change to the deposit/withdraw flow logic.

export interface RateQuote {
  inrPerUsdc: string;  // INR to receive/deliver per 1 USDC
  source: string;      // provider tag, e.g. 'mock'
  asOf: string;        // ISO timestamp
}

export interface RateProvider {
  quote(): Promise<RateQuote>;
}
