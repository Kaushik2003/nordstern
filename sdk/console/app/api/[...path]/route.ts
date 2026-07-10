import { proxy } from '@/lib/proxy';

// /api/* → platform-api (auth, org/anchor scoping, R2a credentials). Path is kept
// verbatim (platform-api serves /api/v1/...). Target read at request time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLATFORM_API_URL = () => process.env.PLATFORM_API_URL ?? 'http://localhost:4000';

function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return proxy(req, `${PLATFORM_API_URL()}${url.pathname}${url.search}`);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
