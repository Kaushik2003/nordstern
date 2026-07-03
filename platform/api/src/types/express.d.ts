import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      org?: { id: string; role: string };
    }
  }
}

export {};
