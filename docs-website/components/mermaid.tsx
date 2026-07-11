'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Renders a Mermaid diagram, themed to match the NordStern palette and
 * re-rendered whenever the site toggles between light and dark.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[:]/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [isDark, setIsDark] = useState(false);

  // Track the Fumadocs `.dark` class on <html>.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        theme: 'base',
        themeVariables: isDark
          ? {
              background: 'transparent',
              primaryColor: '#221f2c',
              primaryBorderColor: '#ab9ff2',
              primaryTextColor: '#f4f3f8',
              lineColor: '#8b7ee0',
              secondaryColor: '#1a1822',
              tertiaryColor: '#1a1822',
              noteBkgColor: '#2a2536',
              noteTextColor: '#e9e5fb',
              noteBorderColor: '#6f5fd6',
              actorBkg: '#221f2c',
              actorBorder: '#ab9ff2',
              actorTextColor: '#f4f3f8',
            }
          : {
              background: 'transparent',
              primaryColor: '#f1eefb',
              primaryBorderColor: '#6f5fd6',
              primaryTextColor: '#17151f',
              lineColor: '#8b7ee0',
              secondaryColor: '#ece7fb',
              tertiaryColor: '#f5f2ff',
              noteBkgColor: '#f5f2ff',
              noteTextColor: '#3c315b',
              noteBorderColor: '#8b7ee0',
              actorBkg: '#f1eefb',
              actorBorder: '#6f5fd6',
              actorTextColor: '#17151f',
            },
      });

      try {
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setSvg('');
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id, isDark]);

  if (!svg) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground">
        {chart}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-fd-border bg-fd-card/40 p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
