'use client';

import { createContext, useContext } from 'react';
import type { Brand } from '@/lib/brand';

const Ctx = createContext<Brand | null>(null);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <Ctx.Provider value={brand}>{children}</Ctx.Provider>;
}

export function useBrand(): Brand {
  const b = useContext(Ctx);
  if (!b) throw new Error('useBrand must be used within BrandProvider');
  return b;
}
