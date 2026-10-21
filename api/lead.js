// POST /api/lead : crée ou met à jour un lead (dédoublonné par e-mail) et calcule son scoring.
import { rpc, json, body, configured, UUID } from "../lib/supabase.js";
import { leadFields } from "../lib/scoring.js";
import { mailConfigured, sendMail } from "../lib/mailer.js";
import { buildResultEmail } from "../lib/email.js";
import { unsubscribeUrl } from "../lib/unsubscribe.js";
import { content } from "../lib/content.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const b = body(req);
  if (b.company) return json(res, 200, { ok: true }); // honeypot : bot, on ignore en silence
  const email = String(b.email || "").trim().toLowerCase();
  const first_name = String(b.first_name || "").replace(/[\u0000-\u001f\u007f<>"]/g, "").trim().slice(0, 60);
  if (!EMAIL.test(email) || email.length > 160) return json(res, 400, { error: "invalid_email" });
  const consent_marketing = b.consent_marketing === true;
  try {
    const result = b.result_id && UUID.test(b.result_id) ? await rpc("cc_get_result", { p_id: b.result_id }) : null;
    // moins de 15 ans : aucune collecte d'e-mail (art. 45 loi Informatique et Libertés)
    if (result && result.age === "<15") return json(res, 403, { error: "minor_no_collect" });
    const utm = b.utm && typeof b.utm === "object"
      ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [String(k).slice(0, 20), String(v).slice(0, 80)]))
      : null;
    const fields = {
      first_name: first_name || null,
      consent_marketing,
      utm: utm && Object.keys(utm).length ? utm : (result && result.utm) || null,
      ...(result ? { result_id: result.id, ...leadFields(result, { ...(result.lead || {}), consent_marketing }) } : {}),
    };
    await rpc("cc_upsert_lead", { p_email: email, p: fields });
    // registre des consentements : une ligne par case, textes issus de CONSENT_TEXTS côté serveur
    try {
      const { CONSENT_TEXTS } = content();
      const c = b.consents && typeof b.consents === "object" ? b.consents : {};
      const purposes = ["report", "newsletter"].concat(result && result.age !== "15-17" && "partners" in c ? ["partners"] : []);
      await rpc("cc_record_consents", { p_email: email, p: {
        source: String(b.source || "gate").slice(0, 20), age_band: result ? result.age : null, text_version: CONSENT_TEXTS.version,
        items: purposes.map(k => ({ purpose: k, granted: k === "report" ? true : c[k] === true, text: CONSENT_TEXTS[k] })),
      } });
    } catch (e) { console.error("consents", e.message); }
    // e-mail de résultats : attendu avant de répondre (Vercel gèle la fonction après la réponse).
    // Le navigateur n'attend pas cette réponse : le rapport s'affiche tout de suite.
    // cc_claim_email applique les plafonds (3 min et 5/jour par adresse, 450/jour au total).
    if (result && mailConfigured()) {
      try {
        const leadId = await rpc("cc_claim_email", { p_email: email });
        if (leadId) {
          const unsub = consent_marketing ? unsubscribeUrl(leadId) : null;
          const site = (process.env.SITE_URL || "").replace(/\/$/, "");
          const reportUrl = site && result.report_token ? `${site}/r/${result.report_token}` : null;
          const mail = buildResultEmail({ firstName: first_name, result, consentMarketing: consent_marketing, unsubscribeUrl: unsub, reportUrl });
          await sendMail({ to: email, ...mail, unsubscribeUrl: unsub });
        }
      } catch (e) { console.error("mail", e.message); }
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("lead", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
