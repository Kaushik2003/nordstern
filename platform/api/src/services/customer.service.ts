import { customersRepo } from '../repositories/customers.repo.js';
import { customerWalletsRepo } from '../repositories/customerWallets.repo.js';
import { badRequest, notFound } from '../lib/errors.js';

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

  async addWallet(id: string, address: string, label: string | null, network: 'testnet' | 'mainnet') {
    const addr = address.trim();
    if (!isStellarAddress(addr)) throw badRequest('That doesn\'t look like a valid wallet address');
    const existing = await customerWalletsRepo.findByAddress(id, addr);
    if (existing) return existing; // idempotent link
    return customerWalletsRepo.add(id, addr, label, network);
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
