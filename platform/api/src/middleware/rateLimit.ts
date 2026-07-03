import rateLimit from 'express-rate-limit';

// Tighter limit on auth endpoints (brute-force / enumeration protection).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
