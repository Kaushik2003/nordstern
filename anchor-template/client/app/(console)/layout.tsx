import { EnvHairline } from "@/components/shell/env-hairline";
import { Sidebar, MobileTabBar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ScenarioOverlay } from "@/components/shell/scenario-overlay";
import { CommandPalette } from "@/components/shell/command-palette";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-base w-full">
      <EnvHairline />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileTabBar />
      <ScenarioOverlay />
      <CommandPalette />
    </div>
  );
}
