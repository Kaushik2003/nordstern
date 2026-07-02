import { NextRequest } from 'next/server';

// Runtime proxy to the business-server admin API. Reads BIZ_INTERNAL_URL at
// request time so one build works in dev (localhost) and compose (service name).
const BIZ = process.env.BIZ_INTERNAL_URL ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${BIZ}/${path.join('/')}${req.nextUrl.search}`;
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'content-type': req.headers.get('content-type') ?? 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e) {
    return Response.json({ error: `business-server unreachable: ${(e as Error).message}` }, { status: 502 });
  }
}

export { handler as GET, handler as POST };
