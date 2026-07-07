import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { organizationsRouter } from './organizations.routes.js';
import { applicationsRouter } from './applications.routes.js';
import { anchorInvitationsRouter } from './anchorInvitations.routes.js';
import { credentialsRouter } from './credentials.routes.js';
import { anchorsRouter } from './anchors.routes.js';
import { customerRouter } from './customer.routes.js';
import { internalRouter } from './internal.routes.js';

export const v1Router = Router();
v1Router.use('/auth', authRouter);
v1Router.use('/customer', customerRouter);
v1Router.use('/internal', internalRouter);
v1Router.use('/organizations', organizationsRouter);
v1Router.use('/organizations/:orgId/anchors/:anchorId/credentials', credentialsRouter);
v1Router.use('/anchors', anchorsRouter);
v1Router.use('/applications', applicationsRouter);
v1Router.use('/anchor-invitations', anchorInvitationsRouter);
