// Runtime reverse-proxy for the console BFF. We CANNOT use next.config rewrites here:
// rewrite destinations are frozen into the routes manifest at BUILD time, but our
// targets are only known at RUNTIME — PLATFORM_API_URL differs from the build default
// and BIZ_URL is per-anchor (business-server-<slug>). Route handlers read process.env
// at request time, so one image proxies correctly for every anchor. Cookies (Set-Cookie
// from platform-api) flow straight through, keeping the browser same-origin.

// Hop-by-hop / length headers we must not copy verbatim (body may be re-encoded).
const STRIP = new Set(['host', 'connection', 'content-length', 'content-encoding', 'transfer-encoding']);

export async function proxy(req: Request, targetUrl: string): Promise<Response> {
  const headers = new Headers();
  req.headers.forEach((v, k) => { if (!STRIP.has(k.toLowerCase())) headers.set(k, v); });

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch {
    return new Response(JSON.stringify({ error: { code: 'upstream_unreachable', message: 'Upstream service unreachable' } }), {
      status: 502, headers: { 'content-type': 'application/json' },
    });
  }

  const respHeaders = new Headers();
  upstream.headers.forEach((v, k) => { if (!STRIP.has(k.toLowerCase())) respHeaders.set(k, v); });
  // Preserve every Set-Cookie (undici may fold multiples; getSetCookie splits them).
  const cookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (cookies.length) {
    respHeaders.delete('set-cookie');
    for (const c of cookies) respHeaders.append('set-cookie', c);
  }

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}
