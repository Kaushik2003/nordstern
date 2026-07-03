import { RateProvider, RateQuote } from './RateProvider.js';

// ─── Live FX rate (INR per USDC) ───────────────────────────────────────────────
// USDC ≈ USD, so we use a public USD→INR feed as the USDC→INR rate. No API key.
// Cached briefly; degrades to the configured fallback (never fails the flow).
// Selected via FEE_PROVIDER=live. A spread for the anchor's margin is a Phase E
// pricing concern (kept out of the raw quote here).

const FX_URL   = process.env.FX_URL ?? 'https://open.er-api.com/v6/latest/USD';
const FALLBACK = process.env.RATE_INR_USD ?? '88.50';
const TTL_MS   = 60_000;

export class LiveRateProvider implements RateProvider {
  private cached: { rate: string; at: number } | null = null;

  async quote(): Promise<RateQuote> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < TTL_MS) {
      return { inrPerUsdc: this.cached.rate, source: 'live', asOf: new Date(this.cached.at).toISOString() };
    }
    try {
      const res = await fetch(FX_URL, { signal: AbortSignal.timeout(6000) });
      const body: any = await res.json();
      const inr = body?.rates?.INR;
      if (!inr) throw new Error('no INR in FX response');
      const rate = Number(inr).toFixed(2);
      this.cached = { rate, at: now };
      return { inrPerUsdc: rate, source: 'live', asOf: new Date(now).toISOString() };
    } catch (err) {
      // Degrade to the configured fallback rather than break the money flow.
      return { inrPerUsdc: FALLBACK, source: `fallback (${(err as Error).message})`, asOf: new Date(now).toISOString() };
    }
  }
}
