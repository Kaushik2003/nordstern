import { Router } from 'express';

// ─── Platform callbacks (AP v4.4.0) ────────────────────────────────────────────
// The Anchor Platform delegates exactly two decisions to us in this version, and
// calls them at the callback_api base_url root:
//   GET/PUT/DELETE /customer  — SEP-12 KYC
//   GET /rate                 — SEP-38 INR/USD quote
// (There is NO /unique_address or /fee callback in AP v4.4.0.)
//
// Phase A returns mocks. Real KYC lands in Phase D (behind KycProvider); the real
// INR/USD FX quote lands in Phase B (behind a RateProvider).

export const callbacksRouter = Router();

// SEP-12: accept everyone for now (mock KYC).
callbacksRouter.get('/customer', (_req, res) => {
  res.json({ status: 'ACCEPTED', fields: {}, provided_fields: {} });
});

callbacksRouter.put('/customer', (req, res) => {
  res.json({ id: req.body?.id ?? 'mock-customer' });
});

callbacksRouter.delete('/customer/:account', (_req, res) => {
  res.status(200).send();
});

// SEP-38 rate: stubbed until Phase B implements real INR/USD FX quoting.
callbacksRouter.get('/rate', (_req, res) => {
  res.status(501).json({ error: 'rate not implemented yet — Phase B (INR/USD FX quoting)' });
});
