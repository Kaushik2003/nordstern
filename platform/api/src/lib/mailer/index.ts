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
  logger.warn('RESEND_API_KEY not set — OTP + onboarding emails will be logged to the console (dev)');
}

// ── Shared branded layout ─────────────────────────────────────────────────────
// One inline-styled shell (email clients ignore <style>/external CSS) so every NordStern email
// mirrors the landing page 1:1: real logo lockup, white card at 32px radius on the mint-gray
// surface, ink text, black pill button, mint (brand-100/800) badge. Tokens are copied straight
// from frontend/landing/app/globals.css. Custom fonts cannot load in email, so we fall back to a
// clean system sans; every other value matches the site.
const SURFACE = '#f2f4f3';     // landing --color-surface (backdrop)
const CANVAS = '#ffffff';      // landing --color-canvas (card)
const INK = '#0b0b0b';         // landing --color-ink
const MUTED = '#5b5b5b';       // landing --color-muted
const SUBTLE = '#9a9a9a';      // landing --color-subtle
const LINE = '#e6e9e8';        // landing --color-line
const BRAND_100 = '#e9e5fb';   // landing --color-brand-100 (badge bg)
const BRAND_800 = '#4b3f9e';   // landing --color-brand-800 (badge text)
const LOGO = 'https://www.nordstern.live/logo-dark.png';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function layout(opts: { heading: string; body: string; cta?: { label: string; url: string }; footnote?: string }): string {
  // Primary button = landing's pill: bg-ink, white text, fully rounded.
  const button = opts.cta
    ? `<tr><td style="padding:20px 0 2px"><a href="${opts.cta.url}" style="display:inline-block;background:${INK};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">${opts.cta.label}</a></td></tr>`
    : '';
  const foot = opts.footnote ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${SUBTLE}">${opts.footnote}</p>` : '';
  return `
  <div style="background:${SURFACE};padding:44px 16px;font-family:${FONT}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;background:${CANVAS};border-radius:32px;overflow:hidden;border:1px solid ${LINE}">
        <tr><td style="padding:32px 36px 24px">
          <img src="${LOGO}" width="36" height="36" alt="NordStern" style="display:inline-block;vertical-align:middle;border-radius:10px;width:36px;height:36px">
          <span style="vertical-align:middle;margin-left:10px;font-size:18px;font-weight:600;letter-spacing:-0.4px;color:${INK}">NordStern</span>
        </td></tr>
        <tr><td style="padding:0 36px 36px">
          <h1 style="margin:0 0 12px;font-size:23px;line-height:1.25;font-weight:600;letter-spacing:-0.5px;color:${INK}">${opts.heading}</h1>
          <div style="font-size:15px;line-height:1.65;color:${MUTED}">${opts.body}</div>
          <table role="presentation" cellpadding="0" cellspacing="0">${button}</table>
          ${foot}
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:${SUBTLE}">NordStern · Anchor infrastructure on Stellar · testnet</p>
    </td></tr></table>
  </div>`;
}

// The one-time code as the landing's mint badge — brand-100 fill, brand-800 text, pill-ish.
function codeBlock(code: string): string {
  return `<div style="margin:4px 0 2px;padding:18px 0;background:${BRAND_100};border-radius:20px;text-align:center">
    <span style="font-size:34px;font-weight:600;letter-spacing:10px;color:${BRAND_800};font-family:${FONT}">${code}</span>
  </div>`;
}

async function deliver(to: string, subject: string, html: string): Promise<void> {
  await mailer.send({ to, subject, html });
}

// Lifecycle senders NEVER throw — onboarding must not fail because an email bounced.
// (OTP is the exception below: auth flows decide how to handle a send failure.)
async function fireAndForget(kind: string, to: string, subject: string, html: string): Promise<void> {
  try { await deliver(to, subject, html); }
  catch (err) { logger.warn({ err, kind, to }, 'onboarding email send failed'); }
}

// ── OTP (auth) — may throw so the caller can react ────────────────────────────
// The message is tailored to WHO is signing in, so an operator and a customer never get the
// same generic email:
//   • operator → their NordStern operator console (manages the anchor)
//   • customer → their account on a specific anchor (buy/sell), named when we know it
export type OtpAudience = 'operator' | 'customer';
export interface OtpContext { audience: OtpAudience; anchorName?: string }

export async function sendOtpEmail(to: string, code: string, ctx: OtpContext = { audience: 'operator' }) {
  const anchor = ctx.anchorName?.trim();
  let subject: string;
  let heading: string;
  let lead: string;

  if (ctx.audience === 'operator') {
    subject = `${code} — sign in to your NordStern console`;
    heading = 'Sign in to your operator console';
    lead = 'Use this one-time code to sign in to your NordStern operator console, where you manage your anchor’s treasury, pricing, and compliance.';
  } else if (anchor) {
    subject = `${code} — sign in to ${anchor}`;
    heading = `Sign in to ${anchor}`;
    lead = `Use this one-time code to sign in to your <b>${anchor}</b> account and buy or sell.`;
  } else {
    subject = `${code} is your sign-in code`;
    heading = 'Sign in to your account';
    lead = 'Use this one-time code to sign in and continue buying or selling.';
  }

  await deliver(to, subject, layout({
    heading,
    body: `<p style="margin:0 0 14px">${lead}</p>${codeBlock(code)}`,
    footnote: 'This code expires in 10 minutes. If you didn’t request it, you can safely ignore this email.',
  }));
}

// Legacy generic invitation (kept for the operator invitation flow).
export async function sendInvitationEmail(to: string, orgName: string, link: string) {
  await fireAndForget('invitation', to, `You're invited to ${orgName} on NordStern`, layout({
    heading: `You’re invited to ${orgName}`,
    body: `<p style="margin:0 0 6px">You’ve been invited to join <b>${orgName}</b> on NordStern.</p>`,
    cta: { label: 'Accept invitation', url: link },
  }));
}

// ── Onboarding lifecycle ──────────────────────────────────────────────────────

// Sent the moment a business submits an application.
export async function sendApplicationReceivedEmail(to: string, businessName: string) {
  await fireAndForget('application.received', to, 'We received your NordStern application', layout({
    heading: 'Application received',
    body: `<p style="margin:0 0 10px">Thanks${businessName ? `, <b>${businessName}</b>` : ''} — we’ve received your application to launch an anchor on NordStern.</p>
           <p style="margin:0">Our team will review your details and get back to you. No action is needed right now.</p>`,
  }));
}

// Sent on approval — carries the one-time redeem link that starts provisioning.
export async function sendApplicationApprovedEmail(to: string, businessName: string, redeemUrl: string) {
  await fireAndForget('application.approved', to, 'Your NordStern application is approved 🎉', layout({
    heading: 'You’re approved',
    body: `<p style="margin:0 0 10px">Great news${businessName ? `, <b>${businessName}</b>` : ''} — your application is approved.</p>
           <p style="margin:0 0 4px">Click below to set your subdomain, brand your anchor, and launch. This link is one-time and expires in 7 days.</p>`,
    cta: { label: 'Set up & launch your anchor', url: redeemUrl },
    footnote: redeemUrl,
  }));
}

// Sent on rejection.
export async function sendApplicationRejectedEmail(to: string, businessName: string) {
  await fireAndForget('application.rejected', to, 'Update on your NordStern application', layout({
    heading: 'Application update',
    body: `<p style="margin:0 0 10px">Thank you for your interest${businessName ? `, <b>${businessName}</b>` : ''}. After review, we’re unable to approve your anchor application at this time.</p>
           <p style="margin:0">If you think this was in error or your circumstances change, reply to this email and we’ll take another look.</p>`,
  }));
}

// Sent when provisioning finishes and the anchor is live. Carries the anchor's real
// coordinates (the same evidence the redeem success screen shows), the operator console
// link, and the operating terms.
export interface AnchorLiveDetails {
  slug: string;
  homeDomain: string;               // <slug>.nordstern.live
  assetCode?: string;
  assetIssuer?: string;
  network?: 'testnet' | 'mainnet';
  termsUrl?: string;
}

function emailRow(label: string, valueHtml: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:7px 0 7px 16px;font-size:13px;color:${INK};text-align:right;word-break:break-all">${valueHtml}</td>
  </tr>`;
}

export async function sendAnchorLiveEmail(to: string, businessName: string, d: AnchorLiveDetails) {
  const net = d.network ?? 'testnet';
  const appUrl = `https://${d.homeDomain}`;
  const consoleUrl = `https://console-${d.slug}.nordstern.live`;
  const termsUrl = d.termsUrl ?? 'https://www.nordstern.live/terms';
  const link = (href: string, text: string) => `<a href="${href}" style="color:${BRAND_800};text-decoration:none">${text}</a>`;
  const expert = (a: string) => `https://stellar.expert/explorer/${net}/account/${a}`;

  const rows = [
    emailRow('Anchor (customer app)', link(appUrl, d.homeDomain)),
    emailRow('SEP-1 service file', link(`${appUrl}/.well-known/stellar.toml`, '/.well-known/stellar.toml')),
    d.assetCode ? emailRow('Issued asset', `<b>${d.assetCode}</b> · ${net}`) : '',
    d.assetIssuer ? emailRow('Asset issuer', link(expert(d.assetIssuer), `${d.assetIssuer.slice(0, 8)}…${d.assetIssuer.slice(-6)} ↗`)) : '',
    emailRow('SEP-10 auth', `<span style="color:${MUTED}">${appUrl}/auth</span>`),
  ].join('');

  const body = `
    <p style="margin:0 0 16px">${businessName ? `<b>${businessName}</b>’s ` : 'Your '}anchor is provisioned and running on Stellar ${net}. Here are its live coordinates:</p>
    <div style="margin:0 0 18px;padding:6px 18px;background:${SURFACE};border-radius:16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>
    <p style="margin:0">Your operator console is where you manage treasury, pricing, KYC, and credentials.</p>
    <div style="margin:20px 0 0;padding:14px 16px;background:${SURFACE};border-radius:16px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${INK}">Operating terms</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED}">
        NordStern provides the infrastructure; you operate the anchor and are responsible for your
        own regulatory compliance (including any VDA/VDASP registration and FIU-IND obligations)
        before moving real funds. This ${net} anchor is for evaluation. By launching and operating
        it you agree to the ${link(termsUrl, 'NordStern Operator Terms')}.
      </p>
    </div>`;

  await fireAndForget('anchor.live', to, `${businessName || 'Your'} anchor is live on NordStern 🚀`, layout({
    heading: 'Your anchor is live 🚀',
    body,
    cta: { label: 'Open your operator console ↗', url: consoleUrl },
    footnote: `Console: ${consoleUrl.replace('https://', '')}`,
  }));
}
