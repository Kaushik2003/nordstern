export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-xl font-semibold tracking-tight">
          Nord<span className="text-brand">Stern</span>
        </div>
        {children}
      </div>
    </div>
  );
}
