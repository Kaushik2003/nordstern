import { RateProvider, RateQuote } from './RateProvider.js';

// ─── Live FX via CoinGecko (XLM + USDC in USD & INR) ─────────────────────────────
// One free, keyless call returns everything the anchor needs for the three demo
// currencies: XLM/USD, XLM/INR, USD/INR (from USDC), and the USDC→INR settlement rate.
// This is the DEFAULT — real prices only. There is no mock or hardcoded fallback: on a
// transient fetch failure we serve the last GOOD live value (still real, just seconds old);
// only if we have never once fetched do we surface an error to the caller.

const URL = process.env.COINGECKO_URL
  ?? 'https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd,inr';
const TTL_MS = 60_000; // CoinGecko's free tier is rate-limited; a 60s cache is plenty.

type Snapshot = { inrPerUsdc: string; usdInr: string; xlmUsd: string; xlmInr: string; at: number };

export class CoinGeckoRateProvider implements RateProvider {
  private last: Snapshot | null = null;
  private inflight: Promise<Snapshot> | null = null;

  async quote(): Promise<RateQuote> {
    const now = Date.now();
    if (this.last && now - this.last.at < TTL_MS) return this.shape(this.last, false);
    try {
      const snap = await this.fetchOnce();
      this.last = snap;
      return this.shape(snap, false);
    } catch (err) {
      // No mock fallback: reuse the last real value if we have one; otherwise fail loudly.
      if (this.last) return this.shape(this.last, true);
      throw new Error(`live rate unavailable and no cached value yet: ${(err as Error).message}`);
    }
  }

  private shape(s: Snapshot, stale: boolean): RateQuote {
    return {
      inrPerUsdc: s.inrPerUsdc,
      usdInr: s.usdInr,
      xlmUsd: s.xlmUsd,
      xlmInr: s.xlmInr,
      source: stale ? 'coingecko (cached)' : 'coingecko',
      asOf: new Date(s.at).toISOString(),
    };
  }

  // Single-flight the network call so a burst of quote()s makes one request.
  private fetchOnce(): Promise<Snapshot> {
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        const res = await fetch(URL, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const b: any = await res.json();
        const usdcInr = Number(b?.['usd-coin']?.inr);
        const xlmUsd = Number(b?.stellar?.usd);
        const xlmInr = Number(b?.stellar?.inr);
        if (!usdcInr || !xlmUsd || !xlmInr) throw new Error('missing pairs in CoinGecko response');
        return {
          inrPerUsdc: usdcInr.toFixed(2),
          usdInr: usdcInr.toFixed(2), // USDC ≈ USD
          xlmUsd: xlmUsd.toFixed(4),
          xlmInr: xlmInr.toFixed(4),
          at: Date.now(),
        };
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }
}
