import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerWallets } from '../db/schema.js';

type ProofFields = {
  provenAt: Date;
  proofType: 'signed_challenge';
  proofNonce: string;
  proofSignature: string;
};

export const customerWalletsRepo = {
  // Only PROVEN wallets are ever stored, but filter defensively so an unproven row (should one
  // ever exist) can never widen a customer's data scope.
  listForCustomer: (customerId: string) =>
    db.query.customerWallets.findMany({
      where: and(eq(customerWallets.customerId, customerId), isNotNull(customerWallets.provenAt)),
    }),

  listProvenAddresses: async (customerId: string) => {
    const rows = await db.query.customerWallets.findMany({
      where: and(eq(customerWallets.customerId, customerId), isNotNull(customerWallets.provenAt)),
      columns: { address: true },
    });
    return rows.map((r) => r.address);
  },

  findByAddress: (customerId: string, address: string) =>
    db.query.customerWallets.findFirst({ where: and(eq(customerWallets.customerId, customerId), eq(customerWallets.address, address)) }),

  // Which customer (if any) owns this address globally — the bond is unique, so this is
  // unambiguous. Used by KYC propagation and by the global-uniqueness guard at link time.
  findByAddressAnyCustomer: (address: string) =>
    db.query.customerWallets.findFirst({ where: eq(customerWallets.address, address) }),

  // Insert a PROVEN wallet. Callers must have verified ownership first (see walletProof).
  async addProven(
    customerId: string,
    address: string,
    label: string | null,
    network: 'testnet' | 'mainnet',
    proof: ProofFields,
  ) {
    const [w] = await db.insert(customerWallets).values({ customerId, address, label, network, ...proof }).returning();
    return w;
  },

  async remove(customerId: string, id: string) {
    const res = await db.delete(customerWallets).where(and(eq(customerWallets.id, id), eq(customerWallets.customerId, customerId))).returning();
    return res.length > 0;
  },
};
