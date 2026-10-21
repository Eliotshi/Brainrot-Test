// Envoi via Gmail (SMTP + mot de passe d'application Google).
import nodemailer from "nodemailer";

const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD;

export function mailConfigured() { return Boolean(USER && PASS); }

let transport = null;

export async function sendMail({ to, subject, html, text, unsubscribeUrl }) {
  if (!transport) transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: USER, pass: PASS },
    // la fonction Vercel ne doit pas rester bloquée si Gmail ne répond pas
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
  });
  const name = (process.env.MAIL_FROM_NAME || "Cerveau Cramé").replace(/["\r\n]/g, "");
  const headers = unsubscribeUrl
    ? { "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${USER}?subject=STOP>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : { "List-Unsubscribe": `<mailto:${USER}?subject=STOP>` };
  return transport.sendMail({ from: `"${name}" <${USER}>`, to, subject, html, text, headers });
}
