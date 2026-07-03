import { membershipsRepo } from '../repositories/memberships.repo.js';
import type { OrgRole } from '../config/constants.js';

export const membershipService = {
  list: (orgId: string) => membershipsRepo.listForOrg(orgId),
  updateRole: (id: string, role: OrgRole) => membershipsRepo.updateRole(id, role),
  remove: (id: string) => membershipsRepo.remove(id),
};
