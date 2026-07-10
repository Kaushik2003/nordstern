'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@nordstern/shared-auth';

/**
 * Fetch one `/admin/*` read endpoint. The console has no react-query; this is the whole
 * data layer. A 401 means the ns_admin cookie lapsed — the dashboard layout guard handles
 * the redirect, so we only surface the message here.
 */
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void reload(); }, [reload]);

  return { data, error, loading, reload };
}
