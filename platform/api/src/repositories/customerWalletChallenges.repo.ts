import { and, eq, gt, isNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customerWalletChallenges } from '../db/schema.js';

// Short-lived, single-use ownership challenges. Replay/expiry guard for the link path.
export const customerWalletChallengesRepo = {
  async create(customerId: string, address: string, nonce: string, network: 'testnet' | 'mainnet', expiresAt: Date) {
    const [c] = await db.insert(customerWalletChallenges)
      .values({ customerId, address, nonce, network, expiresAt }).returning();
    return c;
  },

  // The newest unconsumed, unexpired challenge for this (customer, address).
  findActive: (customerId: string, address: string) =>
    db.query.customerWalletChallenges.findFirst({
      where: and(
        eq(customerWalletChallenges.customerId, customerId),
        eq(customerWalletChallenges.address, address),
        isNull(customerWalletChallenges.consumedAt),
        gt(customerWalletChallenges.expiresAt, new Date()),
      ),
      orderBy: [desc(customerWalletChallenges.createdAt)],
    }),

  // Consume atomically: only succeeds if still unconsumed — closes the double-spend / replay
  // window even under concurrent verify calls.
  async consume(id: string): Promise<boolean> {
    const res = await db.update(customerWalletChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(customerWalletChallenges.id, id), isNull(customerWalletChallenges.consumedAt)))
      .returning();
    return res.length > 0;
  },
};
