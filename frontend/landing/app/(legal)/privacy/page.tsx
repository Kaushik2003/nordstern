import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Section } from "@/components/ui/section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | NordStern",
  description: "NordStern's Privacy Policy.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto" id="top">
        <Section tone="canvas" className="min-h-[60vh] flex flex-col justify-center pt-32 pb-16">
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.035em] text-ink text-center">
              Privacy Policy
            </h1>
            <p className="mt-6 text-center text-[19px] leading-relaxed text-muted max-w-2xl mx-auto">
              Page content coming soon.
            </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
