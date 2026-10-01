import nodemailer from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email via SMTP. Without SMTP configured (development), the message is logged to the
 * console instead so flows like password reset stay testable — nothing pretends it was delivered.
 */
export async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    if (!env.isTest) logger.warn(`[email:not-configured] To: ${to} | ${subject}\n${text}`);
    return { delivered: false };
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text, html: html || `<p>${text.replace(/\n/g, '<br>')}</p>` });
    return { delivered: true };
  } catch (err) {
    logger.error('Email send failed', err.message);
    return { delivered: false };
  }
}

export const emailTemplates = {
  passwordReset: (name, link) => ({
    subject: 'Reset your SRKians password',
    text: `Hi ${name},\n\nUse the link below to reset your password. It expires in 30 minutes.\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
  }),
  verifyEmail: (name, link) => ({
    subject: 'Verify your SRKians email',
    text: `Hi ${name},\n\nWelcome to the SRKian family! Please verify your email:\n\n${link}\n\nThis link expires in 24 hours.`,
  }),
};
