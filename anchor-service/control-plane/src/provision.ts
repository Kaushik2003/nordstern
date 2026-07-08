import { Router, Response } from 'express';
import { pool } from './db.js';
import { requireAuth, AuthedRequest } from './auth.js';
import { encryptSecret } from './crypto.js';
import { generateKeypairs, provisionAssetOnChain, assetCodeFromSlug } from './stellar.js';
import { generateAnchorConfig } from './config-gen.js';
import {
  createAnchorStack, createAnchorDb, dropAnchorDb, removeStack, waitHealthy, anchorDbName,
} from './orchestrator.js';

export const anchorsRouter = Router();
anchorsRouter.use(requireAuth as any);

const DOMAIN_SUFFIX = process.env.ANCHOR_DOMAIN_SUFFIX ?? 'anchors.localhost';
const SUREPASS_BASE_URL = process.env.SUREPASS_BASE_URL ?? 'https://sandbox.surepass.io';
const SUREPASS_TOKEN    = process.env.SUREPASS_TOKEN    ?? '';

const ADAPTER_KINDS = ['kyc', 'deposit', 'payout', 'fee'] as const;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

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
    branding
  } = req.body as any;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  let slug = slugify(name);
  if (!slug) { res.status(400).json({ error: 'name must contain letters or digits' }); return; }
  // Ensure slug uniqueness.
  const { rows: clash } = await pool.query(`SELECT 1 FROM tenants WHERE slug = $1`, [slug]);
  if (clash.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const { rows: [anchor] } = await pool.query(
      `INSERT INTO tenants (
         name, slug, owner_user_id, home_domain, stack_status, status,
         legal_entity_name, company_type, use_case, country, fiu_registration_status, support_email, branding
       )
       VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        name, slug, req.userId, `${slug}.${DOMAIN_SUFFIX}`,
        legal_entity_name || null, company_type || null, use_case || null, country || null,
        fiu_registration_status || null, support_email || null,
        JSON.stringify(branding && typeof branding === 'object' ? branding : {}),
      ],
    );
    await pool.query(`INSERT INTO tenant_config (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`, [anchor.id]);
    await pool.query(
      `INSERT INTO anchor_adapters (tenant_id, kyc_provider, deposit_provider, payout_provider, fee_provider)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [anchor.id, adapters?.kyc ?? 'mock', adapters?.deposit ?? 'mock', adapters?.payout ?? 'mock', adapters?.fee ?? 'mock'],
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
  const { id, slug, name, home_domain, legal_entity_name, branding } = anchor;
  // Display/brand name for the provisioned surfaces; falls back to the slug-safe name.
  const displayName = legal_entity_name || name;
  // branding is a jsonb column — pg returns it already parsed. Guard for safety.
  const brand: Record<string, string> = branding && typeof branding === 'object' ? branding : {};

  await setStatus(id, 'provisioning', 'Generating keypairs');
  const kps = generateKeypairs();
  const assetCode = assetCodeFromSlug(slug);

  // Idempotent re-provision (retry after a failed attempt): clear any partial state
  // from a prior run so re-inserting keypairs can't collide. Keys are regenerated
  // above, so dropping the old rows is safe.
  await pool.query(`DELETE FROM anchor_secrets WHERE tenant_id = $1`, [id]);

  // Encrypt + store secrets (public key stays in the clear).
  for (const [role, kp] of [['signing', kps.signing], ['distribution', kps.distribution], ['issuer', kps.issuer]] as const) {
    const sealed = encryptSecret(kp.secret());
    await pool.query(
      `INSERT INTO anchor_secrets (tenant_id, role, public_key, ciphertext, iv, tag)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, role, kp.publicKey(), sealed.ciphertext, sealed.iv, sealed.tag],
    );
  }
  await pool.query(
    `UPDATE tenants SET asset_code = $1, asset_issuer = $2 WHERE id = $3`,
    [assetCode, kps.issuer.publicKey(), id],
  );

  await setStatus(id, 'provisioning', 'Funding accounts & issuing asset on Stellar');
  await provisionAssetOnChain(kps, assetCode);

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
    assetIssuer: kps.issuer.publicKey(),
    distributionPublic: kps.distribution.publicKey(),
    signingPublic: kps.signing.publicKey(),
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
    assetIssuer: kps.issuer.publicKey(),
    distributionPublic: kps.distribution.publicKey(),
    distributionSecret: kps.distribution.secret(),
    signingSecret: kps.signing.secret(),
    adapters: {
      kyc: adapters?.kyc_provider ?? 'mock',
      deposit: adapters?.deposit_provider ?? 'mock',
      payout: adapters?.payout_provider ?? 'mock',
      fee: adapters?.fee_provider ?? 'mock',
    },
    surepass: adapters?.kyc_provider === 'surepass'
      ? { baseUrl: SUREPASS_BASE_URL, token: SUREPASS_TOKEN }
      : undefined,
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
