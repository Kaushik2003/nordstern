'use client';

// A template re-mounts on every navigation (unlike layout), so the enter animation replays
// each time the operator moves between pages — a smooth, consistent transition everywhere.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
