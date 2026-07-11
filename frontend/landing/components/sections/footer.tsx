import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Heading } from "@/components/ui/typography";
import { FOOTER } from "@/lib/content";

/** Green status pill (bottom-left), adapted from Phantom's "Operational". */
function StatusBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-surface px-4 py-2 text-sm font-medium text-ink">
      <span className="size-2 rounded-full bg-[color:var(--color-up)]" />
      {FOOTER.status}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="bg-surface-2 px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
      {/* large rounded card floating on the purple frame */}
      <div className="rounded-[1.75rem] bg-canvas p-7 sm:rounded-[2.25rem] sm:p-10 lg:p-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.15fr] lg:gap-16">
          {/* left: brand + status, generous negative space between */}
          <div className="flex flex-col justify-between gap-16">
            <Link href="/" aria-label="NordStern home" className="inline-flex">
              <LogoMark className="size-11" />
            </Link>
            <StatusBadge />
          </div>

          {/* right: CTA card + link columns */}
          <div>
            <div className="rounded-3xl border border-line bg-surface p-7 sm:p-9">
              <Heading size="h3" className="max-w-md text-[clamp(1.6rem,2.4vw,2.1rem)] font-normal">
                {FOOTER.cta.title}
              </Heading>
              <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[15px] leading-relaxed text-muted">
                  {FOOTER.cta.body}
                </p>
                <Button
                  id="footer-cta-button"
                  href={FOOTER.cta.button.href}
                  variant="primary"
                  className="w-fit shrink-0"
                >
                  {FOOTER.cta.button.label}
                </Button>
              </div>
            </div>

            {/* link columns */}
            <nav className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(FOOTER.columns).map(([heading, items]) => (
                <div key={heading}>
                  <p className="text-sm font-medium text-subtle">{heading}</p>
                  <ul className="mt-4 space-y-3">
                    {items.map((it) => (
                      <li key={it}>
                        <Link
                          href={['About', 'Careers', 'Blog', 'FAQ', 'Status', 'Changelog'].includes(it) ? `/${it.toLowerCase()}` : "#"}
                          className="text-[15px] text-ink transition-colors hover:text-brand-700"
                        >
                          {it}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* bottom bar on the purple frame */}
      <Container className="mt-4 flex flex-col items-center justify-between gap-3 px-3 text-[13px] text-muted sm:flex-row">
        <span>© {new Date().getFullYear()} NordStern</span>
        <div className="flex gap-6">
          <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
        </div>
      </Container>
    </footer>
  );
}
