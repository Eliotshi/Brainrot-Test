// GET /api/report?token=… : données nécessaires pour ré-afficher un rapport (page /r/{token}).
import { rpc, json, configured } from "../lib/supabase.js";

const TOKEN = /^[A-Za-z0-9_-]{22,40}$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const token = String(req.query?.token || "");
  if (!TOKEN.test(token)) return json(res, 400, { error: "invalid_token" });
  try {
    const report = await rpc("cc_get_report", { p_token: token });
    if (!report) return json(res, 404, { error: "not_found" });
    res.setHeader("X-Robots-Tag", "noindex");
    return json(res, 200, report, "private, max-age=60");
  } catch (e) {
    console.error("report", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
