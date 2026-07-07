import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { ResendMailer } from './resend.js';
import { ConsoleMailer } from './console.js';

export interface Mailer {
  send(msg: { to: string; subject: string; html: string }): Promise<void>;
}

// Resend when configured; console (logs links) otherwise — keeps dev unblocked.
export const mailer: Mailer = env.RESEND_API_KEY ? new ResendMailer() : new ConsoleMailer();
if (!env.RESEND_API_KEY) {
  logger.warn('RESEND_API_KEY not set — verification/reset emails will be logged to the console (dev)');
}

export async function sendOtpEmail(to: string, code: string) {
  await mailer.send({
    to,
    subject: `${code} is your NordStern sign-in code`,
    html: `<p>Your sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
  });
}

export async function sendInvitationEmail(to: string, orgName: string, link: string) {
  await mailer.send({
    to,
    subject: `You're invited to ${orgName} on NordStern`,
    html: `<p>You've been invited to join <b>${orgName}</b> on NordStern.</p><p><a href="${link}">Accept invitation</a></p><p>${link}</p>`,
  });
}
