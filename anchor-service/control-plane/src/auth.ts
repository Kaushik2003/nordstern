import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export const authRouter = Router();

// POST /auth/register — create user + tenant in one step
authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, network = 'testnet' } = req.body as Record<string, string>;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const hash = await bcrypt.hash(password, 10);

  try {
    // Create tenant
    const { rows: [tenant] } = await pool.query(
      `INSERT INTO tenants (name, slug, network) VALUES ($1, $2, $3) RETURNING *`,
      [name, slug, network],
    );

    // Create user linked to tenant
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role`,
      [tenant.id, email, hash],
    );

    // Seed default config
    await pool.query(
      `INSERT INTO tenant_config (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [tenant.id],
    );

    const token = jwt.sign({ userId: user.id, tenantId: tenant.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, tenant, user });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email or company name already registered' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  const { rows } = await pool.query(
    `SELECT u.*, t.id as tenant_id, t.name as tenant_name, t.status as tenant_status, t.network
     FROM users u JOIN tenants t ON u.tenant_id = t.id
     WHERE u.email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = jwt.sign({ userId: user.id, tenantId: user.tenant_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id, tenantName: user.tenant_name, tenantStatus: user.tenant_status, network: user.network } });
});

// ── JWT middleware ────────────────────────────────────────────────────────────

export interface AuthedRequest extends Request {
  userId?: string;
  tenantId?: string;
  role?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
    req.userId   = payload.userId;
    req.tenantId = payload.tenantId;
    req.role     = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.role !== 'platform-admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  next();
}
