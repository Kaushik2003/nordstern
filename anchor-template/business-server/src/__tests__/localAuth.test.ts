import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { startTestDb, type TestDb } from './_harness.js';
import http from 'http';

let tdb: TestDb;
let pool: Pool;
let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  // Set AUTH_MODE to local so createApp mounts the localAuthRouter
  process.env.AUTH_MODE = 'local';
  process.env.OPERATOR_EMAIL = 'operator-test@company.com';
  process.env.LOCAL_JWT_SECRET = 'test-secret-key-123456';
  process.env.KYC_PROVIDER = 'mock';
  process.env.ALLOW_MOCK_KYC = 'true';

  tdb = await startTestDb();
  pool = tdb.pool;

  const { seedFirstOperator } = await import('../localAuth.js');
  await seedFirstOperator();

  const { createApp } = await import('../app.js');
  const app = createApp();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'string' ? 0 : addr?.port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}, 180_000);

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
  await tdb?.stop();
});

describe('Standalone Local Authentication', () => {
  it('should seed the operator configured in env', async () => {
    const { rows } = await pool.query('SELECT * FROM nordstern.operators');
    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe('operator-test@company.com');
  });

  it('should support operator OTP request and verify', async () => {
    // 1. Request OTP
    const reqRes = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator-test@company.com' }),
    });
    expect(reqRes.ok).toBe(true);
    const reqJson = await reqRes.json();
    expect(reqJson).toEqual({ ok: true });

    // 2. Fetch code from database
    const { rows } = await pool.query('SELECT code_hash FROM nordstern.otps WHERE email = $1 AND audience = $2', [
      'operator-test@company.com',
      'operator',
    ]);
    expect(rows.length).toBe(1);

    // Since we only store hash, we can mock verification by finding the code that matches the hash,
    // or since this is a test and we generated it using crypto.randomInt, let's query the DB and verify.
    // Wait! Let's verify with an incorrect code first
    const verifyBadRes = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator-test@company.com', code: '000000' }),
    });
    expect(verifyBadRes.status).toBe(401);

    // Let's grab the generated code from the index of the database or inspect the table.
    // Wait! We don't save the plain code in the database, only the hash!
    // But wait, since we know it's a 6-digit code, we could theoretically brute force it in the test since 1,000,000 hashes takes under 100ms!
    // That is a fun and perfect way to verify the exact flow without changing production code!
    // Let's find the matching code:
    const hash = rows[0].code_hash;
    let correctCode = '';
    const crypto = await import('crypto');
    for (let i = 0; i < 1_000_000; i++) {
      const codeStr = String(i).padStart(6, '0');
      const testHash = crypto.createHash('sha256').update(codeStr).digest('hex');
      if (testHash === hash) {
        correctCode = codeStr;
        break;
      }
    }
    expect(correctCode).not.toBe('');

    // 3. Verify with the correct code
    const verifyRes = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator-test@company.com', code: correctCode }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.email).toBe('operator-test@company.com');

    // Check Set-Cookie headers
    const setCookie = verifyRes.headers.get('set-cookie');
    expect(setCookie).toContain('ns_access');
    expect(setCookie).toContain('ns_refresh');
  });

  it('should support customer OTP registration and flow', async () => {
    // 1. Request customer OTP
    const reqRes = await fetch(`${baseUrl}/api/v1/customer/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer-test@gmail.com' }),
    });
    expect(reqRes.ok).toBe(true);

    // 2. Resolve code via local brute force
    const { rows } = await pool.query('SELECT code_hash FROM nordstern.otps WHERE email = $1 AND audience = $2', [
      'customer-test@gmail.com',
      'customer',
    ]);
    const hash = rows[0].code_hash;
    let correctCode = '';
    const crypto = await import('crypto');
    for (let i = 0; i < 1_000_000; i++) {
      const codeStr = String(i).padStart(6, '0');
      const testHash = crypto.createHash('sha256').update(codeStr).digest('hex');
      if (testHash === hash) {
        correctCode = codeStr;
        break;
      }
    }

    // 3. Verify customer OTP
    const verifyRes = await fetch(`${baseUrl}/api/v1/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer-test@gmail.com', code: correctCode }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.customer.email).toBe('customer-test@gmail.com');
    expect(verifyJson.isNew).toBe(true);

    const customerToken = verifyJson.token;

    // 4. Get customer me info
    const meRes = await fetch(`${baseUrl}/api/v1/customer/me`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.email).toBe('customer-test@gmail.com');
    expect(meJson.kycStatus).toBe('unverified');

    // 5. Add a wallet
    const walletRes = await fetch(`${baseUrl}/api/v1/customer/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ address: 'G1234567890123456789012345678901234567890123456789012345', label: 'Freighter' }),
    });
    expect(walletRes.status).toBe(200);
    const walletJson = await walletRes.json();
    expect(walletJson.address).toBe('G1234567890123456789012345678901234567890123456789012345');

    // 6. List wallets
    const listRes = await fetch(`${baseUrl}/api/v1/customer/wallets`, {
      headers: { 'Authorization': `Bearer ${customerToken}` },
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.length).toBe(1);
    expect(listJson[0].address).toBe('G1234567890123456789012345678901234567890123456789012345');
  });
});
