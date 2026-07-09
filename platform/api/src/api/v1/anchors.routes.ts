import { Router } from 'express';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { anchors, memberships } from '../../db/schema.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { ah } from '../../lib/asyncHandler.js';
import { badRequest, notFound, forbidden } from '../../lib/errors.js';
import { env } from '../../config/env.js';

// Per-anchor console bootstrap: given the console's own slug, return which anchor it
// manages + branding, scoped to the logged-in operator's memberships. This is how a
// console.<slug> container (which only knows its slug) learns its {orgId, anchorId}
// for the R2a credentials API and its authoritative business name for branding.
export const anchorsRouter = Router();
anchorsRouter.use(requireAuth);

// The live URLs a founder uses to open a launched anchor. Derived from the slug + the
// anchor domain suffix (dev sslip.io / prod nordstern.live), matching how the control-plane
// + Traefik route each anchor. Only meaningful once the anchor is `active`.
function anchorUrls(slug: string): { customerUrl: string; consoleUrl: string } {
  const s = env.ANCHOR_PUBLIC_SCHEME;
  const d = env.ANCHOR_DOMAIN_SUFFIX;
  return {
    customerUrl: `${s}://${slug}.${d}`,
    consoleUrl: `${s}://console-${slug}.${d}`,
  };
}

// GET /anchors — the founder's "my anchors" portfolio: every anchor across the orgs the
// authenticated user is a member of, with status, branding, and the live URLs. Powers the
// founder overview (real data — no mock). Org-scoped by membership.
anchorsRouter.get('/', ah(async (req, res) => {
  const mems = await db.query.memberships.findMany({
    where: eq(memberships.userId, req.user!.id),
    columns: { organizationId: true, role: true },
  });
  if (mems.length === 0) { res.json({ anchors: [] }); return; }
  const orgIds = mems.map((m) => m.organizationId);
  const roleByOrg = new Map(mems.map((m) => [m.organizationId, m.role]));

  const rows = await db
    .select({
      id: anchors.id, name: anchors.name, slug: anchors.slug, status: anchors.status,
      network: anchors.network, organizationId: anchors.organizationId,
      branding: anchors.branding, createdAt: anchors.createdAt,
    })
    .from(anchors)
    .where(inArray(anchors.organizationId, orgIds))
    .orderBy(desc(anchors.createdAt));

  res.json({
    anchors: rows.map((a) => ({
      ...a,
      role: roleByOrg.get(a.organizationId) ?? null,
      // Live URLs only make sense once provisioning completed.
      ...(a.status === 'active' ? anchorUrls(a.slug) : { customerUrl: null, consoleUrl: null }),
    })),
  });
}));

// GET /anchors/resolve?slug=<slug>
anchorsRouter.get('/resolve', ah(async (req, res) => {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) throw badRequest('slug is required');

  const anchor = await db.query.anchors.findFirst({ where: eq(anchors.slug, slug) });
  if (!anchor) throw notFound('Anchor not found');

  // Enforce that the caller is a member of this anchor's organization.
  const member = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, anchor.organizationId), eq(memberships.userId, req.user!.id)),
  });
  if (!member) throw forbidden('You do not operate this anchor');

  res.json({
    organizationId: anchor.organizationId,
    anchorId: anchor.id,
    name: anchor.name,
    slug: anchor.slug,
    status: anchor.status,
    network: anchor.network,
    role: member.role,
  });
}));
