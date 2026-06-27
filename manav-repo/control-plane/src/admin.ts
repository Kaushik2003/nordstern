import { Router, Response } from 'express';
import { pool } from './db.js';
import { requireAuth, requireAdmin, AuthedRequest } from './auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth as any);
adminRouter.use(requireAdmin as any);

// GET /admin/tenants — all tenants (platform admin only)
adminRouter.get('/tenants', async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query(`
    SELECT t.*,
      COUNT(DISTINCT u.id) as user_count,
      COUNT(DISTINCT ra.id) FILTER (WHERE ra.resolved = false) as active_alerts
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    LEFT JOIN reconciliation_alerts ra ON ra.tenant_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `);
  res.json(rows);
});

// PATCH /admin/tenants/:id — suspend or activate
adminRouter.patch('/tenants/:id', async (req: AuthedRequest, res: Response) => {
  const { status } = req.body as { status: string };
  const { rows: [t] } = await pool.query(
    `UPDATE tenants SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id],
  );
  res.json(t);
});
