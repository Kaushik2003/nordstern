import { RateProvider, RateQuote } from './RateProvider.js';

// ─── CoinMarketCap FX rate (INR per USDC) ──────────────────────────────────────
// Quotes USDC directly against INR via CMC's quotes/latest endpoint, so the rate
// reflects the actual USDC market price rather than a generic USD→INR feed.
// Cached briefly; degrades to the configured fallback (never fails the flow).
// Selected via FEE_PROVIDER=cmc. NOTE: fiat `convert` (INR) requires a paid CMC
// tier — on the free plan the call errors and we fall back to RATE_INR_USD.
// A spread for the anchor's margin is a Phase E pricing concern (not applied here).

const CMC_URL   = process.env.CMC_URL ?? 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest';
const CMC_KEY   = process.env.CMC_API_KEY ?? '';
const CMC_ID    = process.env.CMC_USDC_ID ?? '3408';  // Circle USD Coin
const FALLBACK  = process.env.RATE_INR_USD ?? '88.50';
// Cache window — long by design to conserve paid CMC credits. All callers share
// this one cache, so total CMC calls are capped to ~1 per TTL regardless of quote
// volume. INR/USDC barely moves, so a stale-by-an-hour rate is fine. Override via
// CMC_TTL_MS. Default 1h ⇒ ≤24 calls/day even under continuous polling.
const TTL_MS    = Number(process.env.CMC_TTL_MS ?? 3_600_000);

export class CmcRateProvider implements RateProvider {
  private cached: { rate: string; at: number } | null = null;

  async quote(): Promise<RateQuote> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < TTL_MS) {
      return { inrPerUsdc: this.cached.rate, source: 'cmc', asOf: new Date(this.cached.at).toISOString() };
    }
    try {
      if (!CMC_KEY) throw new Error('CMC_API_KEY not set');
      const url = `${CMC_URL}?id=${encodeURIComponent(CMC_ID)}&convert=INR`;
      const res = await fetch(url, {
        headers: { 'X-CMC_PRO_API_KEY': CMC_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      const body: any = await res.json();
      if (!res.ok) throw new Error(body?.status?.error_message ?? `CMC HTTP ${res.status}`);
      // Querying by `id` keys the result object by that id (querying by `symbol`
      // returns an array instead), so read data[id].quote.INR.price.
      const price = body?.data?.[CMC_ID]?.quote?.INR?.price;
      if (price == null) throw new Error('no INR price in CMC response');
      const rate = Number(price).toFixed(2);
      this.cached = { rate, at: now };
      return { inrPerUsdc: rate, source: 'cmc', asOf: new Date(now).toISOString() };
    } catch (err) {
      // Degrade to the configured fallback rather than break the money flow.
      return { inrPerUsdc: FALLBACK, source: `fallback (${(err as Error).message})`, asOf: new Date(now).toISOString() };
    }
  }
}
