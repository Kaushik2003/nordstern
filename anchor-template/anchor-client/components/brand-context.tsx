'use client';

import { createContext, useContext } from 'react';
import type { Brand } from '@/lib/brand';
import { setWalletNetwork } from '@/lib/wallet';

const Ctx = createContext<Brand | null>(null);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  // Configure the wallet kit's network from the anchor's REAL passphrase, synchronously and as
  // early as possible (before any connect/sign), so the wallet signs on the correct network.
  // Safe to call on every render — setWalletNetwork is a no-op when the value is unchanged.
  if (typeof window !== 'undefined') setWalletNetwork(brand.networkPassphrase);
  return <Ctx.Provider value={brand}>{children}</Ctx.Provider>;
}

export function useBrand(): Brand {
  const b = useContext(Ctx);
  if (!b) throw new Error('useBrand must be used within BrandProvider');
  return b;
}
