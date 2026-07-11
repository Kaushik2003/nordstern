import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/components/logo';
import { gitConfig } from './shared';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://nordstern.live';
const REGISTER_URL = process.env.NEXT_PUBLIC_REGISTER_URL ?? 'https://register.nordstern.live';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />,
      // Clicking the wordmark returns to the marketing site, per brand guidance.
      url: LANDING_URL,
    },
    links: [
      {
        text: 'Launch an anchor',
        url: REGISTER_URL,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
