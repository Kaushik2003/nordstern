import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerWallets } from '../db/schema.js';

export const customerWalletsRepo = {
  listForCustomer: (customerId: string) =>
    db.query.customerWallets.findMany({ where: eq(customerWallets.customerId, customerId) }),

  findByAddress: (customerId: string, address: string) =>
    db.query.customerWallets.findFirst({ where: and(eq(customerWallets.customerId, customerId), eq(customerWallets.address, address)) }),

  // Which customer (if any) linked this address — used by the service-to-service KYC
  // propagation when a decision is keyed by the verified Stellar account.
  findByAddressAnyCustomer: (address: string) =>
    db.query.customerWallets.findFirst({ where: eq(customerWallets.address, address) }),

  async add(customerId: string, address: string, label: string | null, network: 'testnet' | 'mainnet') {
    const [w] = await db.insert(customerWallets).values({ customerId, address, label, network }).returning();
    return w;
  },

  async remove(customerId: string, id: string) {
    const res = await db.delete(customerWallets).where(and(eq(customerWallets.id, id), eq(customerWallets.customerId, customerId))).returning();
    return res.length > 0;
  },
};
