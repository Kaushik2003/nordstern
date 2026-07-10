import { PROVIDERS, DIDIT_API_KEY, IS_MAINNET, ALLOW_MOCK_KYC } from '../config.js';

import { RateProvider } from './rate/RateProvider.js';
import { MockRateProvider } from './rate/mock.js';
import { LiveRateProvider } from './rate/live.js';
import { CmcRateProvider } from './rate/cmc.js';
import { CoinGeckoRateProvider } from './rate/coingecko.js';

import { DepositProvider } from './deposit/DepositProvider.js';
import { MockDepositProvider } from './deposit/mock.js';
import { UpiDepositProvider } from './deposit/upi.js';
import { RazorpayDepositProvider } from './deposit/razorpay.js';

import { PayoutProvider } from './payout/PayoutProvider.js';
import { MockPayoutProvider } from './payout/mock.js';
import { CashfreePayoutProvider } from './payout/cashfree.js';

import { KycProvider } from './kyc/KycProvider.js';
import { MockKycProvider } from './kyc/mock.js';
import { SurepassKycProvider } from './kyc/surepass.js';
import { DiditKycProvider } from './kyc/didit.js';

// ─── Adapter factory ───────────────────────────────────────────────────────────
// One implementation per seam, selected from env (mock-first). Real vendors slot
// in here without touching the SEP-24 flow logic.

function makeRate(): RateProvider {
  // Real live prices by DEFAULT (XLM/USD/INR via CoinGecko) — no mock, no fallback.
  // The mock is only used if a test explicitly asks for FEE_PROVIDER=mock-fixed.
  switch (PROVIDERS.fee) {          // FEE_PROVIDER selects the FX/pricing source
    case 'cmc':        return new CmcRateProvider();       // CoinMarketCap USDC→INR
    case 'live':       return new LiveRateProvider();      // generic USD→INR feed
    case 'mock-fixed': return new MockRateProvider();      // deliberate fixed rate (tests only)
    default:           return new CoinGeckoRateProvider(); // XLM + USD + INR, live
  }
}

function makeDeposit(): DepositProvider {
  switch (PROVIDERS.deposit) {
    case 'razorpay': return new RazorpayDepositProvider();   // real INR collection + verification
    case 'upi':      return new UpiDepositProvider();
    default:         return new MockDepositProvider();
  }
}

function makePayout(): PayoutProvider {
  switch (PROVIDERS.payout) {
    case 'cashfree': return new CashfreePayoutProvider();
    default: return new MockPayoutProvider();
  }
}

// KYC is fail-closed: a real anchor must never silently run on auto-approve. Real
// providers refuse to start if their credentials are missing (better to fail loudly
// at boot than to approve everyone). Mock is dev-only — it requires an explicit
// ALLOW_MOCK_KYC acknowledgement and is forbidden on mainnet regardless.
function makeKyc(): KycProvider {
  switch (PROVIDERS.kyc) {
    case 'didit':
      if (!DIDIT_API_KEY) {
        throw new Error(
          'KYC_PROVIDER=didit but DIDIT_API_KEY is not set — refusing to start without real KYC. ' +
          'Configure DIDIT, or for LOCAL DEV ONLY set KYC_PROVIDER=mock ALLOW_MOCK_KYC=true.',
        );
      }
      return new DiditKycProvider();

    case 'surepass':
      if (!process.env.SUREPASS_TOKEN) {
        throw new Error('KYC_PROVIDER=surepass but SUREPASS_TOKEN is not set — refusing to start without real KYC.');
      }
      return new SurepassKycProvider();

    case 'mock':
      if (IS_MAINNET) {
        throw new Error('Mock KYC is forbidden on mainnet — it auto-approves every user. Configure a real KYC provider (didit/surepass).');
      }
      if (!ALLOW_MOCK_KYC) {
        throw new Error(
          'KYC_PROVIDER=mock is DISABLED: mock KYC auto-approves everyone and must never run as a real anchor. ' +
          'For local dev only, set ALLOW_MOCK_KYC=true to acknowledge. Otherwise use KYC_PROVIDER=didit or surepass.',
        );
      }
      console.warn('\n⚠️  ⚠️  ⚠️   MOCK KYC ENABLED — every user is auto-approved. DEV ONLY. NEVER on mainnet/production.   ⚠️  ⚠️  ⚠️\n');
      return new MockKycProvider();

    default:
      throw new Error(`Unknown KYC_PROVIDER='${PROVIDERS.kyc}'. Use 'didit' or 'surepass' (real); 'mock' is dev-only behind ALLOW_MOCK_KYC.`);
  }
}

export const rate    = makeRate();
export const deposit = makeDeposit();
export const payout  = makePayout();
export const kyc     = makeKyc();

console.log(`[adapters] kyc=${PROVIDERS.kyc} rate=${PROVIDERS.fee} deposit=${PROVIDERS.deposit} payout=${PROVIDERS.payout}`);
