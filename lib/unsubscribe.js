// Liens de désinscription en un clic, signés HMAC (aucune donnée personnelle dans l'URL :
// seulement l'id du lead et sa signature). Clé : UNSUBSCRIBE_SECRET, à défaut ADMIN_RPC_TOKEN.
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_RPC_TOKEN || "";
const sign = id => createHmac("sha256", SECRET).update("unsub:" + id).digest("base64url").slice(0, 32);

export function unsubscribeUrl(leadId) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  if (!site || !SECRET || !leadId) return null;
  return `${site}/api/unsubscribe?id=${encodeURIComponent(leadId)}&t=${sign(leadId)}`;
}

export function verifyUnsubscribe(id, t) {
  if (!SECRET || typeof id !== "string" || typeof t !== "string") return false;
  const a = Buffer.from(sign(id)), b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}
