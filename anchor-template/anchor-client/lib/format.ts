// Money & time formatting for the customer app. INR is the customer's currency.
export const inr = (v: string | number | null | undefined): string =>
  v == null || v === '' ? '—' : `₹${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export const dateTime = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
