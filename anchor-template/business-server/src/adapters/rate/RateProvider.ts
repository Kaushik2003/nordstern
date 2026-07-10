// ─── RateProvider seam ─────────────────────────────────────────────────────────
// Live FX for the INR ↔ USDC anchor, plus the network asset (XLM). We optimise for the
// three currencies every anchor uses through the demo: XLM, USD (≈ USDC), and INR.
// The default provider is a REAL feed (CoinGecko) — no mock, no hardcoded fallback.

export interface RateQuote {
  inrPerUsdc: string;  // INR to receive/deliver per 1 USDC (the settlement rate) — always present
  // Live market pairs (present when the real feed is used):
  usdInr?: string;     // 1 USD in INR
  xlmUsd?: string;     // 1 XLM in USD
  xlmInr?: string;     // 1 XLM in INR
  source: string;      // provider tag, e.g. 'coingecko'
  asOf: string;        // ISO timestamp of the quote
}

export interface RateProvider {
  quote(): Promise<RateQuote>;
}
