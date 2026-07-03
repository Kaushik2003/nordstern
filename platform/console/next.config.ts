import type { NextConfig } from 'next';

// Proxy /api/* to the Control Plane API so the browser stays same-origin
// (cookies flow without CORS).
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default config;
