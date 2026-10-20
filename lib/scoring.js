// ============================================================
// Scoring CRM : pouvoir d'achat, motivation, segment, incentive.
// Ajuste les poids ici : ils sont appliqués à chaque nouveau lead
// et à chaque événement (clic sur l'offre, partage, mode complet).
// ============================================================

const SITUATION = {
  etudiant: 10, alternance: 25, jeune_actif: 45, freelance_recherche: 30,
  salarie: 55, manager: 75, independant: 60, dirigeant: 90,
};
const SPEND = { "0": 0, lt50: 30, "50_300": 65, gt300: 100 };
const PAYER = { free: 0, self: 60, employer: 85, either: 100 };
const AGE = { "18-24": 20, "25-34": 50, "35-44": 70, "45+": 75 };

export const SEGMENTS = {
  pret: "Prêt·e à acheter",
  a_convaincre: "À convaincre",
  motive_sans_budget: "Motivé·e sans budget",
  froid: "Froid",
};

const pick = (map, k, dflt) => (k != null && k in map ? map[k] : dflt);
const round = x => Math.round(Math.max(0, Math.min(100, x)));

/** Pouvoir d'achat 0-100 : situation 35 %, dépenses passées 30 %, financeur 25 %, âge 10 %. */
export function buyingPower({ situation, spend, payer, age }) {
  return round(
    0.35 * pick(SITUATION, situation, 35) +
    0.30 * pick(SPEND, spend, 20) +
    0.25 * pick(PAYER, payer, 40) +
    0.10 * pick(AGE, age, 40)
  );
}

/** Motivation 0-100 : envie déclarée 35 %, gravité du résultat 25 %, engagement 15 %, clic offre 15 %, opt-in 5 %, partage 5 %. */
export function motivation({ wish, overall, mode, extended, offer_clicked, consent_marketing, shared }) {
  const wishS = Number.isFinite(wish) ? wish * 10 : 50;
  const engagement = extended || String(mode || "").startsWith("complet") ? 100 : 50;
  return round(
    0.35 * wishS +
    0.25 * (Number(overall) || 0) +
    0.15 * engagement +
    0.15 * (offer_clicked ? 100 : 0) +
    0.05 * (consent_marketing ? 100 : 0) +
    0.05 * (shared ? 100 : 0)
  );
}

export function segmentOf(bp, mot) {
  if (bp >= 50 && mot >= 55) return "pret";
  if (bp >= 50) return "a_convaincre";
  if (mot >= 55) return "motive_sans_budget";
  return "froid";
}

/** Incentive suggéré pour la relance. */
export function incentiveOf({ segment, payer, situation, profile }) {
  if (payer === "employer")
    return { incentive: "facture_employeur", incentive_label: "Devis / facture employeur",
      incentive_reason: "Le programme serait financé par l'employeur ou un budget formation : envoyer un devis prêt à transmettre." };
  switch (segment) {
    case "pret":
      return { incentive: "prix_plein", incentive_label: "Prix plein, accès immédiat",
        incentive_reason: "Budget et motivation au rendez-vous : pas besoin de remise, mettre en avant le démarrage immédiat." };
    case "a_convaincre":
      return { incentive: "bonus_valeur", incentive_label: "Bonus : live offert + garantie 14 jours",
        incentive_reason: "A les moyens mais peu d'envie : ajouter de la valeur et lever le risque plutôt que baisser le prix." };
    case "motive_sans_budget":
      return situation === "etudiant" || situation === "alternance" || profile === "etu"
        ? { incentive: "remise_etudiant", incentive_label: "-20 % étudiant",
            incentive_reason: "Très motivé·e mais budget serré, profil étudiant : remise ciblée." }
        : { incentive: "paiement_3x", incentive_label: "Paiement en 3 fois",
            incentive_reason: "Très motivé·e mais budget serré : étaler le paiement sans baisser le prix." };
    default:
      return { incentive: "nurturing", incentive_label: "Séquence e-mails gratuite",
        incentive_reason: "Ni budget ni urgence : éduquer avec du contenu gratuit avant toute offre." };
  }
}

const AXES = ["plume", "pensee", "memoire", "boussole", "attention", "idees", "coeur", "perroquet"];

/** Construit tous les champs calculés d'un lead à partir d'une ligne `results` et des drapeaux comportementaux. */
export function leadFields(result, flags = {}) {
  const q = (result && result.qual) || {};
  const events = new Set((result && result.events) || []);
  const f = {
    offer_clicked: Boolean(flags.offer_clicked || events.has("offer_click")),
    shared: Boolean(flags.shared || events.has("share")),
    extended: Boolean(flags.extended || events.has("extended") || (result && result.mode === "complet+")),
  };
  const base = {
    profile: result?.profile ?? null, age: result?.age ?? null, mode: result?.mode ?? null,
    situation: q.situation ?? null, spend: q.spend ?? null, payer: q.payer ?? null,
    wish: Number.isInteger(q.wish) ? q.wish : null,
    overall: result?.overall ?? null, temp: result?.temp ?? null,
    level: result?.level ?? null, archetype: result?.archetype ?? null,
    top_axes: result?.scores ? AXES.slice().sort((a, b) => result.scores[b] - result.scores[a]).slice(0, 3) : null,
    ...f,
  };
  const buying_power = buyingPower(base);
  const mot = motivation({ ...base, consent_marketing: flags.consent_marketing });
  const segment = segmentOf(buying_power, mot);
  return { ...base, buying_power, motivation: mot, segment, ...incentiveOf({ ...base, segment }) };
}
