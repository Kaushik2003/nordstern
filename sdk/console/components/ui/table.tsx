import * as React from 'react';
import { cn } from '@/lib/cn';

// Minimal table primitives shared by every ledger/list module. Horizontal scroll is
// the caller's responsibility (wrap in a `div.overflow-x-auto`) so wide money tables
// never break the page layout.
export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full text-sm', className)} {...p} />
);
export const THead = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('text-left text-xs text-subtle', className)} {...p} />
);
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TR = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-line/60', className)} {...p} />
);
export const TH = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('py-2 pr-4 font-medium', className)} {...p} />
);
export const TD = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('py-2.5 pr-4 text-ink', className)} {...p} />
);
