'use client';

import { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

// What the console knows about the anchor it operates. `slug`/`assetCode` come from
// injected env (server → props, always available). `name`/`orgId`/`anchorId` come from
// the platform-api resolve endpoint (requires the operator session) — this is also the
// auth gate: a 401 means "not signed in" → bounce to /login.
export interface AnchorCtx {
  slug: string;
  assetCode: string;
  name: string;
  logoUrl: string | null;
  orgId: string | null;
  anchorId: string | null;
  status: string | null;
  role: string | null;
  loading: boolean;
}

const Ctx = createContext<AnchorCtx | null>(null);

interface Resolved {
  organizationId: string;
  anchorId: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

export function AnchorProvider({
  slug, assetCode, envName, logoUrl = null, children,
}: { slug: string; assetCode: string; envName: string; logoUrl?: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, error } = useQuery({
    queryKey: ['anchor', slug],
    queryFn: () => api.get<Resolved>(`/anchors/resolve?slug=${encodeURIComponent(slug)}`),
    retry: false,
  });

  // Auth gate: unauthenticated → login.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401 && pathname !== '/login') {
      router.replace('/login');
    }
  }, [error, pathname, router]);

  const value: AnchorCtx = {
    slug,
    assetCode,
    name: data?.name ?? envName,
    logoUrl,
    orgId: data?.organizationId ?? null,
    anchorId: data?.anchorId ?? null,
    status: data?.status ?? null,
    role: data?.role ?? null,
    loading: isLoading,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnchor(): AnchorCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnchor must be used within AnchorProvider');
  return ctx;
}
