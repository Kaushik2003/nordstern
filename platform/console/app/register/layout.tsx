import { ReactNode } from 'react';

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-canvas text-ink font-sans flex">
      {children}
    </div>
  );
}
