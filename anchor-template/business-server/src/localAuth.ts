import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from './db.js';
import {
  AUTH_MODE,
  OPERATOR_EMAIL,
  LOCAL_JWT_SECRET,
  RESEND_API_KEY,
  EMAIL_FROM,
  PUBLIC_BASE_URL,
  ANCHOR_SLUG,
  ASSET_CODE,
} from './config.js';

// ─── Utility: Simple JSON Token issuer/verifier ─────────────────────────────
function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signJwt(payload: object, expiresSecond: number = 24 * 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const extendedPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresSecond,
  };
  const part1 = b64urlEncode(Buffer.from(JSON.stringify(header)));
  const part2 = b64urlEncode(Buffer.from(JSON.stringify(extendedPayload)));
  const signature = crypto.createHmac('sha256', LOCAL_JWT_SECRET)
    .update(`${part1}.${part2}`)
    .digest();
  const part3 = b64urlEncode(signature);
  return `${part1}.${part2}.${part3}`;
}

// ─── Utility: OTP Generator ──────────────────────────────────────────────────
function generateOtp(): { code: string; hash: string } {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return { code, hash };
}

function otpMatches(code: string, hash: string): boolean {
  const a = Buffer.from(crypto.createHash('sha256').update(code).digest('hex'));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── Utility: Local Mailer (console/resend) ──────────────────────────────────
async function sendOtpEmail(to: string, code: string) {
  const brand = '#5a49c9';
  const html = `
  <div style="background:#f5f4f8;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ececf2">
        <tr><td style="padding:22px 28px;border-bottom:1px solid #f0eff5">
          <span style="font-size:16px;font-weight:700;color:#1a1a24">Nord<span style="color:${brand}">Stern</span></span>
        </td></tr>
        <tr><td style="padding:26px 28px 28px">
          <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3;color:#1a1a24">Your sign-in code</h1>
          <div style="font-size:14px;line-height:1.6;color:#4a4a58">
            <p style="margin:0 0 10px">Use this one-time code to sign in:</p>
            <p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#1a1a24;margin:0">${code}</p>
          </div>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#a4a4b0">Anchor infrastructure · testnet</p>
    </td></tr></table>
  </div>`;

  console.log(`[local-email] Sending OTP to ${to}: ${code}`);

  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to,
          subject: `${code} is your NordStern sign-in code`,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[local-email] Resend API error:', errText);
      }
    } catch (err) {
      console.error('[local-email] Failed to send via Resend:', err);
    }
  }
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────
const cookieOptions = {
  httpOnly: true,
  secure: false, // In local dev we don't force secure/HTTPS
  sameSite: 'lax' as const,
  path: '/',
};

function setOperatorCookies(res: Response, sub: string) {
  const accessToken = signJwt({ sub }, 900); // 15 mins
  const refreshToken = signJwt({ sub, isRefresh: true }, 30 * 24 * 3600); // 30 days
  res.cookie('ns_access', accessToken, { ...cookieOptions, maxAge: 900 * 1000 });
  res.cookie('ns_refresh', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 3600 * 1000 });
}

function clearOperatorCookies(res: Response) {
  res.clearCookie('ns_access', cookieOptions);
  res.clearCookie('ns_refresh', cookieOptions);
}

function setCustomerCookie(res: Response, customerId: string) {
  const token = signJwt({ sub: customerId, typ: 'customer' }, 30 * 24 * 3600); // 30 days
  res.cookie('ns_customer', token, { ...cookieOptions, maxAge: 30 * 24 * 3600 * 1000 });
}

function clearCustomerCookie(res: Response) {
  res.clearCookie('ns_customer', cookieOptions);
}

// ─── Seed First Operator ─────────────────────────────────────────────────────
export async function syncStrategyConfig() {
  if (AUTH_MODE !== 'local') return;
  try {
    const config = {
      minDeposit: Number(process.env.ANCHOR_MIN_DEPOSIT || 500),
      maxDeposit: Number(process.env.ANCHOR_MAX_DEPOSIT || 500000),
      maxSingleTx: Number(process.env.ANCHOR_MAX_SINGLE_TX || 100000),
      dailyVolumeLimit: Number(process.env.ANCHOR_DAILY_VOLUME_LIMIT || 1000000),
      fixedFee: Number(process.env.ANCHOR_FIXED_FEE || 8),
      percentageFee: Number(process.env.ANCHOR_PERCENTAGE_FEE || 0.05),
      feeTiers: [{ limit: 10000, fee: 0.05 }, { limit: 50000, fee: 0.03 }, { limit: 200000, fee: 0.01 }],
      supportedRails: ["UPI", "IMPS", "NEFT"],
      emergencyStop: false,
      maintenanceMode: false,
      autoPauseThreshold: 5000,
      riskScoreThreshold: 75,
      settlementBufferMin: 30,
      anchorName: process.env.ANCHOR_NAME || "My Local Anchor",
      brandColor: process.env.ANCHOR_BRAND_COLOR || "#5a49c9",
    };

    // Strategy configuration is seeded with id = 1 in baseline
    await pool.query(
      `INSERT INTO nordstern.strategy_config (id, version, config) 
       VALUES (1, 1, $1) 
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = now()`,
      [JSON.stringify(config)],
    );
    console.log(`[local-auth] Strategy configuration synced`);
  } catch (err) {
    console.error('[local-auth] Failed to sync strategy config:', err);
  }
}

export async function seedFirstOperator() {
  if (AUTH_MODE !== 'local') return;
  try {
    const email = OPERATOR_EMAIL.trim().toLowerCase();
    await pool.query(
      `INSERT INTO nordstern.operators (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email],
    );
    console.log(`[local-auth] Operator seeded: ${email}`);
    await syncStrategyConfig();
  } catch (err) {
    console.error('[local-auth] Failed to seed first operator:', err);
  }
}

// ─── Express Local Auth Router ──────────────────────────────────────────────
export const localAuthRouter = Router();

// Operator Request OTP
localAuthRouter.post('/auth/otp/request', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!email) {
       res.status(400).json({ error: 'Email is required' });
       return;
    }
    // Verify operator exists
    const { rows } = await pool.query(`SELECT email FROM nordstern.operators WHERE email = $1`, [email]);
    if (rows.length === 0) {
      // Return ok to prevent enum, but don't send mail
      res.json({ ok: true });
      return;
    }

    const { code, hash } = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await pool.query(
      `INSERT INTO nordstern.otps (email, audience, code_hash, expires_at) VALUES ($1, 'operator', $2, $3)`,
      [email, hash, expiresAt],
    );

    await sendOtpEmail(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Operator Verify OTP
localAuthRouter.post('/auth/otp/verify', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const code = String(req.body.code ?? '').trim();

    const { rows } = await pool.query(
      `SELECT * FROM nordstern.otps 
       WHERE email = $1 AND audience = 'operator' AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const otp = rows[0];
    if (!otp) {
       res.status(401).json({ error: 'Code expired or not found — request a new one' });
       return;
    }
    if (otp.attempts >= 3) {
       res.status(401).json({ error: 'Too many attempts — request a new code' });
       return;
    }
    if (!otpMatches(code, otp.code_hash)) {
      await pool.query(`UPDATE nordstern.otps SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
       res.status(401).json({ error: 'Incorrect code' });
       return;
    }
    await pool.query(`UPDATE nordstern.otps SET consumed_at = now() WHERE id = $1`, [otp.id]);

    setOperatorCookies(res, email);
    res.json({ id: email, email, fullName: email.split('@')[0], isNew: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Operator Refresh
localAuthRouter.post('/auth/refresh', async (req, res) => {
  const raw = req.cookies?.ns_refresh;
  if (!raw) {
     res.status(401).json({ error: 'No session' });
     return;
  }
  // Verify token signature manually (simple JWT validation)
  try {
    const parts = raw.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.isRefresh) {
          setOperatorCookies(res, claims.sub);
          res.json({ ok: true });
          return;
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'Invalid session' });
});

// Operator Logout
localAuthRouter.post('/auth/logout', async (req, res) => {
  clearOperatorCookies(res);
  res.json({ ok: true });
});

// Operator GET Me
localAuthRouter.get('/auth/me', async (req, res) => {
  // Pull from ns_access
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_access;
  if (!token) {
     res.status(401).json({ error: 'unauthenticated' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now()) {
          res.json({
            user: { id: claims.sub, email: claims.sub, fullName: claims.sub.split('@')[0] },
            organizations: [{ id: 'local-org', name: 'Local Anchor Org', role: 'owner' }],
          });
          return;
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'unauthenticated' });
});

// GET Resolve Anchor
localAuthRouter.get('/anchors/resolve', async (req, res) => {
  res.json({
    organizationId: 'local-org',
    anchorId: 'local-anchor',
    name: 'Local Anchor',
    slug: ANCHOR_SLUG || 'local',
    status: 'active',
    role: 'owner',
  });
});

// Members & Invitations mocks to prevent dashboard crashes
localAuthRouter.get('/organizations/:orgId/members', async (req, res) => {
  const { rows } = await pool.query(`SELECT email FROM nordstern.operators`);
  const members = rows.map((r, i) => ({
    id: `mem-${i}`,
    email: r.email,
    fullName: r.email.split('@')[0],
    role: r.email === OPERATOR_EMAIL ? 'owner' : 'operator',
  }));
  res.json(members);
});

localAuthRouter.get('/organizations/:orgId/invitations', async (req, res) => {
  res.json([]);
});

localAuthRouter.post('/organizations/:orgId/invitations', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!email) {
       res.status(400).json({ error: 'Email is required' });
       return;
    }
    await pool.query(
      `INSERT INTO nordstern.operators (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

localAuthRouter.delete('/organizations/:orgId/members/:id', async (req, res) => {
  res.json({ ok: true });
});

localAuthRouter.patch('/organizations/:orgId/members/:id', async (req, res) => {
  res.json({ ok: true });
});

localAuthRouter.get('/organizations/:orgId/anchors/:anchorId/credentials', async (req, res) => {
  res.json({
    assetCode: ASSET_CODE,
    network: 'testnet',
  });
});

// ─── Customer Local Auth Endpoints ──────────────────────────────────────────

// Customer request OTP
localAuthRouter.post('/customer/auth/request-otp', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!email) {
       res.status(400).json({ error: 'Email is required' });
       return;
    }

    const { code, hash } = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await pool.query(
      `INSERT INTO nordstern.otps (email, audience, code_hash, expires_at) VALUES ($1, 'customer', $2, $3)`,
      [email, hash, expiresAt],
    );

    await sendOtpEmail(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Customer verify OTP
localAuthRouter.post('/customer/auth/verify-otp', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const code = String(req.body.code ?? '').trim();

    const { rows } = await pool.query(
      `SELECT * FROM nordstern.otps 
       WHERE email = $1 AND audience = 'customer' AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const otp = rows[0];
    if (!otp) {
       res.status(401).json({ error: 'Code expired or not found — request a new one' });
       return;
    }
    if (otp.attempts >= 3) {
       res.status(401).json({ error: 'Too many attempts — request a new code' });
       return;
    }
    if (!otpMatches(code, otp.code_hash)) {
      await pool.query(`UPDATE nordstern.otps SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
       res.status(401).json({ error: 'Incorrect code' });
       return;
    }
    await pool.query(`UPDATE nordstern.otps SET consumed_at = now() WHERE id = $1`, [otp.id]);

    // Find or create customer
    let customerRows = (await pool.query(
      `SELECT * FROM nordstern.customers WHERE email = $1`,
      [email],
    )).rows;
    let customer = customerRows[0];
    let isNew = false;
    if (!customer) {
      isNew = true;
      const insertRes = await pool.query(
        `INSERT INTO nordstern.customers (email, kyc_status) VALUES ($1, 'unverified') RETURNING *`,
        [email],
      );
      customer = insertRes.rows[0];
    } else {
      await pool.query(`UPDATE nordstern.customers SET last_login_at = now() WHERE id = $1`, [customer.id]);
    }

    setCustomerCookie(res, customer.id);
    res.json({
      customer: { id: customer.id, email: customer.email, kycStatus: customer.kyc_status, fullName: customer.full_name },
      token: signJwt({ sub: customer.id, typ: 'customer' }, 30 * 24 * 3600),
      isNew,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Customer logout
localAuthRouter.post('/customer/auth/logout', async (req, res) => {
  clearCustomerCookie(res);
  res.json({ ok: true });
});

// Customer GET Me
localAuthRouter.get('/customer/me', async (req, res) => {
  // Extract token from ns_customer
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          const { rows } = await pool.query(`SELECT * FROM nordstern.customers WHERE id = $1`, [claims.sub]);
          const customer = rows[0];
          if (customer) {
            res.json({ id: customer.id, email: customer.email, fullName: customer.full_name, kycStatus: customer.kyc_status, preferences: customer.preferences, createdAt: customer.created_at });
            return;
          }
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'not signed in' });
});

// Customer PATCH Me
localAuthRouter.patch('/customer/me', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          const { fullName, preferences } = req.body;
          if (fullName !== undefined && preferences !== undefined) {
            await pool.query(
              `UPDATE nordstern.customers SET full_name = $1, preferences = $2, updated_at = now() WHERE id = $3`,
              [fullName, JSON.stringify(preferences), claims.sub],
            );
          } else if (fullName !== undefined) {
            await pool.query(
              `UPDATE nordstern.customers SET full_name = $1, updated_at = now() WHERE id = $2`,
              [fullName, claims.sub],
            );
          } else if (preferences !== undefined) {
            await pool.query(
              `UPDATE nordstern.customers SET preferences = $1, updated_at = now() WHERE id = $2`,
              [JSON.stringify(preferences), claims.sub],
            );
          }
          const { rows } = await pool.query(`SELECT * FROM nordstern.customers WHERE id = $1`, [claims.sub]);
          const customer = rows[0];
          res.json({ id: customer.id, email: customer.email, fullName: customer.full_name, kycStatus: customer.kyc_status, preferences: customer.preferences });
          return;
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'not signed in' });
});

// Customer KYC status
localAuthRouter.get('/customer/kyc/status', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          const { rows } = await pool.query(`SELECT * FROM nordstern.customers WHERE id = $1`, [claims.sub]);
          const customer = rows[0];
          res.json({
            kycStatus: customer.kyc_status,
            verifiedAt: customer.didit_verified_at,
            sessionId: customer.didit_session_id,
          });
          return;
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'not signed in' });
});

// Customer Wallets List
localAuthRouter.get('/customer/wallets', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          const { rows } = await pool.query(
            `SELECT * FROM nordstern.customer_wallets WHERE customer_id = $1`,
            [claims.sub],
          );
          res.json(rows.map(w => ({
            id: w.id,
            address: w.address,
            label: w.label,
            network: w.network,
            createdAt: w.created_at,
          })));
          return;
        }
      }
    }
  } catch (err) {}
  res.status(401).json({ error: 'not signed in' });
});

// Customer Add Wallet
// ⚠️ SECURITY — SELF-HOST PARITY TODO (Identity Phase 1): this standalone identity plane still
// links a wallet WITHOUT ownership proof — the same P0 confidentiality bug already fixed on the
// platform-api path (a logged-in user could link any address they know and read this anchor's
// history for it). This router is currently UNMOUNTED (not wired into createApp), so it is not a
// live exposure — but before the self-host kit ships it MUST adopt the proven protocol:
// POST /customer/wallets/challenge + /customer/wallets/verify (SEP-10-style signed challenge,
// global-unique bond, proven-only history scoping). See docs/architecture/Identity.md and
// platform/api/src/lib/walletProof.ts (portable — business-server already has @stellar/stellar-sdk).
localAuthRouter.post('/customer/wallets', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          const { address, label } = req.body;
          if (!address) {
             res.status(400).json({ error: 'Address is required' });
             return;
          }
          const { rows } = await pool.query(
            `INSERT INTO nordstern.customer_wallets (customer_id, address, label) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (customer_id, address) DO UPDATE SET label = EXCLUDED.label
             RETURNING *`,
            [claims.sub, address, label || null],
          );
          const w = rows[0];
          res.json({
            id: w.id,
            address: w.address,
            label: w.label,
            network: w.network,
            createdAt: w.created_at,
          });
          return;
        }
      }
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }
  res.status(401).json({ error: 'not signed in' });
});

// Customer Remove Wallet
localAuthRouter.delete('/customer/wallets/:id', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') 
    ? req.headers.authorization.slice(7) 
    : req.cookies?.ns_customer;
  if (!token) {
     res.status(401).json({ error: 'not signed in' });
     return;
  }
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [header, payload, signature] = parts;
      const expected = crypto.createHmac('sha256', LOCAL_JWT_SECRET).update(`${header}.${payload}`).digest();
      const given = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
        const claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        if (claims.exp * 1000 > Date.now() && claims.typ === 'customer') {
          await pool.query(
            `DELETE FROM nordstern.customer_wallets WHERE id = $1 AND customer_id = $2`,
            [req.params.id, claims.sub],
          );
          res.json({ ok: true });
          return;
        }
      }
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }
  res.status(401).json({ error: 'not signed in' });
});

// Mock/internal route to get customer wallets
localAuthRouter.get('/internal/customers/:customerId/wallets', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT address FROM nordstern.customer_wallets WHERE customer_id = $1`,
      [req.params.customerId],
    );
    res.json({ addresses: rows.map(r => r.address) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
