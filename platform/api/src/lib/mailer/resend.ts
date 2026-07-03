import { Resend } from 'resend';
import type { Mailer } from './index.js';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export class ResendMailer implements Mailer {
  private client = new Resend(env.RESEND_API_KEY);

  async send(msg: { to: string; subject: string; html: string }) {
    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    if (error) {
      logger.error({ err: error }, 'Resend send failed');
      throw new Error(error.message);
    }
  }
}
