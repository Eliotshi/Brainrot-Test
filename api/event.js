// POST /api/event : clic sur l'offre, partage, passage en mode complet. Met à jour le scoring du lead lié.
import { rpc, json, body, configured, UUID } from "../lib/supabase.js";
import { leadFields } from "../lib/scoring.js";

const TYPES = ["offer_click", "share", "extended"];

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const b = body(req);
  if (!UUID.test(b.result_id || "") || !TYPES.includes(b.type)) return json(res, 400, { error: "invalid_event" });
  try {
    await rpc("cc_add_event", { rid: b.result_id, ev: b.type });
    const result = await rpc("cc_get_result", { p_id: b.result_id });
    if (result && result.lead) await rpc("cc_update_lead_by_result", { p_result_id: b.result_id, p: leadFields(result, result.lead) });
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("event", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
