'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@nordstern/shared-auth';

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

export interface Me {
  user: { id: string; email: string; fullName: string | null; emailVerifiedAt: string | null };
  organizations: OrgSummary[];
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/auth/me'), retry: false });
}

export interface MyAnchor {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'provisioning' | 'active' | 'error' | 'suspended' | 'removed';
  network: string;
  role: string | null;
  branding: Record<string, string>;
  customerUrl: string | null;
  consoleUrl: string | null;
  createdAt: string;
}

// The founder's launched anchors (real data — powers the "my anchors" portfolio).
export function useMyAnchors() {
  return useQuery({
    queryKey: ['my-anchors'],
    queryFn: () => api.get<{ anchors: MyAnchor[] }>('/anchors'),
    retry: false,
  });
}
