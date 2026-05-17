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

async function sendViaGmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<void> {
  const { user, appPassword } = config.email.gmail;

  if (!user || !appPassword) {
    throw new Error(
      "Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // TLS on port 465 — more reliable than STARTTLS 587
    auth: {
      user,
      pass: appPassword,
    },
    connectionTimeout: 10_000, // fail fast instead of hanging forever
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: `"No Reply" <${user}>`,
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
  const { apiKey } = config.email.resend;

  if (!apiKey) {
    throw new Error(
      "Resend API key missing. Set RESEND_API_KEY in your .env file.",
    );
  }

  const resend = new Resend(apiKey);

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
