import { proxy } from '@/lib/proxy';

// /biz/* → this anchor's business-server (treasury, transactions, live data). The
// /biz prefix is stripped (biz-server serves /health, /admin/…). BIZ_URL is per-anchor
// and injected at container launch, so it MUST be read at request time (route handler),
// never baked via next.config rewrites.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BIZ_URL = () => process.env.BIZ_URL ?? 'http://localhost:3000';

function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/biz/, '') || '/';
  return proxy(req, `${BIZ_URL()}${path}${url.search}`);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
