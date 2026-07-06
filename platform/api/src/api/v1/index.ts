import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { organizationsRouter } from './organizations.routes.js';
import { applicationsRouter } from './applications.routes.js';

export const v1Router = Router();
v1Router.use('/auth', authRouter);
v1Router.use('/organizations', organizationsRouter);
v1Router.use('/applications', applicationsRouter);
