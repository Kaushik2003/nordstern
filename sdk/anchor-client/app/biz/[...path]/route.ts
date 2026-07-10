/**
 * Runtime proxy: /biz/<anything> → BIZ_URL/<anything>
 *
 * next.config.ts rewrites() are evaluated at BUILD time in standalone mode,
 * so the BIZ_URL env var injected per-container at runtime was being ignored.
 * This route handler reads process.env.BIZ_URL on every request, which works
 * correctly in standalone containers with per-anchor env injection.
 */

import { NextRequest, NextResponse } from 'next/server';

const BIZ_URL = (process.env.BIZ_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstream = `${BIZ_URL}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(upstream, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error – Node fetch supports duplex
      duplex: 'half',
    });

    const resHeaders = new Headers(res.headers);
    resHeaders.delete('content-encoding'); // Next already handles decompression

    return new NextResponse(res.body, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error('[biz-proxy] upstream error:', err.message, '→', upstream);
    return NextResponse.json({ error: 'upstream_unavailable', detail: err.message }, { status: 502 });
  }
}

export const GET     = proxy;
export const POST    = proxy;
export const PUT     = proxy;
export const PATCH   = proxy;
export const DELETE  = proxy;
export const OPTIONS = proxy;
