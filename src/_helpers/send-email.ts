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

// ─── Gmail sender ─────────────────────────────────────────────────────────────

async function sendViaGmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const { user, appPassword } = config.email.gmail;

  if (!user || !appPassword) {
    throw new Error(
      "Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: appPassword,
    },
  });

  await transporter.sendMail({
    from: `"${config.email.from}" <${user}>`,
    to,
    subject,
    html,
  });
}

// ─── Resend sender ────────────────────────────────────────────────────────────

async function sendViaResend({ to, subject, html }: SendEmailOptions): Promise<void> {
  const { apiKey } = config.email.resend;

  if (!apiKey) {
    throw new Error(
      "Resend API key missing. Set RESEND_API_KEY in your .env file."
    );
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: config.email.from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = config.email.provider;

  if (config.env !== "production") {
    console.log(
      `[email] ${provider} → ${options.to} | Subject: "${options.subject}"`
    );
  }

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
