import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Section } from "@/components/ui/section";
import type { Metadata } from "next";
import { Tweet } from "react-tweet";

export const metadata: Metadata = {
  title: "Blog | NordStern",
  description: "News, updates, and thoughts from the NordStern team.",
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto" id="top">
        <Section tone="canvas" className="min-h-[60vh] pt-32 pb-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.035em] text-ink text-center">
              Our Updates
            </h1>
            <p className="mt-6 text-center text-[19px] leading-relaxed text-muted max-w-2xl mx-auto mb-16">
              Latest news, threads, and insights from the NordStern team.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
              <Tweet id="2072393706825785524" />
              <Tweet id="2074627609732977076" />
              <Tweet id="2075300558068666658" />
              <Tweet id="2075667792041537797" />
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
