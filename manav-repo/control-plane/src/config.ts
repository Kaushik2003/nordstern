import { Router, Response } from 'express';
import { pool } from './db.js';
import { requireAuth, AuthedRequest } from './auth.js';

export const configRouter = Router();
configRouter.use(requireAuth as any);

// GET /config — business rules for current tenant
configRouter.get('/', async (req: AuthedRequest, res: Response) => {
  const { rows: [cfg] } = await pool.query(
    `SELECT * FROM tenant_config WHERE tenant_id = $1`, [req.tenantId],
  );
  res.json(cfg ?? {});
});

// PUT /config — save business rules
configRouter.put('/', async (req: AuthedRequest, res: Response) => {
  const {
    min_deposit, max_deposit, min_withdrawal, max_withdrawal, daily_limit,
    deposit_fee_pct, withdrawal_fee_pct,
    fiat_method_name, fiat_bank_name, fiat_account_number, fiat_routing_number, settlement_days,
    alert_mismatch_pct, alert_large_tx, webhook_url,
  } = req.body;

  await pool.query(
    `INSERT INTO tenant_config (
       tenant_id, min_deposit, max_deposit, min_withdrawal, max_withdrawal, daily_limit,
       deposit_fee_pct, withdrawal_fee_pct, fiat_method_name, fiat_bank_name,
       fiat_account_number, fiat_routing_number, settlement_days,
       alert_mismatch_pct, alert_large_tx, webhook_url, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       min_deposit=$2, max_deposit=$3, min_withdrawal=$4, max_withdrawal=$5, daily_limit=$6,
       deposit_fee_pct=$7, withdrawal_fee_pct=$8, fiat_method_name=$9, fiat_bank_name=$10,
       fiat_account_number=$11, fiat_routing_number=$12, settlement_days=$13,
       alert_mismatch_pct=$14, alert_large_tx=$15, webhook_url=$16, updated_at=NOW()`,
    [
      req.tenantId, min_deposit, max_deposit, min_withdrawal, max_withdrawal, daily_limit,
      deposit_fee_pct, withdrawal_fee_pct, fiat_method_name, fiat_bank_name,
      fiat_account_number, fiat_routing_number, settlement_days,
      alert_mismatch_pct, alert_large_tx, webhook_url,
    ],
  );
  res.json({ ok: true });
});

// GET /config/alerts — reconciliation alerts for current tenant
configRouter.get('/alerts', async (req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query(
    `SELECT * FROM reconciliation_alerts WHERE tenant_id=$1 AND resolved=false ORDER BY created_at DESC LIMIT 10`,
    [req.tenantId],
  );
  res.json(rows);
});

// POST /config/alerts/inject — demo helper: injects a fake mismatch
configRouter.post('/alerts/inject', async (req: AuthedRequest, res: Response) => {
  const { rows: [tenant] } = await pool.query(`SELECT fiat_balance FROM tenants WHERE id=$1`, [req.tenantId]);
  const delta = 500;
  await pool.query(
    `INSERT INTO reconciliation_alerts (tenant_id, fiat_balance, onchain_balance, delta)
     VALUES ($1, $2, $3, $4)`,
    [req.tenantId, tenant.fiat_balance, Number(tenant.fiat_balance) - delta, delta],
  );
  res.json({ ok: true, delta });
});

// POST /config/alerts/:id/resolve
configRouter.post('/alerts/:id/resolve', async (req: AuthedRequest, res: Response) => {
  await pool.query(
    `UPDATE reconciliation_alerts SET resolved=true WHERE id=$1 AND tenant_id=$2`,
    [req.params.id, req.tenantId],
  );
  res.json({ ok: true });
});
