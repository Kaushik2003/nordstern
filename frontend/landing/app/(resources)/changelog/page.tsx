import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Section } from "@/components/ui/section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | NordStern",
  description: "What's new in NordStern.",
};

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto" id="top">
        <Section tone="canvas" className="min-h-[60vh] flex flex-col justify-center pt-32 pb-16">
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.035em] text-ink text-center">
              Changelog
            </h1>
            <p className="mt-6 text-center text-[19px] leading-relaxed text-muted max-w-2xl mx-auto">
              Recent updates coming soon.
            </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
