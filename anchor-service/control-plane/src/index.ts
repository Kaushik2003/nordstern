import express from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';
import { authRouter } from './auth.js';
import { tenantsRouter } from './tenants.js';
import { configRouter } from './config.js';
import { adminRouter } from './admin.js';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

app.use('/auth',    authRouter);
app.use('/tenants', tenantsRouter);
app.use('/config',  configRouter);
app.use('/admin',   adminRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

await initDb();

app.listen(PORT, () => {
  console.log(`[control-plane] running on :${PORT}`);
});
