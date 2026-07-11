/**
 * NordStern nav lockup — comet mark + wordmark.
 * The mark ships in two tones (dark ring for light UI, light ring for dark UI);
 * we render both and let CSS swap them with the Fumadocs `.dark` class so the
 * logo always contrasts with the surface.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-clear-display">
      {/* light theme: dark-ring mark */}
      <img
        src="/brand/logo-dark.png"
        alt=""
        width={26}
        height={26}
        className="h-[26px] w-[26px] object-contain dark:hidden"
      />
      {/* dark theme: light-ring mark */}
      <img
        src="/brand/logo-light.png"
        alt=""
        width={26}
        height={26}
        className="hidden h-[26px] w-[26px] object-contain dark:block"
      />
      <span className="text-[17px] font-semibold tracking-tight text-fd-foreground">
        NordStern
      </span>
    </span>
  );
}
