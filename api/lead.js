// POST /api/lead : crée ou met à jour un lead (dédoublonné par e-mail) et calcule son scoring.
import { rpc, json, body, configured, UUID } from "../lib/supabase.js";
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
    const result = b.result_id && UUID.test(b.result_id) ? await rpc("cc_get_result", { p_id: b.result_id }) : null;
    const utm = b.utm && typeof b.utm === "object"
      ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [String(k).slice(0, 20), String(v).slice(0, 80)]))
      : null;
    const fields = {
      first_name: first_name || null,
      consent_marketing,
      utm: utm && Object.keys(utm).length ? utm : (result && result.utm) || null,
      ...(result ? { result_id: result.id, ...leadFields(result, { consent_marketing, ...(result.lead || {}) }) } : {}),
    };
    await rpc("cc_upsert_lead", { p_email: email, p: fields });
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("lead", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
