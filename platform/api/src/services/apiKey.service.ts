import { apiKeysRepo } from '../repositories/apiKeys.repo.js';
import { generateApiKey } from '../lib/tokens.js';

export const apiKeyService = {
  /** Returns the created row + the plaintext secret (shown exactly once). */
  async create(orgId: string, createdByUserId: string, input: { name: string; scopes?: string[]; projectId?: string }) {
    const key = generateApiKey();
    const apiKey = await apiKeysRepo.create({
      organizationId: orgId,
      projectId: input.projectId ?? null,
      name: input.name,
      keyPrefix: key.keyPrefix,
      keyHash: key.keyHash,
      last4: key.last4,
      scopes: input.scopes ?? [],
      createdByUserId,
    });
    return { apiKey, secret: key.raw };
  },

  list: (orgId: string) => apiKeysRepo.listForOrg(orgId),
  revoke: (orgId: string, id: string) => apiKeysRepo.revoke(id, orgId),
};
