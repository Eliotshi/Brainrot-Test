// Charge public/assets/content.js (script navigateur) côté serveur, pour que les
// e-mails reprennent exactement les mêmes textes que le rapport.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

let cache = null;

export function content() {
  if (cache) return cache;
  const src = readFileSync(join(process.cwd(), "public/assets/content.js"), "utf8");
  const ctx = vm.createContext({ location: { origin: process.env.SITE_URL || "" } });
  cache = vm.runInContext(src + "\n;({ AXES, AX, LEVELS, ARCHETYPES, CHECKOUT_URL, CONSENT_TEXTS, AGE_LABELS, levelOf, tempOf });", ctx);
  return cache;
}
