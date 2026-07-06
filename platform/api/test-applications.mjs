const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('--- NordStern Onboarding End-to-End Test ---');
  
  // 0. Register and login to get auth cookies
  const randomId = Math.random().toString(36).substring(2, 7);
  const email = `admin-${randomId}@nexuspay.io`;
  const password = 'Password123!';

  console.log(`\n[0] Registering test admin user (${email})...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Global Admin',
      email,
      password
    })
  });
  
  if (!regRes.ok) {
    const err = await regRes.json();
    console.error('❌ Registration failed:', err);
    process.exit(1);
  }

  console.log('[0] Logging in test admin to obtain session cookies...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error('❌ Login failed');
    process.exit(1);
  }

  const rawCookies = loginRes.headers.get('set-cookie');
  if (!rawCookies) {
    console.error('❌ No cookies returned from login');
    process.exit(1);
  }

  // Format cookie string to only pass back required cookies
  const cookies = rawCookies.split(',').map(c => c.split(';')[0]).join('; ');

  // 1. Submit Application
  console.log('\n[1] Submitting new business application...');
  const appRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyProfile: {
        legalEntityName: 'Acme Pay Incorporated',
        corporateWebsiteUrl: 'https://acmepay.io',
        countryOfIncorporation: 'India',
        businessEmail: 'compliance@acmepay.io',
        targetCorridors: ['India']
      },
      stellarConfig: {
        targetAssetCode: 'USDC',
        assetType: 'AlphaNum4',
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
    })
  });

  const appData = await appRes.json();
  if (appRes.ok) {
    console.log('✔ Success! Application created:', appData.id);
  } else {
    console.error('❌ Failed:', appData);
    process.exit(1);
  }

  // 2. Approve Application
  console.log(`\n[2] Approving application ${appData.id}...`);
  const approveRes = await fetch(`${BASE_URL}/applications/${appData.id}/approve`, {
    method: 'POST',
    headers: { 'Cookie': cookies }
  });
  const approveData = await approveRes.json();
  if (approveRes.ok) {
    console.log('✔ Success! Application approved.');
    console.log('✔ Invitation raw token generated:', approveData.rawToken);
  } else {
    console.error('❌ Failed to approve application:', approveData);
    process.exit(1);
  }

  // 3. Redeem Invitation Token & Select Subdomain
  const subdomain = `acme-pay-${randomId}`;
  console.log(`\n[3] Redeeming invitation and selecting subdomain: ${subdomain}.nordstern.live...`);
  const redeemRes = await fetch(`${BASE_URL}/anchor-invitations/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: approveData.rawToken,
      subdomain,
      fullName: 'Acme Operator',
      password: 'Password123!'
    })
  });
  const redeemData = await redeemRes.json();
  if (redeemRes.ok) {
    console.log('✔ Success! Invitation redeemed.');
    console.log('✔ Provisioning job triggered:', redeemData.jobId);
    console.log('\n--- Pipeline Triggered Successfully ---');
    console.log(`To verify container launch, run: docker ps --filter "name=${subdomain}" after a few seconds.`);
  } else {
    console.error('❌ Failed to redeem invitation:', redeemData);
    process.exit(1);
  }
}

run().catch(console.error);
