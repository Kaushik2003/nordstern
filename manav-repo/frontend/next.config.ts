import type { NextConfig } from 'next';

const bizUrl   = process.env.BIZ_URL            ?? 'http://localhost:3000';
const cpUrl    = process.env.CP_URL             ?? 'http://localhost:3002';
const netPass  = process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015';
const isMainnet = netPass.includes('Public Global');

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '..'),

  // Expose network info to the browser bundle (baked in at build time).
  env: {
    NEXT_PUBLIC_NET_PASS:   netPass,
    NEXT_PUBLIC_IS_MAINNET: String(isMainnet),
  },

  async rewrites() {
    return [
      { source: '/biz/:path*', destination: `${bizUrl}/:path*` },
      { source: '/cp/:path*',  destination: `${cpUrl}/:path*` },
    ];
  },
};

export default config;
