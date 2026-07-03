import { organizationsRepo } from '../repositories/organizations.repo.js';
import { membershipsRepo } from '../repositories/memberships.repo.js';
import { projectsRepo } from '../repositories/projects.repo.js';
import { uniqueSlug } from '../lib/slug.js';

export const organizationService = {
  /** Onboarding: create org + settings + owner membership + default projects. */
  async create(userId: string, input: {
    name: string; website?: string; country?: string; teamSize?: string; primaryGoal?: string;
  }) {
    const slug = await uniqueSlug(input.name, (s) => organizationsRepo.slugExists(s));
    const org = await organizationsRepo.create({ ...input, slug });
    await organizationsRepo.createSettings(org.id);
    await membershipsRepo.create(org.id, userId, 'owner');
    await projectsRepo.create({ organizationId: org.id, name: 'Sandbox', slug: 'sandbox', environment: 'sandbox' });
    await projectsRepo.create({ organizationId: org.id, name: 'Production', slug: 'production', environment: 'production' });
    return org;
  },

  list: (userId: string) => organizationsRepo.listForUser(userId),
  get: (id: string) => organizationsRepo.findById(id),
  listProjects: (orgId: string) => projectsRepo.listForOrg(orgId),
};
