import { cn } from "@/lib/utils";

type LogosSimpleStaticLogo = Logo & {
  href?: string;
};
interface Logo {
  src: string;
  alt: string;
  srcDark?: string;
  name?: string;
  className?: string;
}

interface LogosSimpleStaticProps {
  logos: LogosSimpleStaticLogo[];
  className?: string;
  /** Reverse the scroll direction (default scrolls left; reverse scrolls right). */
  reverse?: boolean;
}

type Props = Partial<LogosSimpleStaticProps>;

const defaultProps: LogosSimpleStaticProps = {
  logos: [
    {
      src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/razorpay.svg",
      alt: "RazorpayX logo",
      name: "RazorpayX",
      className: "h-6 w-auto",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/stellar.svg",
      alt: "Stellar logo",
      name: "Stellar",
      className: "h-6 w-auto",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/claude.svg",
      alt: "Claude logo",
      name: "Claude",
      className: "h-6 w-auto",
    },
    {
      src: "https://didit.me/logos/switch/didit.svg",
      alt: "Didit logo",
      name: "Didit",
      className: "h-6 w-auto",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/supabase.svg",
      alt: "Supabase logo",
      name: "Supabase",
      className: "h-6 w-auto",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/coinbase.svg",
      alt: "Coinbase logo",
      name: "Coinbase",
      className: "h-6 w-auto",
    },
  ],
};

const Logos19 = (props: Props) => {
  const { logos, className, reverse } = {
    ...defaultProps,
    ...props,
  };

  return (
    <section className={cn("py-16", className)}>
      <div
        className="group relative flex overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black clamp(16px, 7vw, 64px), black calc(100% - clamp(16px, 7vw, 64px)), transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black clamp(16px, 7vw, 64px), black calc(100% - clamp(16px, 7vw, 64px)), transparent)",
        }}
      >
        {/* Two identical tracks; the animation shifts by exactly one track (-50%) for a seamless loop. */}
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1}
            className={cn(
              "flex shrink-0 items-center animate-[marquee-x_60s_linear_infinite] group-hover:paused motion-reduce:animate-none",
              reverse && "[animation-direction:reverse]",
            )}
          >
            {logos.map((logo, index) => (
              <li
                key={`${logo.src}-${index}`}
                className="mx-8 flex items-center justify-center sm:mx-12 lg:mx-16"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={logo.src}
                    alt={track === 1 ? "" : logo.alt}
                    className={cn(
                      logo.className,
                      "h-auto max-h-8 w-auto object-contain opacity-[0.42] transition-opacity duration-300 group-hover:opacity-100 dark:invert",
                    )}
                  />
                  {logo.name && (
                    <span className="text-[20px] font-semibold tracking-tight text-ink/35 transition-colors duration-300 group-hover:text-ink/90">
                      {logo.name}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
};

export { Logos19 };
