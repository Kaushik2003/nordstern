import type { NextConfig } from 'next';

// Standalone output → slim Docker runtime. The business-server admin API is
// reached via the /biz/* route proxy (app/biz/[...path]/route.ts), which reads
// BIZ_INTERNAL_URL at runtime, so the same image works in dev and compose.
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
