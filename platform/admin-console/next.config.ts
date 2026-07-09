import type { NextConfig } from 'next';
import path from 'node:path';

// Proxy /api/* to the platform-api so the browser stays same-origin (cookies flow
// without CORS). Baked from API_URL at build time (standalone output).
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  output: 'standalone',
  // Trace files from the workspace root so the standalone bundle includes the shared
  // packages (@nordstern/shared-ui, @nordstern/shared-auth).
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@nordstern/shared-ui', '@nordstern/shared-auth'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default config;
