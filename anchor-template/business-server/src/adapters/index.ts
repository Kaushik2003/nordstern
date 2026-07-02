import { PROVIDERS } from '../config.js';

import { RateProvider } from './rate/RateProvider.js';
import { MockRateProvider } from './rate/mock.js';

import { DepositProvider } from './deposit/DepositProvider.js';
import { MockDepositProvider } from './deposit/mock.js';

import { PayoutProvider } from './payout/PayoutProvider.js';
import { MockPayoutProvider } from './payout/mock.js';

// ─── Adapter factory ───────────────────────────────────────────────────────────
// One implementation per seam, selected from env (mock-first). Real vendors
// (UPI collection, live FX, Cashfree payout, HyperVerge KYC) slot in here in
// Phase D without touching the SEP-24 flow logic.

function makeRate(): RateProvider {
  switch (PROVIDERS.fee) {          // FEE_PROVIDER selects the FX/pricing source
    default: return new MockRateProvider();
  }
}

function makeDeposit(): DepositProvider {
  switch (PROVIDERS.deposit) {
    default: return new MockDepositProvider();
  }
}

function makePayout(): PayoutProvider {
  switch (PROVIDERS.payout) {
    default: return new MockPayoutProvider();
  }
}

export const rate    = makeRate();
export const deposit = makeDeposit();
export const payout  = makePayout();

console.log(`[adapters] rate=${PROVIDERS.fee} deposit=${PROVIDERS.deposit} payout=${PROVIDERS.payout} (kyc=${PROVIDERS.kyc} — Phase D)`);
