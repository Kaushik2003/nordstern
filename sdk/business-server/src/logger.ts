import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// ─── Minimal structured logging + request correlation ───────────────────────────
// Dependency-free (no pino/winston to add) structured logs for the money server. The
// server previously logged unstructured strings and — unlike the aggregator — logged
// NO incoming requests, so a failing wallet/console/Anchor-Platform call left no trace.
//
// This emits one JSON line per event ({ts, level, svc, msg, ...fields}) so `docker logs`
// stays greppable by a human AND parseable by a log shipper if a pilot adds one later.
// Async money flows (deposit release, withdrawal payout) are correlated by their Stellar
// transaction id — already present in those log lines — which is the key that matters for
// money; HTTP requests are correlated by a per-request id echoed as `X-Request-Id`.
//
// Deliberately NOT: Prometheus/Grafana/OpenTelemetry. At pilot scale (a handful of
// anchors on Docker) structured logs + a treasury/pending view are what an operator
// actually reaches for; metrics infra is a later, larger investment.

const SVC = process.env.ANCHOR_SLUG ? `business-server:${process.env.ANCHOR_SLUG}` : 'business-server';

type Fields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', msg: string, fields?: Fields): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, svc: SVC, msg, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

export const log = {
  info: (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn: (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error: (msg: string, fields?: Fields) => emit('error', msg, fields),
};

// Assigns/propagates a request id, exposes it on req + the X-Request-Id response header,
// and logs completion with method/path/status/duration. Trusts an inbound X-Request-Id
// (e.g. forwarded by the console BFF) so one id can span the console → biz-server hop.
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const reqId = (typeof inbound === 'string' && inbound) || crypto.randomUUID();
  (req as Request & { reqId?: string }).reqId = reqId;
  res.setHeader('X-Request-Id', reqId);

  // Capture the incoming path now: Express rewrites req.path/req.url as the request
  // passes through mounted routers, so reading it in the finish handler would show the
  // router-relative tail (e.g. "/summary" instead of "/admin/summary").
  const path = req.originalUrl.split('?')[0];
  const start = Date.now();
  res.on('finish', () => {
    log.info('http', {
      reqId,
      method: req.method,
      path,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
}
