import { describe, it, expect, beforeAll } from 'vitest';

describe('Mainnet Gating Fail-Closed Validation', () => {
  beforeAll(() => {
    // Set environment variables to simulate mainnet with mock configuration
    process.env.HORIZON_URL = 'https://horizon.stellar.org';
    process.env.NETWORK_PASSPHRASE = 'Public Global Stellar Network ; October 2015';
    process.env.KYC_PROVIDER = 'mock';
    process.env.DEPOSIT_PROVIDER = 'mock';
    process.env.PAYOUT_PROVIDER = 'mock';
  });

  it('should refuse to load adapters module if mock KYC/deposit/payout is configured on mainnet', async () => {
    // Dynamic import to trigger the module evaluation after env vars are set
    await expect(import('../adapters/index.js')).rejects.toThrow(
      'FATAL: KYC_PROVIDER=mock is forbidden on mainnet.'
    );
  });
});
