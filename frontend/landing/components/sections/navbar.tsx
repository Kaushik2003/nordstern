"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ChevronRight } from "@/components/ui/icons";
import { MegaMenu } from "@/components/sections/mega-menu";
import { EASE } from "@/components/motion/ease";
import { NAV } from "@/lib/content";
import { cn } from "@/lib/cn";

// nav items that have a mega-menu vs plain anchor links
const PLAIN_NAV = [
  { label: "Mobile App", href: "#mobile-app" },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // close mega-menu when clicking outside
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 16);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleMenu(label: string) {
    setActiveMenu((prev) => (prev === label ? null : label));
  }

  function closeAll() {
    setActiveMenu(null);
    setMobileOpen(false);
  }

  // keep open while mouse is moving between trigger and panel
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  const hasMenu = (label: string) => NAV.some((n) => n.label === label);

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50">
      {/* bar */}
      <div
        className={cn(
          "border-b transition-all duration-300",
          scrolled || mobileOpen || activeMenu
            ? "border-line/80 bg-white/92 backdrop-blur-xl"
            : "border-transparent bg-white/72 backdrop-blur-md",
        )}
      >
        <Container className="flex h-[72px] items-center justify-between lg:h-20">
          {/* left: logo + desktop nav */}
          <div className="flex items-center gap-9 xl:gap-12">
            <Link href="#top" aria-label="NordStern home" onClick={closeAll} className="shrink-0">
              <Logo />
            </Link>

            <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
              {/* mega-menu items */}
              {NAV.map((item) => {
                const isOpen = activeMenu === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => toggleMenu(item.label)}
                    onMouseEnter={() => { cancelClose(); setActiveMenu(item.label); }}
                    onMouseLeave={scheduleClose}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={cn(
                      "relative flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors xl:px-4",
                      isOpen ? "text-ink" : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                    <svg
                      className={cn("size-3 transition-transform duration-200", isOpen ? "rotate-180" : "")}
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {/* active page indicator */}
                    <span className={cn("absolute inset-x-3.5 bottom-0.5 h-px origin-center bg-brand-700 transition-transform duration-300", isOpen ? "scale-x-100" : "scale-x-0")} />
                  </button>
                );
              })}

              {/* plain anchor links */}
              {PLAIN_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeAll}
                  className="relative rounded-full px-3.5 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink xl:px-4"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* right: actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link id="nav-sandbox-link" href="#build" className="rounded-full px-3 py-2 text-[14px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink">
              Sandbox
            </Link>
            <Button id="nav-cta-button" href="#cta" variant="ghost" className="h-10 gap-1.5 pl-4 pr-3.5">
              Talk to us
              <ChevronRight className="text-subtle" />
            </Button>
          </div>

          {/* mobile burger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-line bg-white transition hover:bg-surface lg:hidden"
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <span className="relative block h-3 w-5">
                <span className="absolute left-0 top-0 h-px w-5 bg-ink" />
                <span className="absolute bottom-0 left-0 h-px w-5 bg-ink" />
              </span>
            )}
          </button>
        </Container>
      </div>

      {/* ── Desktop mega-menu panel ─────────────────────────────────────── */}
      {/* Outer shell: mounts/unmounts (open ↔ closed) with full 0.75s animation */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scaleY: 0.94 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scaleY: 0.97 }}
            transition={{
              opacity: { duration: 0.15, ease: "easeOut" },
              y:       { duration: 0.75, ease: EASE },
              scaleY:  { duration: 0.75, ease: EASE },
            }}
            style={{ transformOrigin: "top center" }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="hidden border-b border-line bg-white/96 shadow-[0_24px_60px_-24px_rgba(20,20,43,.18)] backdrop-blur-xl lg:block overflow-hidden"
          >
            {/* Inner content: cross-fades when switching between nav items */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <Container className="py-8">
                  {NAV.map((item) =>
                    item.label === activeMenu ? (
                      <MegaMenu key={item.label} menu={item.menu} />
                    ) : null,
                  )}
                </Container>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="border-b border-line bg-white/96 shadow-[0_24px_50px_-32px_rgba(20,20,43,.28)] backdrop-blur-xl lg:hidden"
          >
            <Container className="py-4">
              <nav aria-label="Mobile navigation" className="grid gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeAll}
                    className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{item.label}</span>
                    </span>
                    <ChevronRight className="text-subtle transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
                {PLAIN_NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeAll}
                    className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{item.label}</span>
                    </span>
                    <ChevronRight className="text-subtle transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </nav>

              <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2 border-t border-line pt-4">
                <Button href="#build" onClick={closeAll} variant="ghost" size="sm">Sandbox</Button>
                <Button href="#cta" onClick={closeAll} variant="primary" size="sm">Talk to us <ChevronRight /></Button>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
