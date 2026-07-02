import { PROVIDERS } from '../config.js';

import { RateProvider } from './rate/RateProvider.js';
import { MockRateProvider } from './rate/mock.js';
import { LiveRateProvider } from './rate/live.js';

import { DepositProvider } from './deposit/DepositProvider.js';
import { MockDepositProvider } from './deposit/mock.js';
import { UpiDepositProvider } from './deposit/upi.js';

import { PayoutProvider } from './payout/PayoutProvider.js';
import { MockPayoutProvider } from './payout/mock.js';
import { CashfreePayoutProvider } from './payout/cashfree.js';

import { KycProvider } from './kyc/KycProvider.js';
import { MockKycProvider } from './kyc/mock.js';
import { SurepassKycProvider } from './kyc/surepass.js';

// ─── Adapter factory ───────────────────────────────────────────────────────────
// One implementation per seam, selected from env (mock-first). Real vendors slot
// in here without touching the SEP-24 flow logic.

function makeRate(): RateProvider {
  switch (PROVIDERS.fee) {          // FEE_PROVIDER selects the FX/pricing source
    case 'live': return new LiveRateProvider();
    default:     return new MockRateProvider();
  }
}

function makeDeposit(): DepositProvider {
  switch (PROVIDERS.deposit) {
    case 'upi': return new UpiDepositProvider();
    default: return new MockDepositProvider();
  }
}

function makePayout(): PayoutProvider {
  switch (PROVIDERS.payout) {
    case 'cashfree': return new CashfreePayoutProvider();
    default: return new MockPayoutProvider();
  }
}

function makeKyc(): KycProvider {
  switch (PROVIDERS.kyc) {
    case 'surepass': return new SurepassKycProvider();
    default:         return new MockKycProvider();
  }
}

export const rate    = makeRate();
export const deposit = makeDeposit();
export const payout  = makePayout();
export const kyc     = makeKyc();

console.log(`[adapters] kyc=${PROVIDERS.kyc} rate=${PROVIDERS.fee} deposit=${PROVIDERS.deposit} payout=${PROVIDERS.payout}`);
