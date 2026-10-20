// E-mail de résultats envoyé après le formulaire.
// Tout le monde reçoit son rapport (promis sur le formulaire). L'argumentaire de
// vente Désintox n'est ajouté que si la personne a coché l'opt-in marketing.
import { content } from "./content.js";

const PRICE = "49 €";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bandOf = v => (v < 34 ? 0 : v < 67 ? 1 : 2);
const fr1 = x => Number(x).toFixed(1).replace(".", ",");
const heat = v => (v < 20 ? "#4F7BFF" : v < 40 ? "#A04DFF" : v < 60 ? "#F0408A" : v < 80 ? "#FF7A1A" : "#FFD23F");

export function buildResultEmail({ firstName, result, consentMarketing }) {
  const { AX, AXES, ARCHETYPES, CHECKOUT_URL, levelOf, tempOf } = content();
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const name = firstName || "toi";
  const pct = Math.round(result.overall);
  const L = levelOf(result.overall);
  const temp = result.temp ?? tempOf(result.overall);
  const A = ARCHETYPES[result.archetype] || null;
  const ranked = AXES.map(a => a.k).sort((a, b) => result.scores[b] - result.scores[a]);
  const [k1, k2] = ranked;
  const X1 = AX[k1], X2 = AX[k2];
  const cta = CHECKOUT_URL
    ? CHECKOUT_URL + (CHECKOUT_URL.includes("?") ? "&" : "?") + "client_reference_id=" + encodeURIComponent(result.id)
    : site;

  const subject = consentMarketing
    ? `${firstName ? firstName + ", ton" : "Ton"} cerveau est cramé à ${pct} % 🔥 (et voici comment le refroidir)`
    : `${firstName ? firstName + ", ton" : "Ton"} rapport Cerveau Cramé : ${pct} %`;

  /* ---------- HTML ---------- */
  const axisRows = ranked.map(k => {
    const v = result.scores[k];
    return `<tr><td style="padding:6px 0;font-size:14px;color:#ddd;width:110px">${esc(AX[k].name)}</td>
      <td style="padding:6px 8px"><div style="background:#2a2a35;border-radius:6px;height:10px;width:100%"><div style="background:${heat(v)};border-radius:6px;height:10px;width:${v}%"></div></div></td>
      <td style="padding:6px 0;font-size:14px;color:#fff;text-align:right;width:44px;font-family:monospace">${v}</td></tr>`;
  }).join("");

  const pitch = consentMarketing ? `
    <tr><td style="padding:28px 28px 8px">
      <h2 style="margin:0 0 12px;font-size:22px;color:#fff">Bon. Parlons franchement, ${esc(name)}.</h2>
      <p style="margin:0 0 12px;color:#ccc;line-height:1.6">À <b style="color:#fff">${pct} %</b>, ton cerveau n'est pas juste « un peu tiède ». Chaque jour où l'IA écrit, résume et décide à ta place, ${esc(X1.full.toLowerCase())} et ${esc(X2.full.toLowerCase())} s'affaiblissent encore un peu. Ce n'est pas une fatalité, mais ça ne se répare pas tout seul non plus.</p>
      <p style="margin:0 0 12px;color:#ccc;line-height:1.6">Les 3 défis ci-dessus, c'est le premier pas. Pour aller au bout, on a construit le <b style="color:#fff">Programme Désintox Cérébrale</b> : 21 jours, 15 minutes par jour, pour reprendre le volant sans renoncer à l'IA.</p>
    </td></tr>
    <tr><td style="padding:8px 28px">
      <table role="presentation" width="100%" style="background:#1d1d27;border:1px solid #FF7A1A;border-radius:14px">
        <tr><td style="padding:20px">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#FF7A1A">Ton programme, calé sur tes résultats</p>
          <p style="margin:0 0 14px;font-size:18px;color:#fff;font-weight:bold">21 jours pour reprendre le volant</p>
          <p style="margin:0 0 8px;color:#ddd;line-height:1.5"><b style="color:#fff">Semaine 1 · Sevrage.</b> Repérer tout ce que tu délègues sans t'en rendre compte, en commençant par ${esc(X1.full.toLowerCase())}.</p>
          <p style="margin:0 0 8px;color:#ddd;line-height:1.5"><b style="color:#fff">Semaine 2 · ${esc(X1.name)}.</b> ${esc(X1.week)}</p>
          <p style="margin:0 0 16px;color:#ddd;line-height:1.5"><b style="color:#fff">Semaine 3 · ${esc(X2.name)} · Coopérer.</b> ${esc(X2.week)} Puis l'IA comme sparring-partner, pas comme pilote.</p>
          <p style="margin:0 0 16px;color:#ccc">Vidéos, exercices quotidiens et groupe privé. <b style="color:#fff;font-size:20px">${PRICE}</b> <span style="color:#999">prix de lancement</span></p>
          <a href="${esc(cta)}" style="display:inline-block;background:#FF7A1A;color:#111;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:10px">Je commence ma désintox →</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 0">
      <p style="margin:0;color:#ccc;line-height:1.6">Dans 21 jours, tu peux continuer comme maintenant, ou écrire tes propres messages, retenir ce que tu lis et décider sans demander la permission à un onglet. ${PRICE}, c'est moins qu'un mois de certains abonnements IA.</p>
      <p style="margin:12px 0 0;color:#ccc">On se retrouve de l'autre côté ?<br>L'équipe Cerveau Cramé</p>
      <p style="margin:12px 0 0;color:#999;font-size:13px">P.S. Ton plan est construit sur tes deux axes les plus chauds (${esc(X1.name)} ${result.scores[k1]}/100, ${esc(X2.name)} ${result.scores[k2]}/100). Ce n'est pas un programme générique.</p>
    </td></tr>` : `
    <tr><td style="padding:24px 28px 0"><p style="margin:0;color:#ccc">À bientôt,<br>L'équipe Cerveau Cramé</p></td></tr>`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0e0e14;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" style="background:#0e0e14"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:600px;background:#15151d;border-radius:18px">
  <tr><td style="padding:28px 28px 0">
    <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999">Ton rapport Cerveau Cramé</p>
    <h1 style="margin:10px 0 0;font-size:26px;color:#fff">${esc(name === "toi" ? "Verdict" : name + ", verdict")} : ${esc(L.name)}</h1>
  </td></tr>
  <tr><td style="padding:20px 28px">
    <table role="presentation" width="100%" style="background:#1d1d27;border-radius:14px"><tr>
      <td style="padding:20px;text-align:center">
        <div style="font-size:48px;font-weight:bold;color:${heat(result.overall)};font-family:monospace">${pct} %</div>
        <div style="color:#ccc;margin-top:4px">cramé · ${fr1(temp)} °C</div>
        <div style="color:#999;margin-top:8px;font-style:italic">${esc(L.tag)}</div>
      </td></tr></table>
    <p style="margin:16px 0 0;color:#ccc;line-height:1.6">${esc(L.text)}</p>
  </td></tr>
  ${A ? `<tr><td style="padding:4px 28px 16px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999">Ton archétype</p>
    <p style="margin:0;font-size:20px;color:#fff;font-weight:bold">${esc(A.name)}</p>
    <p style="margin:2px 0 8px;color:#FF7A1A">${esc(A.tag)}</p>
    <p style="margin:0;color:#ccc;line-height:1.6">${esc(A.desc)}</p>
  </td></tr>` : ""}
  <tr><td style="padding:8px 28px">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999">Tes 8 axes de cuisson (sur 100)</p>
    <table role="presentation" width="100%">${axisRows}</table>
  </td></tr>
  <tr><td style="padding:16px 28px 0">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999">Là où ça brûle le plus</p>
    <p style="margin:0 0 6px;color:#fff"><b>${esc(X1.full)} · ${result.scores[k1]}/100</b></p>
    <p style="margin:0 0 12px;color:#ccc;line-height:1.6">${esc(X1.bands[bandOf(result.scores[k1])])}</p>
    <p style="margin:0 0 6px;color:#fff"><b>${esc(X2.full)} · ${result.scores[k2]}/100</b></p>
    <p style="margin:0;color:#ccc;line-height:1.6">${esc(X2.bands[bandOf(result.scores[k2])])}</p>
  </td></tr>
  <tr><td style="padding:20px 28px 0">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#999">3 défis à lancer ce soir, gratuitement</p>
    <ol style="margin:0;padding-left:20px;color:#ddd;line-height:1.6">${X1.defis.map(d => `<li>${esc(d)}</li>`).join("")}</ol>
  </td></tr>
  ${pitch}
  <tr><td style="padding:24px 28px 28px">
    <p style="margin:0;color:#777;font-size:12px;line-height:1.5">Tu reçois cet e-mail parce que tu as fait le test Cerveau Cramé${site ? ` sur ${esc(site.replace(/^https?:\/\//, ""))}` : ""}.${consentMarketing ? " Pour ne plus recevoir nos conseils et offres, réponds simplement STOP à cet e-mail." : ""}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  /* ---------- texte brut ---------- */
  const text = [
    `${firstName ? firstName + ", ton" : "Ton"} verdict : ${L.name}, cramé à ${pct} % (${fr1(temp)} °C).`,
    L.tag, "", L.text, "",
    A ? `Ton archétype : ${A.name}. ${A.tag}\n${A.desc}\n` : "",
    "Tes 8 axes (sur 100) :",
    ...ranked.map(k => `- ${AX[k].name} : ${result.scores[k]}`), "",
    `Là où ça brûle le plus : ${X1.full} (${result.scores[k1]}) et ${X2.full} (${result.scores[k2]}).`, "",
    "3 défis à lancer ce soir :", ...X1.defis.map((d, i) => `${i + 1}. ${d}`), "",
    ...(consentMarketing ? [
      `À ${pct} %, ça ne se répare pas tout seul. Le Programme Désintox Cérébrale : 21 jours, 15 minutes par jour, construit sur ${X1.name} et ${X2.name}.`,
      `Vidéos, exercices, groupe privé. ${PRICE}, prix de lancement.`,
      `Je commence ma désintox : ${cta}`, "",
      "Pour ne plus recevoir nos conseils et offres, réponds STOP à cet e-mail.",
    ] : []),
    "L'équipe Cerveau Cramé",
  ].join("\n");

  return { subject, html, text };
}
