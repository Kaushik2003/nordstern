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

// Live anchor data straight from this anchor's business-server. The console session
// cookie is forwarded to the biz-server, which now org-scopes /admin (requireOperator),
// so these are authenticated operator calls end to end.
export async function bizGet<T>(path: string): Promise<T> {
  const res = await fetch(`/biz${path}`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'biz_error', `business-server ${res.status}`);
  return res.json() as Promise<T>;
}

// Money-moving operator actions (retry, refund, treasury sweep/pause, strategy).
export async function bizPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/biz${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error ?? 'biz_error', json?.error ?? `business-server ${res.status}`);
  return json as T;
}

export async function bizDelete<T>(path: string): Promise<T> {
  const res = await fetch(`/biz${path}`, { method: 'DELETE', credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error ?? 'biz_error', json?.error ?? `business-server ${res.status}`);
  return json as T;
}
