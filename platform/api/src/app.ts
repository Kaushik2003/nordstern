import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { v1Router } from './api/v1/index.js';
import { logger } from './lib/logger.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(requestId);
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/api/v1', v1Router);

  app.use(errorHandler);
  return app;
}
