# Cerveau Cramé

A gamified lead magnet: the adaptive quiz « Ton cerveau est-il cramé par l'IA ? ». It comes with a results report, lead capture, and a small CRM that scores each lead's buying power and motivation.

- **Front end:** static HTML, CSS and JS in `public/`, with no build step.
- **API:** Vercel serverless functions in `api/`. The only npm dependency is `nodemailer`, for the results email.
- **Database:** Supabase Postgres. Tables are locked down with RLS. The server uses the publishable key and goes through `public.cc_*` functions; the CRM functions also require a server token.

## How it works

| Piece | Where |
|---|---|
| Question bank: 128 questions, 8 axes, student and pro scenarios, follow-ups | `public/assets/questions.js` |
| Axes, levels, 12 archetypes, badges, bonus "plan de sauvetage" chapter | `public/assets/content.js` |
| Adaptive engine, gamification, gate | `public/assets/app.js` |
| Results report, radar, comparisons, share card | `public/assets/report.js` |
| Lead scoring: buying power, motivation, segment, incentive | `lib/scoring.js` |
| CRM | `public/admin/` (served at `/admin`) |

**Adaptive logic.** The first 8 questions screen each axis once. After that:
- A hot answer (score of 2 or more out of 3) unlocks that question's bonus follow-up.
- The next axis is picked by coverage, by how hot it is, and with a little randomness.
- Hot axes get harder questions, which separates "bien cuit" from "carbonisé".
- Every axis is guaranteed at least 2 questions in Express (20) and 5 in Complet (50).

**Comparisons.** `/api/stats` returns aggregated means per profile × age group, cached for 10 minutes. Percentiles, group averages and the group overlay on the radar are shown only once a group has at least 50 real players; before that, the report shows the progress (n/50) and an invite button. Archetype rarity appears from 200 real results. Nothing is simulated.

**CRM scoring** (`lib/scoring.js`):
- **Buying power:** work situation 35 %, past spending on training 30 %, who pays 25 %, age 10 %.
- **Motivation:** stated wish to change 35 %, how cooked the result is 25 %, engagement 15 %, offer click 15 %, marketing opt-in 5 %, share 5 %.
- **Segments:** buying power ≥ 50 and motivation ≥ 55 gives *Prêt·e à acheter*. Each segment maps to a suggested incentive: full price, value bonus, payment in 3 instalments, student discount, employer invoice, or nurturing only.

## Setup

1. **Supabase:** run the files in `supabase/migrations/` in order, then store the hash of your server token:
   `insert into private.app_config values ('admin_token_sha256', encode(extensions.digest('<ADMIN_RPC_TOKEN>', 'sha256'), 'hex'));`
2. **Vercel:** import this GitHub repo. The framework preset is "Other", with no build command. `vercel.json` sets the output directory to `public`.
3. **Vercel environment variables** (see `.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_RPC_TOKEN`: a long random string. Its SHA-256 hash must match the one stored in step 1.
   - `ADMIN_PASSWORD`: at least 12 characters. It protects `/admin`.
4. **Payment link:** paste your Stripe Payment Link (or other checkout URL) into `CHECKOUT_URL` in `public/assets/content.js`. The result id is passed along as `client_reference_id`.

## Local preview

```bash
python3 -m http.server 8080 --directory public
```

The quiz works fully offline. API calls fail silently, and no comparison is shown. To run the API locally, use `vercel dev`.

## Emails

Leads are stored in Supabase with a separate marketing-consent flag.

As soon as the form is submitted, `api/lead.js` sends the results report by email through Gmail (`lib/mailer.js`, template in `lib/email.js`, texts taken from `public/assets/content.js`):
- **Everyone** gets their report: score, level, archetype, the 8 axes, their two hottest axes and 3 free challenges.
- **Only leads with `consent_marketing = true`** also get the sales section for the Désintox programme (21-day plan built on their two hottest axes, price, checkout button using `CHECKOUT_URL`).

Safeguards:
- **Send caps** (`cc_claim_email`, migration `20261020020000_email.sql`): 1 email every 3 minutes and 5 per 24 h per address, and 450 per 24 h in total, to stay under Gmail's limit and stop the form being used to spam strangers.
- **One-click unsubscribe** for the marketing version: a signed link (`lib/unsubscribe.js`, `api/unsubscribe.js`) plus `List-Unsubscribe` / `List-Unsubscribe-Post` headers. It turns `consent_marketing` off. "STOP" replies can be handled from the lead drawer in `/admin` ("Retirer").

Permanent link: every result gets a random `report_token` (24 characters). `/r/{token}` re-opens the report from the database (`api/report.js`, function `cc_get_report`, which never returns the email or the qualification answers). The email's "Revoir mon rapport" button and the "Ton rapport est sauvegardé" block in the report both use it.

Provider: `EMAIL_PROVIDER=gmail` (default) for the transactional report email; `resend` or `brevo` (with `EMAIL_API_KEY` and `EMAIL_FROM`) for bulk sending such as the 21-day plan, whose drafts are in `emails/plan21/` (not automated).

Setup: turn on 2-step verification on the Gmail account, create an app password at myaccount.google.com/apppasswords, then add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM_NAME` and `SITE_URL` to the Vercel environment variables. Without `GMAIL_USER` and `GMAIL_APP_PASSWORD`, no email is sent. Gmail caps sending at about 500 emails a day; switch to a dedicated provider (Brevo, Resend) beyond that.
