import { PageHeaderSkeleton, StatRowSkeleton, CardSkeleton } from '@/components/ui/skeleton';

// Shown by the App Router while a route segment loads — a generic, on-brand skeleton so every
// page has an instant, tasteful loading state during navigation.
export default function Loading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
