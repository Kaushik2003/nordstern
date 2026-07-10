'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { customer as api, type Customer } from '@/lib/customer';

interface Ctx {
  customer: Customer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setCustomer: (c: Customer | null) => void;
}

const CustomerCtx = createContext<Ctx | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [cust, setCust] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setCust(await api.me()); }
    catch { setCust(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setCust(null);
  }, []);

  return <CustomerCtx.Provider value={{ customer: cust, loading, refresh, signOut, setCustomer: setCust }}>{children}</CustomerCtx.Provider>;
}

export function useCustomer(): Ctx {
  const c = useContext(CustomerCtx);
  if (!c) throw new Error('useCustomer must be used within CustomerProvider');
  return c;
}
