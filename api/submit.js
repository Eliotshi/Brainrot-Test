// POST /api/submit : enregistre (ou met à jour) un résultat anonyme.
import { rpc, json, body, configured, UUID } from "../lib/supabase.js";
import { leadFields } from "../lib/scoring.js";

const AXES = ["plume", "pensee", "memoire", "boussole", "attention", "idees", "coeur", "perroquet"];
const QUAL_OK = {
  situation: ["etudiant", "alternance", "jeune_actif", "freelance_recherche", "salarie", "manager", "independant", "dirigeant"],
  spend: ["0", "lt50", "50_300", "gt300"],
  payer: ["free", "self", "employer", "either"],
};
const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const str = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;

export function cleanResult(b) {
  if (!["etu", "pro"].includes(b.profile)) return null;
  if (!["<15", "15-17", "18-24", "25-34", "35-44", "45+"].includes(b.age)) return null;
  if (!["express", "complet", "complet+"].includes(b.mode)) return null;
  if (!Number.isInteger(b.n_questions) || b.n_questions < 1 || b.n_questions > 60) return null;
  if (!num(b.overall, 0, 100) || !b.scores || typeof b.scores !== "object") return null;
  const scores = {};
  for (const k of AXES) { if (!num(b.scores[k], 0, 100)) return null; scores[k] = Math.round(b.scores[k]); }
  const answers = Array.isArray(b.answers) ? b.answers.slice(0, 60)
    .filter(a => a && str(a.id, 8) && num(a.s, 0, 3))
    .map(a => ({ id: a.id, s: a.s, dt: Number.isInteger(a.dt) ? Math.min(a.dt, 600000) : null, b: a.b ? 1 : 0,
      // raw + label : de quoi ré-afficher les réponses signature sur /r/{token}
      raw: Number.isInteger(a.raw) && a.raw >= 0 && a.raw <= 100 ? a.raw : null,
      label: typeof a.label === "string" ? a.label.slice(0, 160) : null })) : [];
  const q = b.qual && typeof b.qual === "object" ? b.qual : {};
  const qual = {};
  for (const k in QUAL_OK) if (QUAL_OK[k].includes(q[k])) qual[k] = q[k];
  if (Number.isInteger(q.wish) && q.wish >= 0 && q.wish <= 10) qual.wish = q.wish;
  const utm = {};
  if (b.utm && typeof b.utm === "object") for (const [k, v] of Object.entries(b.utm).slice(0, 6)) if (str(k, 20) && str(v, 80)) utm[k] = v;
  return {
    profile: b.profile, age: b.age, mode: b.mode, n_questions: b.n_questions,
    overall: Math.round(b.overall * 10) / 10,
    temp: num(b.temp, 30, 100) ? Math.round(b.temp * 10) / 10 : null,
    level: str(b.level, 20) ? b.level : null,
    archetype: str(b.archetype, 20) ? b.archetype : null,
    scores, answers, qual,
    badges: Array.isArray(b.badges) ? b.badges.filter(x => str(x, 12)).slice(0, 20) : [],
    xp: Number.isInteger(b.xp) ? Math.min(b.xp, 100000) : null,
    duration_s: Number.isInteger(b.duration_s) ? Math.min(b.duration_s, 86400) : null,
    utm,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
  if (!configured()) return json(res, 503, { error: "not_configured" });
  const b = body(req);
  const row = cleanResult(b);
  if (!row) return json(res, 400, { error: "invalid_result" });
  try {
    const pid = b.result_id && UUID.test(b.result_id) ? b.result_id : null;
    const id = await rpc("cc_save_result", { p: row, p_id: pid });
    const result = await rpc("cc_get_result", { p_id: id });
    // mise à jour (passage Express → Complet) : on recalcule le scoring du lead lié
    if (pid && id === pid && result && result.lead) await rpc("cc_update_lead_by_result", { p_result_id: id, p: leadFields(result, result.lead) });
    return json(res, 200, { result_id: id, report_token: result ? result.report_token || null : null });
  } catch (e) {
    console.error("submit", e.status, e.message);
    return json(res, 500, { error: "db_error" });
  }
}
