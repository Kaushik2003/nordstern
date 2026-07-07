// Same-origin API client. `/api/*` is proxied to platform-api (auth, org/anchor,
// R2a credentials); `/biz/*` to this anchor's business-server (live anchor data).
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Transparent one-shot refresh on expired access token.
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
    if (r.ok) return request<T>(method, path, body, false);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? 'Request failed', json?.error?.details);
  }
  return json as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

// Live anchor data straight from this anchor's business-server (no auth needed for
// read-only operational reads in dev; gated behind the console session in the UI).
export async function bizGet<T>(path: string): Promise<T> {
  const res = await fetch(`/biz${path}`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'biz_error', `business-server ${res.status}`);
  return res.json() as Promise<T>;
}
