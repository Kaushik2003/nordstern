import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Forwards async errors to the error handler (works on Express 4 and 5).
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const meta = (req: Request) => ({ userAgent: req.get('user-agent') ?? undefined, ip: req.ip });
