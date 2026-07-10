import { AdminShell } from '@/components/shell';

// Every route in this group sits behind the ns_admin session guard.
// `/login` lives outside the group so it renders without the shell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
