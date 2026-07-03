import type { Mailer } from './index.js';
import { logger } from '../logger.js';

// Dev fallback: log the email + surface any links plainly so flows are testable
// without an email provider.
export class ConsoleMailer implements Mailer {
  async send(msg: { to: string; subject: string; html: string }) {
    logger.info({ to: msg.to, subject: msg.subject }, `[email] ${msg.subject}`);
    const links = msg.html.match(/https?:\/\/[^"<)\s]+/g) ?? [];
    for (const link of links) logger.info(`[email] link → ${link}`);
  }
}
