import nodemailer from "nodemailer";
import config from "../../config.json";

export default sendEmail;

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport(config.smtp);
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
  });
}
