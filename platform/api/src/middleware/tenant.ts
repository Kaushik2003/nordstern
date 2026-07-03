import type { Request, Response, NextFunction } from 'express';
import { membershipsRepo } from '../repositories/memberships.repo.js';
import { badRequest, forbidden, unauthorized } from '../lib/errors.js';

// Resolves the active org from :orgId and enforces membership → req.org = { id, role }.
export function tenant(req: Request, _res: Response, next: NextFunction) {
  (async () => {
    if (!req.user) throw unauthorized();
    const orgId = req.params.orgId as string;
    if (!orgId) throw badRequest('Missing organization id');
    const membership = await membershipsRepo.find(orgId, req.user.id);
    if (!membership) throw forbidden('You are not a member of this organization');
    req.org = { id: orgId, role: membership.role };
    next();
  })().catch(next);
}
