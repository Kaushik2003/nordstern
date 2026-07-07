import type { NextConfig } from 'next';

// Per-anchor operator console. The browser only ever talks to this origin
// (console.<slug>.…); we proxy same-origin so cookies flow without CORS:
//   /api/*  → platform-api  (auth, org/anchor scoping, R2a credentials API)
//   /biz/*  → this anchor's business-server (treasury, transactions, live data)
// Both destinations are read at server start (standalone runtime), so one image
// serves every anchor — the per-anchor target is injected as env by the provisioner.
const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? 'http://localhost:4000';
const BIZ_URL = process.env.BIZ_URL ?? 'http://localhost:3000';

const config: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${PLATFORM_API_URL}/api/:path*` },
      { source: '/biz/:path*', destination: `${BIZ_URL}/:path*` },
    ];
  },
};

export default config;
