# Plan 21 jours · brouillons

Séquence de 21 e-mails, un par jour, **réservée aux leads `consent_marketing = true`**. Rien n'est automatisé : ces fichiers sont des brouillons à relire, puis à charger dans un outil d'envoi en masse (Brevo ou Resend, voir `EMAIL_PROVIDER` dans `lib/mailer.js`). Gmail ne convient pas à ce volume.

**Variables** (remplies à partir du lead et de son résultat) :

| Variable | Contenu |
|---|---|
| `{{prenom}}` | prénom, ou rien |
| `{{niveau}}`, `{{temp}}` | niveau et température du test |
| `{{axe1}}`, `{{axe2}}` | les deux axes les plus chauds (nom affiché) |
| `{{axe1_defi_1..3}}` | les 3 défis de `AXES[axe1].defis` dans `public/assets/content.js` |
| `{{axe1_semaine}}`, `{{axe2_semaine}}` | `AXES[k].week` |
| `{{lien_rapport}}` | `SITE_URL/r/{report_token}` |
| `{{lien_offre}}` | `CHECKOUT_URL?client_reference_id={result_id}` |
| `{{lien_desinscription}}` | lien signé de `lib/unsubscribe.js`, obligatoire dans chaque e-mail |

**Règles :**
- Chaque e-mail fait moins de 150 mots, propose une seule action et contient le lien de désinscription.
- Aucun faux compte à rebours, aucune fausse rareté.
- L'offre payante n'apparaît qu'aux jours 7, 14 et 21.
- Si la personne achète, on arrête les e-mails de vente et on garde seulement les exercices.

| Fichier | Jours | Thème |
|---|---|---|
| `semaine-1.md` | J1–J7 | Sevrage : repérer ce qu'on délègue |
| `semaine-2.md` | J8–J14 | `{{axe1}}` : reprendre son axe le plus chaud |
| `semaine-3.md` | J15–J21 | `{{axe2}}` et coopérer avec l'IA |
