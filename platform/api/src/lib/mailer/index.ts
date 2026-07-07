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

export async function sendVerificationEmail(to: string, link: string) {
  await mailer.send({
    to,
    subject: 'Verify your NordStern email',
    html: `<p>Welcome to NordStern.</p><p>Confirm your email to activate your account:</p><p><a href="${link}">Verify email</a></p><p>${link}</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, link: string) {
  await mailer.send({
    to,
    subject: 'Reset your NordStern password',
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">Reset password</a></p><p>${link}</p><p>If you didn't request this, ignore this email.</p>`,
  });
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
