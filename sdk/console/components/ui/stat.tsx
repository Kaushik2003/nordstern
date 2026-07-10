import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Metric tile — the dashboard's unit of "one number that matters". Keeps every KPI
// visually identical (label, big value, sublabel, optional icon) across modules.
export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  accent?: 'default' | 'danger';
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium text-subtle">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-subtle" />}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className={accent === 'danger' ? 'text-2xl font-bold text-[var(--color-danger)]' : 'text-2xl font-bold text-ink'}>
            {value}
          </div>
        )}
        {sub != null && <p className="mt-0.5 text-xs text-subtle">{loading ? '' : sub}</p>}
      </CardContent>
    </Card>
  );
}
