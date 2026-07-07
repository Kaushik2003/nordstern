import { NextRequest, NextResponse } from 'next/server';

// Runtime proxy: /api/<anything> → PLATFORM_API_URL/api/<anything>. This is the customer
// identity backend (email-OTP auth, profile, linked wallets, KYC status). Read at request
// time so one image serves every anchor. Cookies (ns_customer) flow straight through,
// keeping the browser same-origin.
const PLATFORM = (process.env.PLATFORM_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstream = `${PLATFORM}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.arrayBuffer();

  try {
    const res = await fetch(upstream, {
      method: req.method, headers, body,
      // @ts-expect-error node fetch streaming body
      duplex: 'half', redirect: 'manual',
    });
    const resHeaders = new Headers(res.headers);
    resHeaders.delete('content-encoding');
    return new NextResponse(res.body, { status: res.status, headers: resHeaders });
  } catch (err) {
    return NextResponse.json({ error: { message: 'Service unavailable' } }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
