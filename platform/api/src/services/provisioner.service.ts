// Reusable client for the REAL provisioner (anchor-service/control-plane :3002).
// Replaces the platform's simulated provisioning: instead of setTimeout theatre, we
// drive the control-plane's genuine lifecycle (keygen → Friendbot + asset issuance →
// config generation → dockerode container stack → health), poll its status, and — on
// success — register the live anchor with the Aggregator. No provisioning logic is
// duplicated here; this is a thin HTTP client over the existing control-plane API.

const CP_URL       = process.env.CONTROL_PLANE_URL  ?? 'http://localhost:3002';
const AGG_URL      = process.env.AGGREGATOR_URL     ?? 'http://localhost:3005';
const CP_EMAIL     = process.env.CP_SERVICE_EMAIL   ?? 'platform-service@nordstern.internal';
const CP_PASSWORD  = process.env.CP_SERVICE_PASSWORD ?? 'change-me-service-secret';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS   = 10 * 60 * 1000; // real provisioning (image pull + testnet) can take minutes

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ProvisionSpec {
  name: string;
  adapters?: { kyc?: string; deposit?: string; payout?: string; fee?: string };
}

export interface ProvisionHandle {
  cpAnchorId: string;
  slug: string;
  homeDomain: string;
  token: string;
}

export interface ProvisionOutcome {
  status: 'active' | 'error';
  detail: string;
  slug: string;
  homeDomain: string;
  assetCode?: string;
  assetIssuer?: string;
}

// Bootstrap/reuse a single service operator on the control-plane, return its JWT.
async function controlPlaneToken(): Promise<string> {
  const body = JSON.stringify({ email: CP_EMAIL, password: CP_PASSWORD });
  const headers = { 'Content-Type': 'application/json' };
  let res = await fetch(`${CP_URL}/auth/login`, { method: 'POST', headers, body });
  if (res.status === 401) {
    // First run — create the service operator (idempotent thereafter).
    res = await fetch(`${CP_URL}/auth/register`, { method: 'POST', headers, body });
  }
  if (!res.ok) throw new Error(`control-plane auth failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { token: string };
  return json.token;
}

export const provisionerService = {
  // Create the anchor record on the control-plane and kick off the real lifecycle.
  async start(spec: ProvisionSpec): Promise<ProvisionHandle> {
    const token = await controlPlaneToken();
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const createRes = await fetch(`${CP_URL}/anchors`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ name: spec.name, adapters: spec.adapters }),
    });
    if (!createRes.ok) throw new Error(`control-plane create anchor failed (${createRes.status}): ${await createRes.text()}`);
    const anchor = (await createRes.json()) as { id: string; slug: string; home_domain: string };

    const provRes = await fetch(`${CP_URL}/anchors/${anchor.id}/provision`, { method: 'POST', headers: auth });
    if (!provRes.ok) throw new Error(`control-plane provision start failed (${provRes.status}): ${await provRes.text()}`);

    return { cpAnchorId: anchor.id, slug: anchor.slug, homeDomain: anchor.home_domain, token };
  },

  // Resume the EXISTING control-plane anchor (retry after a failed attempt). Re-uses
  // the same cpAnchorId + slug so the secret path still matches and no orphan anchor
  // is created. The control-plane's runProvision is idempotent (clears partial state).
  async resume(cpAnchorId: string): Promise<ProvisionHandle> {
    const token = await controlPlaneToken();
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const detRes = await fetch(`${CP_URL}/anchors/${cpAnchorId}`, { headers: auth });
    if (!detRes.ok) throw new Error(`control-plane fetch anchor failed (${detRes.status}): ${await detRes.text()}`);
    const anchor = (await detRes.json()) as { id: string; slug: string; home_domain: string };

    const provRes = await fetch(`${CP_URL}/anchors/${cpAnchorId}/provision`, { method: 'POST', headers: auth });
    if (!provRes.ok) throw new Error(`control-plane re-provision failed (${provRes.status}): ${await provRes.text()}`);

    return { cpAnchorId: anchor.id, slug: anchor.slug, homeDomain: anchor.home_domain, token };
  },

  // Poll the control-plane's real status until terminal. `onProgress` receives the
  // genuine status_detail string ("Generating keypairs", "Funding accounts…", etc.).
  async waitUntilDone(h: ProvisionHandle, onProgress: (detail: string) => Promise<void> | void): Promise<ProvisionOutcome> {
    const auth = { Authorization: `Bearer ${h.token}` };
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let lastDetail = '';

    while (Date.now() < deadline) {
      const res = await fetch(`${CP_URL}/anchors/${h.cpAnchorId}/status`, { headers: auth });
      if (res.ok) {
        const s = (await res.json()) as { stack_status: string; status_detail: string; home_domain: string };
        if (s.status_detail && s.status_detail !== lastDetail) { lastDetail = s.status_detail; await onProgress(s.status_detail); }
        if (s.stack_status === 'active' || s.stack_status === 'error') {
          // Pull asset details (issued on-chain during provisioning) for aggregator registration.
          let assetCode: string | undefined, assetIssuer: string | undefined;
          const detRes = await fetch(`${CP_URL}/anchors/${h.cpAnchorId}`, { headers: auth });
          if (detRes.ok) { const d = (await detRes.json()) as any; assetCode = d.asset_code; assetIssuer = d.asset_issuer; }
          return { status: s.stack_status as 'active' | 'error', detail: s.status_detail, slug: h.slug, homeDomain: s.home_domain, assetCode, assetIssuer };
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error('control-plane provisioning timed out');
  },

  // Register the now-live anchor with the Aggregator using REAL values (Phase 4).
  async registerWithAggregator(o: ProvisionOutcome, orgName: string): Promise<void> {
    const res = await fetch(`${AGG_URL}/anchors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: o.slug,
        name: orgName,
        domain: `sep.${o.homeDomain}`,
        // Container-reachable endpoint for the aggregator's health checks + handoff
        // resolution (same nordstern-net). The public Traefik host (o.homeDomain) is
        // for wallets; the aggregator lives beside the anchor, not on the internet.
        api_url: `http://business-server-${o.slug}:3000`,
        status: 'active',
        regions: ['India'],
        capabilities: {
          supportedAssets: [o.assetCode ?? 'USDC'],
          supportedRails: ['UPI'],
          settlementModel: 'instant',
          assetIssuer: o.assetIssuer,
        },
        limits: { min_amount: 1, max_amount: 100000 },
        fee_config: { fixed: 0, percent: 0 },
      }),
    });
    if (!res.ok) throw new Error(`aggregator registration failed (${res.status}): ${await res.text()}`);
  },
};
