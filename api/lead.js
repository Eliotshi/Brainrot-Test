// POST /api/lead : crée ou met à jour un lead (dédoublonné par e-mail) et calcule son scoring.
import { sb, json, body, configured, UUID } from "../lib/supabase.js";
import { leadFields } from "../lib/scoring.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const b = body(req);
  if (b.company) return json(res, 200, { ok: true }); // honeypot : bot, on ignore en silence
  const email = String(b.email || "").trim().toLowerCase();
  const first_name = String(b.first_name || "").trim().slice(0, 60);
  if (!EMAIL.test(email) || email.length > 160) return json(res, 400, { error: "invalid_email" });
  const consent_marketing = b.consent_marketing === true;
  try {
    let result = null;
    if (b.result_id && UUID.test(b.result_id)) {
      const r = await sb(`results?id=eq.${b.result_id}&select=*`);
      result = r && r[0] ? r[0] : null;
    }
    const utm = b.utm && typeof b.utm === "object" ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [String(k).slice(0, 20), String(v).slice(0, 80)])) : null;
    const existing = await sb(`leads?email=eq.${encodeURIComponent(email)}&select=id,attempts,consent_marketing,offer_clicked,shared`);
    const prev = existing && existing[0];
    const fields = {
      first_name: first_name || null,
      ...(result ? { result_id: result.id } : {}),
      // un opt-in déjà donné n'est jamais retiré par un nouveau passage
      consent_marketing: consent_marketing || Boolean(prev && prev.consent_marketing),
      ...(result ? leadFields(result, { consent_marketing: consent_marketing || (prev && prev.consent_marketing), offer_clicked: prev?.offer_clicked, shared: prev?.shared }) : {}),
    };
    if (prev) {
      await sb(`leads?id=eq.${prev.id}`, { method: "PATCH", body: { ...fields, attempts: (prev.attempts || 1) + 1 } });
    } else {
      await sb("leads", { method: "POST", body: { email, ...fields, utm: utm || (result && result.utm) || null } });
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("lead", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
