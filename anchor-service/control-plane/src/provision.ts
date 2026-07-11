import { Router, Response } from 'express';
import { pool } from './db.js';
import { requireAuth, AuthedRequest } from './auth.js';
import { encryptSecret } from './crypto.js';
import {
  generateKeypairs, provisionAssetOnChain, assetCodeFromSlug, verifyExternalTreasury,
} from './stellar.js';
import { generateAnchorConfig } from './config-gen.js';
import {
  createAnchorStack, createAnchorDb, dropAnchorDb, removeStack, waitHealthy, anchorDbName,
} from './orchestrator.js';
import { Keypair } from '@stellar/stellar-sdk';
import {
  ASSET_MODEL, EXTERNAL_ASSET_CODE, EXTERNAL_ASSET_ISSUER,
  TREASURY_SECRET, assertExternalAssetConfig,
} from './assetModel.js';

export const anchorsRouter = Router();
anchorsRouter.use(requireAuth as any);

const DOMAIN_SUFFIX = process.env.ANCHOR_DOMAIN_SUFFIX ?? 'anchors.localhost';
const SUREPASS_BASE_URL = process.env.SUREPASS_BASE_URL ?? 'https://sandbox.surepass.io';
const SUREPASS_TOKEN    = process.env.SUREPASS_TOKEN    ?? '';

const ADAPTER_KINDS = ['kyc', 'deposit', 'payout', 'fee'] as const;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Slugs an anchor may never use — each anchor is served at `<slug>.<domain>` (and
// `console-<slug>.…`), so a slug matching a platform host would hijack it. Defense-in-depth:
// platform-api already rejects these at redeem; this guards the control-plane's own entry.
// Keep in sync with platform/api/src/lib/slug.ts RESERVED_SLUGS.
const RESERVED_SLUGS = new Set([
  'admin', 'register', 'console', 'api', 'sep', 'www', 'app', 'auth', 'docs',
  'mail', 'status', 'dashboard', 'anchors', 'aggregator', 'platform', 'nordstern',
]);

async function ownedAnchor(id: string, userId: string) {
  const { rows: [a] } = await pool.query(
    `SELECT * FROM tenants WHERE id = $1 AND owner_user_id = $2`, [id, userId],
  );
  return a ?? null;
}

async function setStatus(id: string, status: string, detail = ''): Promise<void> {
  await pool.query(
    `UPDATE tenants SET stack_status = $1, status_detail = $2 WHERE id = $3`,
    [status, detail, id],
  );
}

// ── POST /anchors — create an anchor record (owner-scoped) ─────────────────────
anchorsRouter.post('/', async (req: AuthedRequest, res: Response) => {
  const {
    name,
    adapters,
    legal_entity_name,
    company_type,
    use_case,
    country,
    fiu_registration_status,
    support_email,
    branding,
    asset_code,
    asset_name,
    asset_model,
    asset_price_inr,
    min_txn,
    max_txn,
  } = req.body as any;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  // The founder's chosen asset code (1–12 alphanumerics). Empty → derive from slug later.
  const chosenAssetCode = String(asset_code ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || null;
  // asset_name/model/price have no columns; carry them in the open branding map (same
  // pattern as assetName) so provisioning can read the per-anchor asset model + price.
  const brandingObj: Record<string, unknown> = branding && typeof branding === 'object' ? { ...branding } : {};
  if (asset_name && typeof asset_name === 'string') brandingObj.assetName = asset_name.trim();
  if (asset_model === 'external' || asset_model === 'self-issued') brandingObj.assetModel = asset_model;
  // Fixed INR-per-token price for a custom self-issued token (no market to quote). Keep as a
  // clean numeric string; ignore junk.
  if (asset_price_inr != null && Number.isFinite(Number(asset_price_inr)) && Number(asset_price_inr) > 0) {
    brandingObj.assetPriceInr = String(Number(asset_price_inr));
  }
  // Founder's per-transaction limits (asset units). Stored in the branding map like the above.
  if (min_txn != null && Number.isFinite(Number(min_txn)) && Number(min_txn) > 0) {
    brandingObj.minTxn = String(Number(min_txn));
  }
  if (max_txn != null && Number.isFinite(Number(max_txn)) && Number(max_txn) > 0) {
    brandingObj.maxTxn = String(Number(max_txn));
  }

  let slug = slugify(name);
  if (!slug) { res.status(400).json({ error: 'name must contain letters or digits' }); return; }
  if (RESERVED_SLUGS.has(slug)) { res.status(400).json({ error: `slug "${slug}" is reserved` }); return; }
  // Ensure slug uniqueness.
  const { rows: clash } = await pool.query(`SELECT 1 FROM tenants WHERE slug = $1`, [slug]);
  if (clash.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const { rows: [anchor] } = await pool.query(
      `INSERT INTO tenants (
         name, slug, owner_user_id, home_domain, stack_status, status,
         legal_entity_name, company_type, use_case, country, fiu_registration_status, support_email, branding, asset_code
       )
       VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name, slug, req.userId, `${slug}.${DOMAIN_SUFFIX}`,
        legal_entity_name || null, company_type || null, use_case || null, country || null,
        fiu_registration_status || null, support_email || null,
        JSON.stringify(brandingObj), chosenAssetCode,
      ],
    );
    await pool.query(`INSERT INTO tenant_config (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [anchor.id]);
    await pool.query(
      `INSERT INTO anchor_adapters (tenant_id, kyc_provider, deposit_provider, payout_provider, fee_provider)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      // KYC defaults to REAL (didit) — universal across every NordStern anchor. Other
      // seams stay mock-first until their per-anchor credentials are supplied.
      [anchor.id, adapters?.kyc ?? 'didit', adapters?.deposit ?? 'mock', adapters?.payout ?? 'mock', adapters?.fee ?? 'mock'],
    );
    res.json(anchor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /anchors — list my anchors ─────────────────────────────────────────────
anchorsRouter.get('/', async (req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query(
    `SELECT t.*, a.kyc_provider, a.deposit_provider, a.payout_provider, a.fee_provider
     FROM tenants t LEFT JOIN anchor_adapters a ON a.tenant_id = t.id
     WHERE t.owner_user_id = $1 ORDER BY t.created_at DESC`,
    [req.userId],
  );
  res.json(rows);
});

// ── GET /anchors/:id — detail (public keys only, never ciphertext) ─────────────
anchorsRouter.get('/:id', async (req: AuthedRequest, res: Response) => {
  const anchor = await ownedAnchor(req.params.id, req.userId!);
  if (!anchor) { res.status(404).json({ error: 'Not found' }); return; }
  const { rows: keypairs } = await pool.query(
    `SELECT role, public_key FROM anchor_secrets WHERE tenant_id = $1`, [anchor.id],
  );
  const { rows: [adapters] } = await pool.query(
    `SELECT kyc_provider, deposit_provider, payout_provider, fee_provider FROM anchor_adapters WHERE tenant_id = $1`,
    [anchor.id],
  );
  res.json({ ...anchor, keypairs, adapters });
});

// ── GET /anchors/:id/status — poll during provisioning ─────────────────────────
anchorsRouter.get('/:id/status', async (req: AuthedRequest, res: Response) => {
  const anchor = await ownedAnchor(req.params.id, req.userId!);
  if (!anchor) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ stack_status: anchor.stack_status, status_detail: anchor.status_detail, home_domain: anchor.home_domain });
});

// ── POST /anchors/:id/provision — run the lifecycle (async) ─────────────────────
anchorsRouter.post('/:id/provision', async (req: AuthedRequest, res: Response) => {
  const anchor = await ownedAnchor(req.params.id, req.userId!);
  if (!anchor) { res.status(404).json({ error: 'Not found' }); return; }
  if (anchor.stack_status === 'provisioning' || anchor.stack_status === 'active') {
    res.status(400).json({ error: `Anchor is already ${anchor.stack_status}` });
    return;
  }

  res.json({ message: 'Provisioning started', slug: anchor.slug });
  // Run asynchronously — the frontend polls /status.
  setImmediate(() => runProvision(anchor).catch(async (err) => {
    console.error(`[provision] ${anchor.slug} failed:`, err.message);
    await setStatus(anchor.id, 'error', err.message);
    await removeStack(anchor.slug).catch(() => {});
    await dropAnchorDb(anchor.slug).catch(() => {});
  }));
});

async function runProvision(anchor: any): Promise<void> {
  const { id, slug, name, home_domain, legal_entity_name, branding, asset_code } = anchor;
  // Display/brand name for the provisioned surfaces; falls back to the slug-safe name.
  const displayName = legal_entity_name || name;
  // branding is a jsonb column — pg returns it already parsed. Guard for safety.
  const brand: Record<string, string> = branding && typeof branding === 'object' ? branding : {};

  await setStatus(id, 'provisioning', 'Generating keypairs');

  // Per-anchor asset model (the founder's redeem choice), stored on the tenant's branding
  // map: 'external' (distribute Circle USDC) or 'self-issued' (mint a custom test token).
  // Falls back to the control-plane's global ASSET_MODEL default when a legacy/direct-API
  // anchor didn't specify one — so the existing single-mode stacks are unchanged.
  const anchorAssetModel =
    brand.assetModel === 'external' || brand.assetModel === 'self-issued'
      ? brand.assetModel
      : ASSET_MODEL;
  const isExternal = anchorAssetModel === 'external';

  let signingKp: Keypair;
  let distributionKp: Keypair;
  let issuerKp: Keypair | null = null;
  let issuerPublic: string;
  let assetCode: string;

  if (isExternal) {
    assertExternalAssetConfig();
    signingKp = Keypair.random();
    distributionKp = Keypair.fromSecret(TREASURY_SECRET);
    issuerPublic = EXTERNAL_ASSET_ISSUER;
    assetCode = EXTERNAL_ASSET_CODE;
  } else {
    const kps = generateKeypairs();
    signingKp = kps.signing;
    distributionKp = kps.distribution;
    issuerKp = kps.issuer;
    issuerPublic = kps.issuer.publicKey();
    assetCode = (asset_code && String(asset_code).trim()) || assetCodeFromSlug(slug);
  }

  // Idempotent re-provision (retry after a failed attempt): clear any partial state
  // from a prior run so re-inserting keypairs can't collide. Keys are regenerated
  // above, so dropping the old rows is safe.
  await pool.query(`DELETE FROM anchor_secrets WHERE tenant_id = $1`, [id]);

  // Encrypt + store secrets (public key stays in the clear).
  const sealedSigning = encryptSecret(signingKp.secret());
  await pool.query(
    `INSERT INTO anchor_secrets (tenant_id, role, public_key, ciphertext, iv, tag)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, 'signing', signingKp.publicKey(), sealedSigning.ciphertext, sealedSigning.iv, sealedSigning.tag],
  );

  const sealedDistribution = encryptSecret(distributionKp.secret());
  await pool.query(
    `INSERT INTO anchor_secrets (tenant_id, role, public_key, ciphertext, iv, tag)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, 'distribution', distributionKp.publicKey(), sealedDistribution.ciphertext, sealedDistribution.iv, sealedDistribution.tag],
  );

  if (!isExternal && issuerKp) {
    const sealedIssuer = encryptSecret(issuerKp.secret());
    await pool.query(
      `INSERT INTO anchor_secrets (tenant_id, role, public_key, ciphertext, iv, tag)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, 'issuer', issuerKp.publicKey(), sealedIssuer.ciphertext, sealedIssuer.iv, sealedIssuer.tag],
    );
  }

  await pool.query(
    `UPDATE tenants SET asset_code = $1, asset_issuer = $2 WHERE id = $3`,
    [assetCode, issuerPublic, id],
  );

  if (isExternal) {
    await setStatus(id, 'provisioning', 'Verifying external treasury');
    await verifyExternalTreasury(distributionKp.publicKey());
  } else {
    await setStatus(id, 'provisioning', 'Funding accounts & issuing asset on Stellar');
    const kps = {
      signing: signingKp,
      distribution: distributionKp,
      issuer: issuerKp!,
    };
    await provisionAssetOnChain(kps, assetCode);
  }

  await setStatus(id, 'provisioning', 'Generating config');
  const database = anchorDbName(slug);
  await generateAnchorConfig({
    slug,
    // The anchor's SEP endpoints, stellar.toml, and SEP-10 home_domains must advertise
    // the SAME bare host that Traefik now routes (config-gen path-routes SEP on it).
    // (Was `sep.${home_domain}` under the old subdomain scheme — removed.)
    homeDomain: home_domain,
    database,
    assetCode,
    assetIssuer: issuerPublic,
    distributionPublic: distributionKp.publicKey(),
    signingPublic: signingKp.publicKey(),
    orgName: name,
  });

  await setStatus(id, 'provisioning', 'Creating database & containers');
  await createAnchorDb(slug);

  const { rows: [adapters] } = await pool.query(
    `SELECT kyc_provider, deposit_provider, payout_provider, fee_provider FROM anchor_adapters WHERE tenant_id = $1`,
    [id],
  );
  const { apId, bizId, clientId, consoleId } = await createAnchorStack({
    slug,
    name: displayName,
    branding: brand,
    homeDomain: home_domain,
    database,
    assetCode,
    assetIssuer: issuerPublic,
    distributionPublic: distributionKp.publicKey(),
    distributionSecret: distributionKp.secret(),
    signingSecret: signingKp.secret(),
    adapters: {
      kyc: adapters?.kyc_provider ?? 'didit',   // universal real KYC (DIDIT) by default
      deposit: adapters?.deposit_provider ?? 'mock',
      payout: adapters?.payout_provider ?? 'mock',
      fee: adapters?.fee_provider ?? 'mock',
    },
    surepass: adapters?.kyc_provider === 'surepass'
      ? { baseUrl: SUREPASS_BASE_URL, token: SUREPASS_TOKEN }
      : undefined,
    // Custom self-issued token → price with the founder's fixed INR rate (no market).
    assetPriceInr: !isExternal ? (brand.assetPriceInr || undefined) : undefined,
    minTxn: brand.minTxn || undefined,
    maxTxn: brand.maxTxn || undefined,
  });
  await pool.query(
    `UPDATE tenants SET ap_container_id = $1, biz_container_id = $2 WHERE id = $3`,
    [apId, bizId, id],
  );

  await setStatus(id, 'provisioning', 'Waiting for stack to become healthy');
  await waitHealthy(slug);

  await setStatus(id, 'active', 'Anchor is live');
  console.log(`[provision] ${slug} → active (${home_domain})`);
}

// ── PATCH /anchors/:id — update anchor (compliance/business info) ───────────────
anchorsRouter.patch('/:id', async (req: AuthedRequest, res: Response) => {
  const anchor = await ownedAnchor(req.params.id, req.userId!);
  if (!anchor) { res.status(404).json({ error: 'Not found' }); return; }

  const { fiu_registration_status, legal_entity_name, support_email } = req.body as any;

  // Build dynamic update (very basic implementation for the MVP)
  const updates = [];
  const vals: any[] = [];
  let i = 1;
  if (fiu_registration_status !== undefined) { updates.push(`fiu_registration_status = $${i++}`); vals.push(fiu_registration_status); }
  if (legal_entity_name !== undefined) { updates.push(`legal_entity_name = $${i++}`); vals.push(legal_entity_name); }
  if (support_email !== undefined) { updates.push(`support_email = $${i++}`); vals.push(support_email); }

  if (updates.length > 0) {
    vals.push(anchor.id);
    await pool.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${i}`, vals);
  }
  
  res.json({ ok: true });
});

// ── DELETE /anchors/:id — teardown (soft-delete the record) ─────────────────────
anchorsRouter.delete('/:id', async (req: AuthedRequest, res: Response) => {
  const anchor = await ownedAnchor(req.params.id, req.userId!);
  if (!anchor) { res.status(404).json({ error: 'Not found' }); return; }
  await removeStack(anchor.slug).catch(() => {});
  await dropAnchorDb(anchor.slug).catch(() => {});
  await setStatus(anchor.id, 'removed', 'Torn down');
  res.json({ ok: true });
});
