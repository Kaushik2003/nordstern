export const COOKIE_ACCESS = 'ns_access';
export const COOKIE_REFRESH = 'ns_refresh';
export const COOKIE_CUSTOMER = 'ns_customer';   // customer (email-OTP) session

// Token lifetimes (ms)
export const VERIFY_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;      // 24h
export const RESET_TOKEN_TTL_MS  = 1000 * 60 * 60;           // 1h
export const INVITE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;  // 7d
export const OTP_TTL_MS          = 1000 * 60 * 10;           // 10m
export const OTP_MAX_ATTEMPTS    = 5;

export const API_KEY_PREFIX = 'nsk';

export const ORG_ROLES = ['owner', 'admin', 'member', 'billing'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
