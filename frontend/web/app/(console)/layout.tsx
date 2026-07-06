import { Sidebar, MobileTabBar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { EnvHairline } from "@/components/shell/env-hairline";
import { ScenarioOverlay } from "@/components/shell/scenario-overlay";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-base">
      <EnvHairline />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(130%_100%_at_50%_-20%,#faf9ff_0%,#f5f5f9_55%,#f1f0f6_100%)]">
        <Topbar />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileTabBar />
      <ScenarioOverlay />
    </div>
  );
}
