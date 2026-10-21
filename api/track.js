// POST /api/track : événements d'entonnoir first-party (sendBeacon). Sans cookie, sans service tiers.
import { rpc, json, body, configured } from "../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const b = body(req);
  const events = Array.isArray(b) ? b : [b];
  if (!events.length || events.length > 30 || JSON.stringify(events).length > 20000) return json(res, 400, { error: "invalid_batch" });
  try {
    await rpc("cc_log_event", { p: events });
    res.statusCode = 204; res.end();
  } catch (e) {
    console.error("track", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
