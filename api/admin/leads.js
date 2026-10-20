// /api/admin/leads : CRM.
// Le navigateur envoie x-admin-key = ADMIN_PASSWORD ; le serveur appelle ensuite
// les fonctions cc_admin_* avec le jeton ADMIN_RPC_TOKEN (jamais exposé au navigateur).
//   GET   → leads + entonnoir
//   PATCH → { id, status?, notes? }
import { timingSafeEqual, createHash } from "node:crypto";
import { rpc, json, body, configured, UUID } from "../../lib/supabase.js";

const STATUSES = ["nouveau", "contacte", "en_discussion", "converti", "perdu"];

function authorized(req) {
  const pw = process.env.ADMIN_PASSWORD;
  const got = req.headers["x-admin-key"];
  if (!pw || pw.length < 12 || typeof got !== "string") return false;
  const h = s => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(pw), h(got));
}

export default async function handler(req, res) {
  const token = process.env.ADMIN_RPC_TOKEN;
  if (!configured() || !token) return json(res, 503, { error: "not_configured" });
  if (!process.env.ADMIN_PASSWORD) return json(res, 503, { error: "admin_password_missing" });
  if (!authorized(req)) { await new Promise(r => setTimeout(r, 400)); return json(res, 401, { error: "unauthorized" }); }
  try {
    if (req.method === "GET") {
      const data = await rpc("cc_admin_list", { p_token: token });
      return json(res, 200, { leads: data.leads, funnel: { ...data.funnel, leads: data.leads.length } });
    }
    if (req.method === "PATCH") {
      const b = body(req);
      if (!UUID.test(b.id || "")) return json(res, 400, { error: "invalid_id" });
      if (b.status !== undefined && !STATUSES.includes(b.status)) return json(res, 400, { error: "invalid_status" });
      if (b.status === undefined && b.notes === undefined) return json(res, 400, { error: "empty_patch" });
      const lead = await rpc("cc_admin_update", {
        p_token: token, p_id: b.id,
        p_status: b.status ?? null,
        p_notes: b.notes === undefined ? null : String(b.notes).slice(0, 4000),
      });
      return json(res, 200, { lead });
    }
    return json(res, 405, { error: "method_not_allowed" });
  } catch (e) {
    console.error("admin", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
