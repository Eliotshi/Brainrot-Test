// /api/admin/leads : CRM. Protégé par l'en-tête x-admin-key = ADMIN_PASSWORD.
//   GET   → leads + entonnoir
//   PATCH → { id, status?, notes? }
import { timingSafeEqual, createHash } from "node:crypto";
import { sb, json, body, configured, UUID } from "../../lib/supabase.js";

const STATUSES = ["nouveau", "contacte", "en_discussion", "converti", "perdu"];

function authorized(req) {
  const pw = process.env.ADMIN_PASSWORD;
  const got = req.headers["x-admin-key"];
  if (!pw || pw.length < 12 || typeof got !== "string") return false;
  const h = s => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(pw), h(got));
}

export default async function handler(req, res) {
  if (!configured()) return json(res, 503, { error: "not_configured" });
  if (!authorized(req)) { await new Promise(r => setTimeout(r, 400)); return json(res, 401, { error: "unauthorized" }); }
  try {
    if (req.method === "GET") {
      const leads = await sb("leads?select=*&order=created_at.desc&limit=5000");
      const countOf = async path => {
        const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { method: "HEAD", headers: authHeaders("count=exact") });
        const range = r.headers.get("content-range") || "*/0"; return Number(range.split("/")[1]) || 0;
      };
      const [results, offerClicks, shares] = await Promise.all([
        countOf("results?select=id"),
        countOf("results?select=id&events=cs.%7Boffer_click%7D"),
        countOf("results?select=id&events=cs.%7Bshare%7D"),
      ]);
      return json(res, 200, { leads, funnel: { results, leads: leads.length, offerClicks, shares } });
    }
    if (req.method === "PATCH") {
      const b = body(req);
      if (!UUID.test(b.id || "")) return json(res, 400, { error: "invalid_id" });
      const patch = {};
      if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return json(res, 400, { error: "invalid_status" }); patch.status = b.status; }
      if (b.notes !== undefined) patch.notes = String(b.notes).slice(0, 4000);
      if (!Object.keys(patch).length) return json(res, 400, { error: "empty_patch" });
      const r = await sb(`leads?id=eq.${b.id}`, { method: "PATCH", body: patch, prefer: "return=representation" });
      return json(res, 200, { lead: r[0] || null });
    }
    return json(res, 405, { error: "method_not_allowed" });
  } catch (e) {
    console.error("admin", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}

function authHeaders(prefer) {
  const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: KEY, Prefer: prefer };
  if (KEY.startsWith("eyJ")) h.Authorization = `Bearer ${KEY}`;
  return h;
}
