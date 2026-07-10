import type { NextConfig } from 'next';

// The console proxies to platform-api (/api/*) and this anchor's business-server
// (/biz/*) via RUNTIME route handlers (app/api/[...path], app/biz/[...path]) — NOT
// next.config rewrites, whose destinations are frozen at build time and can't carry
// the runtime PLATFORM_API_URL or the per-anchor BIZ_URL. See lib/proxy.ts.
const config: NextConfig = {
  output: 'standalone',
};

export default config;
