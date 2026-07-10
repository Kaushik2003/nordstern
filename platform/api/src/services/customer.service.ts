import { customersRepo } from '../repositories/customers.repo.js';
import { customerWalletsRepo } from '../repositories/customerWallets.repo.js';
import { customerWalletChallengesRepo } from '../repositories/customerWalletChallenges.repo.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { buildChallengeXdr, verifySignedChallenge, newNonce, CHALLENGE_TTL_MS } from '../lib/walletProof.js';

const isStellarAddress = (a: string) => /^G[A-Z2-7]{55}$/.test(a);

function shape(c: NonNullable<Awaited<ReturnType<typeof customersRepo.findById>>>) {
  return { id: c.id, email: c.email, fullName: c.fullName, kycStatus: c.kycStatus, preferences: c.preferences, createdAt: c.createdAt };
}

export const customerService = {
  async me(id: string) {
    const c = await customersRepo.findById(id);
    if (!c) throw notFound('Customer not found');
    return shape(c);
  },

  async updateProfile(id: string, patch: { fullName?: string; preferences?: Record<string, unknown> }) {
    const c = await customersRepo.updateProfile(id, patch);
    return shape(c);
  },

  listWallets: (id: string) => customerWalletsRepo.listForCustomer(id),

  // ── Wallet ownership proof (Identity Phase 1) ───────────────────────────────
  // Linking is a two-step, cryptographically-proven flow. A wallet is a signing
  // CAPABILITY the customer proves control of — never an arbitrary address they type.

  // Step 1: issue a challenge. Rejects addresses already bound to ANOTHER identity so a
  // wallet belongs to at most one customer (globally-unique bond). Re-proving one's own
  // wallet is allowed (re-verification / relabel).
  async createWalletChallenge(customerId: string, address: string, network: 'testnet' | 'mainnet') {
    const addr = address.trim();
    if (!isStellarAddress(addr)) throw badRequest("That doesn't look like a valid wallet address");

    const owner = await customerWalletsRepo.findByAddressAnyCustomer(addr);
    if (owner && owner.customerId !== customerId) {
      throw conflict('That wallet is already linked to another account');
    }

    const nonce = newNonce();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await customerWalletChallengesRepo.create(customerId, addr, nonce, network, expiresAt);
    const challengeXdr = buildChallengeXdr(addr, nonce, network);
    return { address: addr, network, challengeXdr, expiresAt };
  },

  // Step 2: verify the signed challenge and record the proven bond. Fails closed on a bad,
  // stale, replayed, or wrong-signer signature. The proof record is the first concrete
  // instance of the future proven-capability (credentials) model.
  async verifyWalletChallenge(customerId: string, address: string, signedXdr: string, label: string | null) {
    const addr = address.trim();
    if (!isStellarAddress(addr)) throw badRequest("That doesn't look like a valid wallet address");

    const challenge = await customerWalletChallengesRepo.findActive(customerId, addr);
    if (!challenge) throw badRequest('No active verification for this wallet. Start again.');

    const ok = verifySignedChallenge(signedXdr, addr, challenge.nonce, challenge.network);
    if (!ok) throw badRequest('Could not verify wallet ownership. Please sign the exact request shown.');

    // Consume atomically — a challenge is single-use even under concurrent requests.
    const consumed = await customerWalletChallengesRepo.consume(challenge.id);
    if (!consumed) throw badRequest('This verification was already used. Start again.');

    // Re-check global uniqueness at write time (TOCTOU): another account may have proven it
    // between challenge issuance and now.
    const existing = await customerWalletsRepo.findByAddressAnyCustomer(addr);
    if (existing) {
      if (existing.customerId === customerId) return existing; // idempotent re-link of own wallet
      throw conflict('That wallet is already linked to another account');
    }

    return customerWalletsRepo.addProven(customerId, addr, label, challenge.network, {
      provenAt: new Date(),
      proofType: 'signed_challenge',
      proofNonce: challenge.nonce,
      proofSignature: signedXdr,
    });
  },

  async removeWallet(id: string, walletId: string) {
    const ok = await customerWalletsRepo.remove(id, walletId);
    if (!ok) throw notFound('Wallet not found');
  },

  async kyc(id: string) {
    const c = await customersRepo.findById(id);
    if (!c) throw notFound('Customer not found');
    return { kycStatus: c.kycStatus, verifiedAt: c.diditVerifiedAt, sessionId: c.diditSessionId };
  },
};
