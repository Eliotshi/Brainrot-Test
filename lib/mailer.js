// Envoi des e-mails. Fournisseur choisi par EMAIL_PROVIDER :
//   gmail  (défaut) : SMTP Gmail + mot de passe d'application (GMAIL_USER, GMAIL_APP_PASSWORD).
//                     Parfait pour le transactionnel, ~500 envois/jour maximum.
//   resend / brevo  : API HTTP (EMAIL_API_KEY, EMAIL_FROM), pour les envois en masse (plan 21 jours).
// Sans configuration complète : mailConfigured() est faux, rien ne part et le front ne promet rien.

const PROVIDER = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const API_KEY = process.env.EMAIL_API_KEY;
const FROM = process.env.EMAIL_FROM || GMAIL_USER;
const NAME = (process.env.MAIL_FROM_NAME || "Cerveau Cramé").replace(/["\r\n]/g, "");

export function mailConfigured() {
  if (PROVIDER === "gmail") return Boolean(GMAIL_USER && GMAIL_PASS);
  if (PROVIDER === "resend" || PROVIDER === "brevo") return Boolean(API_KEY && FROM);
  return false;
}

function unsubHeaders(unsubscribeUrl) {
  return unsubscribeUrl
    ? { "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${FROM}?subject=STOP>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : { "List-Unsubscribe": `<mailto:${FROM}?subject=STOP>` };
}

let transport = null;
async function sendGmail({ to, subject, html, text, headers }) {
  if (!transport) {
    const { default: nodemailer } = await import("nodemailer");
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      // la fonction Vercel ne doit pas rester bloquée si Gmail ne répond pas
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
    });
  }
  return transport.sendMail({ from: `"${NAME}" <${GMAIL_USER}>`, to, subject, html, text, headers });
}

async function postJSON(url, headers, body) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error(`${url} ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json().catch(() => ({}));
  } finally { clearTimeout(t); }
}

export async function sendMail({ to, subject, html, text, unsubscribeUrl }) {
  const headers = unsubHeaders(unsubscribeUrl);
  if (PROVIDER === "resend")
    return postJSON("https://api.resend.com/emails", { Authorization: `Bearer ${API_KEY}` },
      { from: `${NAME} <${FROM}>`, to: [to], subject, html, text, headers });
  if (PROVIDER === "brevo")
    return postJSON("https://api.brevo.com/v3/smtp/email", { "api-key": API_KEY },
      { sender: { name: NAME, email: FROM }, to: [{ email: to }], subject, htmlContent: html, textContent: text, headers });
  return sendGmail({ to, subject, html, text, headers });
}
