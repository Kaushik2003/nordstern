import crypto from 'crypto';
import { applicationsRepo } from '../repositories/applications.repo.js';
import { anchorInvitationsRepo } from '../repositories/anchorInvitations.repo.js';

export const applicationService = {
  async submit(data: {
    profile: any;
    product: any;
  }) {
    return applicationsRepo.create(data);
  },

  async approve(applicationId: string) {
    const app = await applicationsRepo.findById(applicationId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (app.status === 'approved') {
      throw new Error('Application already approved');
    }

    // 1. Mark application approved
    const updatedApp = await applicationsRepo.updateStatus(applicationId, 'approved');

    // 2. Generate cryptographically secure invite code
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Invite code expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 3. Persist invitation record
    const email = (app.profile as any)?.businessEmail || 'compliance@nordstern.live';
    const invitation = await anchorInvitationsRepo.create({
      applicationId: app.id,
      email,
      tokenHash,
      expiresAt
    });

    return {
      application: updatedApp,
      invitationId: invitation.id,
      email: invitation.email,
      rawToken // returned to be sent via email/UI
    };
  },

  get: (id: string) => applicationsRepo.findById(id),
  list: () => applicationsRepo.list()
};
