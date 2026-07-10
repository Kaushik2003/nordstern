'use client';

import { useAdminData } from '@/lib/use-admin-data';
import { formatDate } from '@/lib/format';
import {
  EmptyRow, ErrorBanner, PageHeader, Spinner, StatCard, StatusBadge, TableShell, Td, Th, Thead, Tr,
} from '@/components/primitives';

interface CustomerRow {
  id: string; email: string; fullName: string | null;
  kycStatus: string; diditVerifiedAt: string | null;
  lastLoginAt: string | null; createdAt: string; walletCount: number;
}

export default function CustomersPage() {
  const { data, error, loading } = useAdminData<CustomerRow[]>('/admin/customers');

  if (loading && !data) return <Spinner label="Loading customers…" />;

  const customers = data ?? [];
  const count = (status: string) => customers.filter((c) => c.kycStatus === status).length;

  return (
    <>
      <PageHeader
        title="Customers"
        description="End-users of the anchors. Identity is central so KYC can be reused across anchors — the customer's funds and keys stay in their own wallet."
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Customers" value={customers.length} />
        <StatCard label="KYC approved" value={count('approved')} tone="success" />
        <StatCard label="KYC pending" value={count('pending')} tone="warn" />
        <StatCard label="Declined" value={count('declined')} />
        <StatCard label="Proven wallets" value={customers.reduce((sum, c) => sum + c.walletCount, 0)} />
      </div>

      <TableShell>
        <Thead>
          <Th>Customer</Th><Th>KYC</Th><Th>Verified</Th>
          <Th align="right">Wallets</Th><Th>Last login</Th><Th align="right">Joined</Th>
        </Thead>
        <tbody>
          {customers.length === 0 && <EmptyRow colSpan={6}>No customers yet.</EmptyRow>}
          {customers.map((c) => (
            <Tr key={c.id}>
              <Td>
                <div className="font-medium">{c.fullName ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{c.email}</div>
              </Td>
              <Td><StatusBadge status={c.kycStatus} /></Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(c.diditVerifiedAt)}</Td>
              <Td align="right" className="tabular-nums">{c.walletCount}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{formatDate(c.lastLoginAt)}</Td>
              <Td align="right" className="whitespace-nowrap text-muted-foreground">{formatDate(c.createdAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      <p className="mt-4 text-xs text-muted-foreground">
        KYC status is real verification data from DIDIT. Per-customer transaction history lives in each
        anchor&apos;s business server and is not reachable from this console.
      </p>
    </>
  );
}
