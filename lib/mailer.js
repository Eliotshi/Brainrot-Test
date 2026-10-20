// Envoi via Gmail (SMTP + mot de passe d'application Google).
import nodemailer from "nodemailer";

const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD;

export function mailConfigured() { return Boolean(USER && PASS); }

let transport = null;

export async function sendMail({ to, subject, html, text }) {
  if (!transport) transport = nodemailer.createTransport({ service: "gmail", auth: { user: USER, pass: PASS } });
  const name = process.env.MAIL_FROM_NAME || "Cerveau Cramé";
  return transport.sendMail({
    from: `"${name}" <${USER}>`,
    to, subject, html, text,
    headers: { "List-Unsubscribe": `<mailto:${USER}?subject=STOP>` },
  });
}
