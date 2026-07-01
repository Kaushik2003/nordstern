import { Router, Response } from 'express';
import { Keypair, Networks, Horizon, Asset, TransactionBuilder, BASE_FEE, Operation } from '@stellar/stellar-sdk';
import { pool } from './db.js';
import { requireAuth, AuthedRequest } from './auth.js';

export const tenantsRouter = Router();
tenantsRouter.use(requireAuth as any);

const ASSET_CODE    = process.env.ASSET_CODE ?? 'ANCH';
const INITIAL_SUPPLY = '1000000';
const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');

// GET /tenants/me — current tenant with balances
tenantsRouter.get('/me', async (req: AuthedRequest, res: Response) => {
  const { rows: [tenant] } = await pool.query(
    `SELECT t.*, tc.*, array_agg(row_to_json(tk)) as keypairs
     FROM tenants t
     LEFT JOIN tenant_config tc ON tc.tenant_id = t.id
     LEFT JOIN tenant_keypairs tk ON tk.tenant_id = t.id
     WHERE t.id = $1
     GROUP BY t.id, tc.tenant_id`,
    [req.tenantId],
  );
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return; }

  // Fetch on-chain balance for distribution account
  const distKey = tenant.keypairs?.find((k: any) => k.role === 'distribution');
  let onchain = null;
  if (distKey && tenant.status === 'active') {
    try {
      const acc = await horizon.loadAccount(distKey.public_key);
      const bal = acc.balances.find((b: any) => b.asset_code === ASSET_CODE);
      onchain = bal?.balance ?? '0';
    } catch { /* account not funded yet */ }
  }

  res.json({ ...tenant, onchain_balance: onchain });
});

// POST /tenants/:id/provision — generate keypairs + fund + setup ANCH
tenantsRouter.post('/:id/provision', async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  if (id !== req.tenantId) { res.status(403).json({ error: 'Forbidden' }); return; }

  const { rows: [existing] } = await pool.query(
    `SELECT * FROM tenant_keypairs WHERE tenant_id = $1`, [id],
  );
  if (existing) {
    res.status(400).json({ error: 'Already provisioned' });
    return;
  }

  // 1. Generate keypairs
  const signing      = Keypair.random();
  const distribution = Keypair.random();
  const issuer       = Keypair.random();

  const keypairs = [
    { role: 'signing',      kp: signing },
    { role: 'distribution', kp: distribution },
    { role: 'issuer',       kp: issuer },
  ];

  for (const { role, kp } of keypairs) {
    await pool.query(
      `INSERT INTO tenant_keypairs (tenant_id, role, public_key, secret_key) VALUES ($1,$2,$3,$4)`,
      [id, role, kp.publicKey(), kp.secret()],
    );
  }

  res.json({
    message: 'Keypairs generated. Funding in progress.',
    accounts: {
      signing:      signing.publicKey(),
      distribution: distribution.publicKey(),
      issuer:       issuer.publicKey(),
    },
  });

  // 2. Fund via Friendbot (async — don't block the response)
  setImmediate(async () => {
    try {
      await pool.query(`UPDATE tenants SET status='funding' WHERE id=$1`, [id]);

      for (const kp of [signing, distribution, issuer]) {
        await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
        await new Promise(r => setTimeout(r, 2000)); // wait for ledger
      }

      // 3. Distribution creates trustline to Issuer
      const distAcc = await horizon.loadAccount(distribution.publicKey());
      const asset   = new Asset(ASSET_CODE, issuer.publicKey());

      const trustTx = new TransactionBuilder(distAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.changeTrust({ asset, limit: INITIAL_SUPPLY }))
        .setTimeout(30).build();
      trustTx.sign(distribution);
      await horizon.submitTransaction(trustTx);
      await new Promise(r => setTimeout(r, 3000));

      // 4. Issuer mints ANCH → Distribution
      const issuerAcc = await horizon.loadAccount(issuer.publicKey());
      const mintTx = new TransactionBuilder(issuerAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.payment({ destination: distribution.publicKey(), asset, amount: INITIAL_SUPPLY }))
        .setTimeout(30).build();
      mintTx.sign(issuer);
      await horizon.submitTransaction(mintTx);

      await pool.query(`UPDATE tenants SET status='active' WHERE id=$1`, [id]);
      console.log(`[provision] tenant ${id} is now active`);
    } catch (err: any) {
      console.error(`[provision] failed for ${id}:`, err.message);
      await pool.query(`UPDATE tenants SET status='error' WHERE id=$1`, [id]);
    }
  });
});

// GET /tenants/:id/status — poll during onboarding
tenantsRouter.get('/:id/status', async (req: AuthedRequest, res: Response) => {
  if (req.params.id !== req.tenantId) { res.status(403).json({ error: 'Forbidden' }); return; }
  const { rows: [tenant] } = await pool.query(
    `SELECT t.status, t.network, array_agg(row_to_json(tk)) as keypairs
     FROM tenants t
     LEFT JOIN tenant_keypairs tk ON tk.tenant_id = t.id
     WHERE t.id = $1 GROUP BY t.id`,
    [req.params.id],
  );
  res.json(tenant ?? { status: 'unknown' });
});
