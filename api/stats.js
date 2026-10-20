// GET /api/stats : moyennes agrégées par profil × âge (aucune donnée individuelle), en cache CDN 10 min.
import { rpc, json, configured } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  try {
    const data = await rpc("panel_stats");
    return json(res, 200, data, "public, s-maxage=600, stale-while-revalidate=3600");
  } catch (e) {
    console.error("stats", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
