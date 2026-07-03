import { invitationsRepo } from '../repositories/invitations.repo.js';
import { membershipsRepo } from '../repositories/memberships.repo.js';
import { organizationsRepo } from '../repositories/organizations.repo.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { sendInvitationEmail } from '../lib/mailer/index.js';
import { env } from '../config/env.js';
import { INVITE_TOKEN_TTL_MS, type OrgRole } from '../config/constants.js';
import { badRequest, notFound } from '../lib/errors.js';

export const invitationService = {
  async invite(orgId: string, invitedByUserId: string, input: { email: string; role: OrgRole }) {
    const org = await organizationsRepo.findById(orgId);
    if (!org) throw notFound('Organization not found');
    const t = generateToken();
    const inv = await invitationsRepo.create({
      organizationId: orgId,
      email: input.email,
      role: input.role,
      tokenHash: t.hash,
      invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    });
    await sendInvitationEmail(input.email, org.name, `${env.APP_URL}/invitations/accept?token=${t.raw}`);
    return inv;
  },

  list: (orgId: string) => invitationsRepo.listForOrg(orgId),
  revoke: (id: string) => invitationsRepo.markRevoked(id),

  async accept(rawToken: string, userId: string) {
    const inv = await invitationsRepo.findByHash(hashToken(rawToken));
    if (!inv || inv.status !== 'pending' || inv.expiresAt < new Date()) throw badRequest('Invalid or expired invitation');
    const existing = await membershipsRepo.find(inv.organizationId, userId);
    if (!existing) await membershipsRepo.create(inv.organizationId, userId, inv.role as OrgRole);
    await invitationsRepo.markAccepted(inv.id);
    return inv.organizationId;
  },
};
