import type { Request, Response, NextFunction } from 'express';
import { forbidden } from '../lib/errors.js';
import type { OrgRole } from '../config/constants.js';

export const requireRole =
  (...roles: OrgRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.org || !roles.includes(req.org.role as OrgRole)) return next(forbidden('Insufficient role'));
    next();
  };
