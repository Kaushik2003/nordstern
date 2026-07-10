/** Presentation helpers shared across the admin views. */

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** "3d ago" / "just now" — for activity feeds where absolute time is noise. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [[60, 'm'], [3600, 'h'], [86400, 'd'], [2592000, 'mo']];
  for (let i = units.length - 1; i >= 0; i--) {
    const [secs, label] = units[i];
    if (seconds >= secs) return `${Math.floor(seconds / secs)}${label} ago`;
  }
  return 'just now';
}

/** Duration between two timestamps, for provisioning runs. */
export function duration(start: string | Date | null, end: string | Date | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Middle-truncate long opaque identifiers (Stellar addresses, UUIDs). `tail: 0` clips the end. */
export function truncate(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) return '—';
  if (value.length <= head + tail + 1) return value;
  // `slice(-0)` returns the whole string, so an empty tail needs its own branch.
  return tail === 0 ? `${value.slice(0, head)}…` : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** `application.approved` → `Application approved` */
export function humanizeAction(action: string): string {
  const words = action.replace(/[._]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
