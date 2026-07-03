import { RateProvider, RateQuote } from './RateProvider.js';

// Fixed INR/USD rate for sandbox. Override with RATE_INR_USD. A real, live FX
// source (with spread) replaces this in Phase D.
const RATE = process.env.RATE_INR_USD ?? '88.50';

export class MockRateProvider implements RateProvider {
  async quote(): Promise<RateQuote> {
    return { inrPerUsdc: RATE, source: 'mock', asOf: new Date().toISOString() };
  }
}
