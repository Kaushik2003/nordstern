import { KycProvider, CustomerQuery, CustomerResult, KycStatus, KycSessionResult } from './KycProvider.js';
import { PUBLIC_BASE_URL } from '../../config.js';

// Mock KYC — always ACCEPTED. The default; preserves the original stub behaviour.
// Dev-only, gated behind ALLOW_MOCK_KYC and forbidden on mainnet (see adapters/index).
export class MockKycProvider implements KycProvider {
  async getCustomer(q: CustomerQuery): Promise<CustomerResult> {
    return { id: q.id ?? q.account ?? 'stub', status: 'ACCEPTED', fields: {} };
  }
  async putCustomer(params: { id?: string; account?: string }): Promise<{ id: string; status: KycStatus }> {
    return { id: params.id ?? params.account ?? 'stub', status: 'ACCEPTED' };
  }
  async deleteCustomer(): Promise<void> { /* no-op */ }

  // Auto-approved: the gate reads ACCEPTED immediately, no external step.
  async getStatus(): Promise<KycStatus> { return 'ACCEPTED'; }

  // Nothing to verify — send the user straight back to where they came from (or the
  // interactive page), where the gate will already read ACCEPTED.
  async startSession(_subject: string, transactionId?: string, returnUrl?: string): Promise<KycSessionResult> {
    const url = returnUrl
      ?? `${PUBLIC_BASE_URL}/sep24/interactive${transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : ''}`;
    return { url, status: 'ACCEPTED' };
  }
}
