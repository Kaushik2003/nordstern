// Customer identity client → /api/v1/customer/* (proxied to platform-api). Email-OTP only,
// no passwords. The ns_customer session cookie is set/cleared by the backend and rides
// along automatically (credentials: 'include').

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1/customer${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? json?.error ?? 'Something went wrong');
  return json as T;
}

export interface Customer { id: string; email: string; fullName: string | null; kycStatus: 'unverified' | 'pending' | 'approved' | 'declined'; preferences?: Record<string, unknown>; createdAt?: string }
export interface Wallet { id: string; address: string; label: string | null; network: string; createdAt: string }

export const customer = {
  requestOtp: (email: string) => req<{ ok: true }>('POST', '/auth/request-otp', { email }),
  verifyOtp: (email: string, code: string) => req<{ customer: Customer; isNew: boolean }>('POST', '/auth/verify-otp', { email, code }),
  logout: () => req<{ ok: true }>('POST', '/auth/logout'),
  me: () => req<Customer>('GET', '/me'),
  updateProfile: (patch: { fullName?: string; preferences?: Record<string, unknown> }) => req<Customer>('PATCH', '/me', patch),
  kyc: () => req<{ kycStatus: string; verifiedAt: string | null; sessionId: string | null }>('GET', '/kyc/status'),
  wallets: () => req<Wallet[]>('GET', '/wallets'),
  addWallet: (address: string, label?: string) => req<Wallet>('POST', '/wallets', { address, label }),
  removeWallet: (id: string) => req<{ ok: true }>('DELETE', `/wallets/${id}`),
};
