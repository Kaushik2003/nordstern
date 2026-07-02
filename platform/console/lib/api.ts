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
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};
