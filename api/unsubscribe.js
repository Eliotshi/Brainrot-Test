// /api/unsubscribe?id=…&t=… : désinscription des e-mails de conseils et d'offres.
//   GET  → page de confirmation (les antivirus de messagerie ouvrent les liens : on ne désinscrit pas sur un GET)
//   POST → désinscrit (bouton de la page, ou « un clic » RFC 8058 depuis Gmail / Apple Mail)
import { rpc, configured, UUID } from "../lib/supabase.js";
import { verifyUnsubscribe } from "../lib/unsubscribe.js";

const page = (title, msg, form = "") => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · Cerveau Cramé</title></head>
<body style="margin:0;background:#080A16;color:#F2F0FF;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<main style="max-width:480px;margin:12vh auto 0;padding:0 20px">
<p style="color:#A2A7CF;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0">Cerveau Cramé</p>
<h1 style="font-size:26px;margin:10px 0 12px">${title}</h1>
<p style="color:#A2A7CF;line-height:1.6;margin:0">${msg}</p>${form}
</main></body></html>`;

function send(res, status, html) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(html);
}

export default async function handler(req, res) {
  const id = String(req.query?.id || ""), t = String(req.query?.t || "");
  if (!UUID.test(id) || !verifyUnsubscribe(id, t))
    return send(res, 400, page("Lien invalide", "Ce lien de désinscription est incomplet ou a expiré. Réponds simplement STOP au dernier e-mail reçu et on s'en occupe."));

  if (req.method === "GET") {
    const form = `<form method="post" style="margin-top:24px"><button type="submit" style="background:#FF7A1A;color:#14081A;border:0;border-radius:999px;padding:14px 24px;font-size:16px;font-weight:700;cursor:pointer">Me désinscrire</button></form>`;
    return send(res, 200, page("Te désinscrire ?", "Tu ne recevras plus nos conseils ni nos offres. Ton rapport reste le tien.", form));
  }
  if (req.method !== "POST") return send(res, 405, page("Méthode non autorisée", ""));
  if (!configured()) return send(res, 503, page("Service indisponible", "Réessaie dans quelques minutes."));
  try {
    await rpc("cc_unsubscribe", { p_id: id });
    return send(res, 200, page("C'est fait", "Tu es désinscrit·e : plus aucun conseil ni offre de notre part. Si tu refais le test un jour, tu pourras te réinscrire en cochant la case."));
  } catch (e) {
    console.error("unsubscribe", e.status, e.message);
    return send(res, 500, page("Oups", "La désinscription n'a pas pu être enregistrée. Réponds STOP au dernier e-mail reçu et on s'en occupe."));
  }
}
