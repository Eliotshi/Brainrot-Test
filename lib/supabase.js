// Mini client REST Supabase (aucune dépendance npm).
// Clé secrète uniquement côté serveur : SUPABASE_SECRET_KEY (sb_secret_…) ou
// l'ancienne SUPABASE_SERVICE_ROLE_KEY (JWT eyJ…).

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function configured() { return Boolean(URL_ && KEY); }

export async function sb(path, { method = "GET", body, prefer } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json" };
  if (KEY && KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${KEY}`;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) { const e = new Error((data && data.message) || r.statusText); e.status = r.status; throw e; }
  return data;
}
export const rpc = (fn, args = {}) => sb(`rpc/${fn}`, { method: "POST", body: args });

export function json(res, status, obj, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.end(JSON.stringify(obj));
}

export function body(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  try { return JSON.parse(b || "{}"); } catch { return {}; }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
