import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Mission } from "@/components/sections/mission";
import {LogoStrip} from "@/components/sections/logo-strip";
import { Outcomes } from "@/components/sections/outcomes";
import { PrimitivesBento } from "@/components/sections/primitives-bento";
import { BuildPaths } from "@/components/sections/build-paths";
import { MobileApp } from "@/components/sections/mobile-app";
import { Trust } from "@/components/sections/trust";
import { Resources } from "@/components/sections/resources";
import { Faq } from "@/components/sections/faq";
import { FinalCTA } from "@/components/sections/final-cta";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      
      <main className= "mx-auto" id="top">
        <Hero />
        <LogoStrip />
        <Mission />
        <Outcomes />
        <BuildPaths />
        <MobileApp />
        <PrimitivesBento />
        <Trust />
        <Resources />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
