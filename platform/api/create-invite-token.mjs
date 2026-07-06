import 'dotenv/config';
import { applicationService } from './src/services/application.service.js';
import { applicationsRepo } from './src/repositories/applications.repo.js';

const randomId = Math.random().toString(36).substring(2, 7);
const targetAssetCode = (process.argv[2] || 'INR').toUpperCase();

async function run() {
  // Create application with correct repo column keys
  const app = await applicationsRepo.create({
    profile: {
      legalEntityName: `Mizu Pay ${randomId}`,
      corporateWebsiteUrl: 'https://mizupay.io',
      countryOfIncorporation: 'India',
      businessEmail: `compliance-${randomId}@mizupay.io`,
      targetCorridors: ['India']
    },
    stellarCfg: {
      targetAssetCode,
      assetType: 'AlphaNum12',
      keyGenerationMode: 'auto',
      hasBackedUpKeys: true
    },
    paymentRails: {
      supportedRails: ['UPI'],
      minTransactionBound: '10',
      maxTransactionBound: '5000',
      feeArchitectureType: 'Hybrid Fee (Flat + %)',
      flatFeeValue: '10',
      percentageFeeValue: '0.01'
    },
    compliance: {
      financialRegulatoryStatus: 'Fully Licensed - Holds an active MSB, MTL, EMI, or equivalent domestic license.',
      kycProvider: 'Persona',
      verificationFields: ['PAN', 'Aadhaar']
    }
  });

  console.log(`Application created: ${app.id}`);

  // Approve application
  const result = await applicationService.approve(app.id);
  console.log('\n--- VOUCHER ACQUIRED ---');
  console.log(`Voucher Token: ${result.rawToken}`);
  console.log(`Redemption URL: http://localhost:3000/redeem?token=${result.rawToken}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
