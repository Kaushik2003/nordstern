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
export interface Wallet { id: string; address: string; label: string | null; network: string; provenAt?: string | null; createdAt: string }
export interface WalletChallenge { address: string; network: 'testnet' | 'mainnet'; challengeXdr: string; expiresAt: string }

export const customer = {
  requestOtp: (email: string, anchorName?: string) => req<{ ok: true }>('POST', '/auth/request-otp', { email, anchorName }),
  verifyOtp: (email: string, code: string) => req<{ customer: Customer; isNew: boolean }>('POST', '/auth/verify-otp', { email, code }),
  logout: () => req<{ ok: true }>('POST', '/auth/logout'),
  me: () => req<Customer>('GET', '/me'),
  updateProfile: (patch: { fullName?: string; preferences?: Record<string, unknown> }) => req<Customer>('PATCH', '/me', patch),
  kyc: () => req<{ kycStatus: string; verifiedAt: string | null; sessionId: string | null }>('GET', '/kyc/status'),
  wallets: () => req<Wallet[]>('GET', '/wallets'),
  // Ownership-proof link flow (Identity Phase 1). A wallet is attached only after the
  // customer signs a server-issued challenge — never by typing an arbitrary address.
  walletChallenge: (address: string, network: 'testnet' | 'mainnet') =>
    req<WalletChallenge>('POST', '/wallets/challenge', { address, network }),
  verifyWallet: (address: string, signedXdr: string, label?: string) =>
    req<Wallet>('POST', '/wallets/verify', { address, signedXdr, label }),
  removeWallet: (id: string) => req<{ ok: true }>('DELETE', `/wallets/${id}`),
};
