'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

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
