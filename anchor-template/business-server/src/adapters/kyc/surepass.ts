import { KycProvider, CustomerQuery, CustomerResult, KycStatus } from './KycProvider.js';

// ─── Surepass KYC (sandbox) ────────────────────────────────────────────────────
// Real Indian identity verification (PAN) behind the KycProvider seam. Selected
// via KYC_PROVIDER=surepass; needs SUREPASS_TOKEN. We store ONLY the verification
// outcome, never the raw PAN/Aadhaar (COMPLIANCE Q5 — minimal PII). In-memory
// session state for now; a durable store is a hardening slice.
//
// The exact Surepass sandbox path/field mapping should be confirmed against their
// docs; SUREPASS_PAN_PATH makes it configurable, and the provider degrades
// gracefully (PROCESSING) if the API is unreachable. Credential-gated: without
// SUREPASS_TOKEN this cannot be verified end-to-end.

interface Outcome { id: string; status: KycStatus; message?: string }

export class SurepassKycProvider implements KycProvider {
  private store = new Map<string, Outcome>();
  private baseUrl = process.env.SUREPASS_BASE_URL ?? 'https://sandbox.surepass.io';
  private token   = process.env.SUREPASS_TOKEN ?? '';
  private panPath = process.env.SUREPASS_PAN_PATH ?? '/api/v1/pan/pan';

  private key(q: { id?: string; account?: string }) {
    return q.id ?? q.account ?? 'anon';
  }

  async getCustomer(q: CustomerQuery): Promise<CustomerResult> {
    const key = this.key(q);
    const rec = this.store.get(key);
    if (!rec) {
      return {
        id: key,
        status: 'NEEDS_INFO',
        fields: { id_number: { description: 'PAN number for verification', optional: false } },
      };
    }
    return { id: rec.id, status: rec.status, message: rec.message };
  }

  async putCustomer(params: { id?: string; account?: string; fields: Record<string, any> }): Promise<{ id: string; status: KycStatus }> {
    const key = this.key(params);
    const pan = params.fields?.id_number ?? params.fields?.pan;
    if (!pan) {
      const rec: Outcome = { id: key, status: 'NEEDS_INFO', message: 'id_number (PAN) required' };
      this.store.set(key, rec);
      return { id: key, status: rec.status };
    }
    if (!this.token) throw new Error('SUREPASS_TOKEN not configured');

    let status: KycStatus = 'PROCESSING';
    let message: string | undefined;
    try {
      const res = await fetch(`${this.baseUrl}${this.panPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ id_number: pan }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        status = 'ACCEPTED';
      } else {
        status = 'REJECTED';
        message = body?.message ?? `verification failed (${res.status})`;
      }
    } catch (err) {
      status = 'PROCESSING';
      message = `surepass unreachable: ${(err as Error).message}`;
    }

    const rec: Outcome = { id: key, status, message };
    this.store.set(key, rec); // outcome only — no raw PII retained
    return { id: key, status };
  }

  async deleteCustomer(id: string): Promise<void> {
    this.store.delete(id);
  }
}
