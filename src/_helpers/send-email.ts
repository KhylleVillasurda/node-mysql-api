/**
 * Email sender — supports Gmail (via nodemailer) and Resend.
 * Provider is chosen at runtime via EMAIL_PROVIDER env var.
 *
 * Gmail setup:
 *   1. Enable 2-Step Verification on your Google account.
 *   2. Generate an App Password at https://myaccount.google.com/apppasswords
 *   3. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env
 *
 * Resend setup (free: 3,000/mo, 100/day):
 *   1. Sign up at https://resend.com and verify your sending domain.
 *   2. Create an API key and set RESEND_API_KEY in .env
 *   3. Update EMAIL_FROM to an address on your verified domain.
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { config } from "./config";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// FIX: Create these once at module load, not on every sendEmail() call.
// The original code built a new transporter / Resend instance per email,
// which meant re-establishing a connection every time. By reusing a single
// instance, the TCP handshake (Gmail) and object overhead (Resend) only
// happen once per server process.
let _resend: Resend | null = null;
let _gmailTransport: nodemailer.Transporter | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!config.email.resend.apiKey) {
      throw new Error(
        "Resend API key missing. Set RESEND_API_KEY in your .env file.",
      );
    }
    _resend = new Resend(config.email.resend.apiKey);
  }
  return _resend;
}

function getGmailTransport(): nodemailer.Transporter {
  if (!_gmailTransport) {
    const { user, appPassword } = config.email.gmail;
    if (!user || !appPassword) {
      throw new Error(
        "Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.",
      );
    }
    _gmailTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass: appPassword },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return _gmailTransport;
}

async function sendViaGmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<void> {
  const transporter = getGmailTransport();
  await transporter.sendMail({
    from: `"No Reply" <${config.email.gmail.user}>`,
    to,
    subject,
    html,
  });
}

async function sendViaResend({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: config.email.from,
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = config.email.provider;
  console.log(
    `[email] ${provider} → ${options.to} | Subject: "${options.subject}"`,
  );
  switch (provider) {
    case "gmail":
      return sendViaGmail(options);
    case "resend":
      return sendViaResend(options);
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

export default sendEmail;
