// @nordstern/shared-auth — the generic HTTP/session client shared by both consoles.
// Realm-aware by design: the transparent access-token refresh skips the `/admin/*` and
// `/auth/*` paths, so the same client serves the operator realm (founder-console) and
// the admin realm (admin-console) without change. Product-specific session hooks stay
// in each app (e.g. founder's `useMe`).
export * from './api';
