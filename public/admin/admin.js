/* Cerveau Cramé · CRM */
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SEG = {
  pret: { label: "Prêt·e à acheter", color: "var(--seg-pret)" },
  a_convaincre: { label: "À convaincre", color: "var(--seg-conv)" },
  motive_sans_budget: { label: "Motivé·e sans budget", color: "var(--seg-mot)" },
  froid: { label: "Froid", color: "var(--seg-froid)" },
};
const STATUS = { nouveau: "Nouveau", contacte: "Contacté", en_discussion: "En discussion", converti: "Converti", perdu: "Perdu" };
const SIT = { etudiant: "Étudiant·e", alternance: "Alternance / stage", jeune_actif: "Jeune actif·ve", freelance_recherche: "Freelance / recherche", salarie: "Salarié·e", manager: "Manager / cadre", independant: "Indépendant·e", dirigeant: "Dirigeant·e" };
const SPEND = { "0": "Rien", lt50: "< 50 €", "50_300": "50–300 €", gt300: "> 300 €" };
const PAYER = { free: "Cherche du gratuit", self: "Lui/elle-même", employer: "Employeur / budget formation", either: "Lui/elle ou employeur" };

let KEY = null, DATA = null, sort = { k: "created_at", dir: -1 };
try { KEY = sessionStorage.getItem("cc_admin"); } catch {}

async function api(method, body) {
  const r = await fetch("/api/admin/leads", { method, headers: { "x-admin-key": KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) throw Object.assign(new Error("unauthorized"), { code: 401 });
  if (!r.ok) throw new Error("Erreur serveur (" + r.status + ")");
  return r.json();
}

$("#login").addEventListener("submit", async e => {
  e.preventDefault(); KEY = $("#pw").value; $("#login-err").textContent = "";
  try { await load(); try { sessionStorage.setItem("cc_admin", KEY); } catch {} }
  catch (err) { $("#login-err").textContent = err.code === 401 ? "Mot de passe incorrect." : err.message; }
});
$("#btn-logout").addEventListener("click", () => { try { sessionStorage.removeItem("cc_admin"); } catch {} location.reload(); });
$("#btn-refresh").addEventListener("click", () => load().catch(err => alertBox(err.message)));
function alertBox(m) { $("#count").textContent = m; }

async function load() {
  DATA = await api("GET");
  $("#login").hidden = true; $("#app").hidden = false;
  ["#btn-refresh", "#btn-csv", "#btn-logout"].forEach(s => $(s).hidden = false);
  fillFilters(); render();
}

function fillFilters() {
  const seg = $("#f-seg"), st = $("#f-status"), inc = $("#f-inc");
  if (seg.options.length === 1) {
    Object.entries(SEG).forEach(([k, v]) => seg.add(new Option(v.label, k)));
    Object.entries(STATUS).forEach(([k, v]) => st.add(new Option(v, k)));
  }
  const incs = [...new Map(DATA.leads.filter(l => l.incentive).map(l => [l.incentive, l.incentive_label])).entries()];
  const cur = inc.value; inc.length = 1; incs.forEach(([k, v]) => inc.add(new Option(v, k))); inc.value = cur;
}
["#q", "#f-seg", "#f-status", "#f-profile", "#f-inc", "#f-optin"].forEach(s => $(s).addEventListener("input", render));

function filtered() {
  const q = $("#q").value.trim().toLowerCase(), seg = $("#f-seg").value, st = $("#f-status").value, pr = $("#f-profile").value, inc = $("#f-inc").value, opt = $("#f-optin").checked;
  return DATA.leads.filter(l =>
    (!q || (l.email + " " + (l.first_name || "")).toLowerCase().includes(q)) &&
    (!seg || l.segment === seg) && (!st || l.status === st) && (!pr || l.profile === pr) &&
    (!inc || l.incentive === inc) && (!opt || l.consent_marketing));
}

function render() {
  const all = DATA.leads, rows = filtered(), f = DATA.funnel;
  const pctOf = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
  const conv = all.filter(l => l.status === "converti").length;
  const kp = [
    ["Tests terminés", f.results, "résultats enregistrés"],
    ["Leads", all.length, "capture " + pctOf(all.length, f.results)],
    ["Opt-in marketing", all.filter(l => l.consent_marketing).length, pctOf(all.filter(l => l.consent_marketing).length, all.length) + " des leads"],
    ["Prêt·es à acheter", all.filter(l => l.segment === "pret").length, pctOf(all.filter(l => l.segment === "pret").length, all.length) + " des leads"],
    ["Clics sur l'offre", f.offerClicks, pctOf(f.offerClicks, f.results) + " des tests"],
    ["Convertis", conv, pctOf(conv, all.length) + " des leads"],
  ];
  $("#kpis").innerHTML = kp.map(([k, v, s]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${Number(v).toLocaleString("fr-FR")}</div><div class="s">${esc(s)}</div></div>`).join("");

  $("#legend").innerHTML = Object.entries(SEG).map(([k, v]) => `<span><i style="background:${v.color}"></i>${v.label}</span>`).join("");
  drawMatrix(rows);

  const max = Math.max(1, ...Object.keys(SEG).map(k => all.filter(l => l.segment === k).length));
  $("#segbars").innerHTML = Object.entries(SEG).map(([k, v]) => { const n = all.filter(l => l.segment === k).length; return `<div class="sb"><span>${v.label}</span><span class="tr"><i style="width:${n / max * 100}%;background:${v.color}"></i></span><span class="n">${n}</span></div>`; }).join("");
  const fsteps = [["Tests", f.results], ["Leads", all.length], ["Opt-in", all.filter(l => l.consent_marketing).length], ["Clic offre", f.offerClicks], ["Convertis", conv]];
  const fmax = Math.max(1, f.results);
  $("#funnel").innerHTML = fsteps.map(([k, n]) => `<div class="fn"><span>${k}</span><span class="tr"><i style="width:${n / fmax * 100}%"></i></span><span class="n">${n}</span></div>`).join("");

  renderTable(rows);
  $("#count").textContent = `${rows.length} / ${all.length} leads`;
}

/* ---------- scatter matrix ---------- */
function drawMatrix(rows) {
  const W = 640, H = 380, L = 46, R = 14, T = 14, B = 40;
  const X = v => L + v / 100 * (W - L - R), Y = v => H - B - v / 100 * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Leads par pouvoir d'achat et motivation">`;
  for (const v of [0, 25, 50, 75, 100]) {
    s += `<line x1="${X(0)}" x2="${X(100)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#22274D"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" fill="#7076A3" font-size="11" font-family="JetBrains Mono">${v}</text>`;
    s += `<text x="${X(v)}" y="${H - B + 18}" text-anchor="middle" fill="#7076A3" font-size="11" font-family="JetBrains Mono">${v}</text>`;
  }
  // segment thresholds (bp 50, motivation 55)
  s += `<line x1="${X(50)}" x2="${X(50)}" y1="${Y(0)}" y2="${Y(100)}" stroke="#A2A7CF" stroke-opacity=".5" stroke-dasharray="4 4"/>`;
  s += `<line x1="${X(0)}" x2="${X(100)}" y1="${Y(55)}" y2="${Y(55)}" stroke="#A2A7CF" stroke-opacity=".5" stroke-dasharray="4 4"/>`;
  const q = (x, y, t, a) => `<text x="${X(x)}" y="${Y(y)}" text-anchor="${a}" fill="#A2A7CF" font-size="12" font-weight="600" font-family="Onest">${t}</text>`;
  s += q(98, 96, "Prêt·e à acheter", "end") + q(2, 96, "Motivé·e sans budget", "start") + q(98, 4, "À convaincre", "end") + q(2, 4, "Froid", "start");
  s += `<text x="${X(50)}" y="${H - 4}" text-anchor="middle" fill="#A2A7CF" font-size="12" font-family="Onest">Pouvoir d'achat →</text>`;
  s += `<text transform="translate(12 ${Y(50)}) rotate(-90)" text-anchor="middle" fill="#A2A7CF" font-size="12" font-family="Onest">Motivation →</text>`;
  rows.forEach((l, i) => {
    if (l.buying_power == null || l.motivation == null) return;
    const jx = ((i * 37) % 7 - 3) * .35, jy = ((i * 53) % 7 - 3) * .35;
    s += `<circle data-i="${i}" cx="${X(l.buying_power) + jx}" cy="${Y(l.motivation) + jy}" r="5" fill="${SEG[l.segment]?.color || "#7076A3"}" stroke="#10132A" stroke-width="2" style="cursor:pointer"/>`;
    s += `<circle data-i="${i}" cx="${X(l.buying_power) + jx}" cy="${Y(l.motivation) + jy}" r="12" fill="transparent" style="cursor:pointer"/>`;
  });
  s += "</svg>";
  const m = $("#matrix"); m.innerHTML = s;
  if (!rows.some(l => l.buying_power != null)) m.insertAdjacentHTML("beforeend", `<p class="empty">Aucun lead pour l'instant. Ils apparaîtront ici dès le premier e-mail saisi.</p>`);
  const tip = $("#tip"), panel = m.closest(".panel");
  m.querySelectorAll("circle[data-i]").forEach(c => {
    const l = rows[+c.dataset.i];
    c.addEventListener("mouseenter", () => {
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(l.first_name || "Sans prénom")}</b><span class="m">${esc(l.email)}</span><br><span class="m">Achat ${l.buying_power} · Motivation ${l.motivation}</span><br><span class="m">${esc(SEG[l.segment]?.label || "")} · ${esc(l.incentive_label || "")}</span>`;
      const pr = panel.getBoundingClientRect(), cr = c.getBoundingClientRect();
      tip.style.left = Math.min(cr.left - pr.left + 14, pr.width - 200) + "px"; tip.style.top = (cr.top - pr.top - 10) + "px";
    });
    c.addEventListener("mouseleave", () => { tip.hidden = true; });
    c.addEventListener("click", () => openLead(l));
  });
}

/* ---------- table ---------- */
const COLS = [
  ["created_at", "Date"], ["first_name", "Prénom"], ["email", "E-mail"], ["profile", "Profil"],
  ["temp", "Temp."], ["archetype", "Archétype"], ["buying_power", "Achat"], ["motivation", "Motiv."],
  ["segment", "Segment"], ["incentive_label", "Incentive"], ["consent_marketing", "Opt-in"], ["status", "Statut"],
];
function renderTable(rows) {
  const sorted = rows.slice().sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
  $("#tbl thead").innerHTML = "<tr>" + COLS.map(([k, l]) => `<th data-k="${k}" aria-sort="${sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}">${l}</th>`).join("") + "</tr>";
  document.querySelectorAll("#tbl th").forEach(th => th.addEventListener("click", () => { const k = th.dataset.k; sort = { k, dir: sort.k === k ? -sort.dir : -1 }; renderTable(filtered()); }));
  const meter = v => v == null ? "–" : `${v}<span class="meter"><i style="width:${v}%"></i></span>`;
  $("#tbl tbody").innerHTML = sorted.length ? sorted.map(l => `<tr data-id="${l.id}">
    <td class="mono">${new Date(l.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
    <td>${esc(l.first_name || "–")}</td><td>${esc(l.email)}</td>
    <td>${l.profile === "pro" ? "Pro" : "Étu"} · ${esc(l.age || "")}</td>
    <td class="num">${l.temp != null ? String(l.temp).replace(".", ",") + " °C" : "–"}</td>
    <td>${esc(ARCHETYPES[l.archetype]?.name || "–")}</td>
    <td class="num">${meter(l.buying_power)}</td><td class="num">${meter(l.motivation)}</td>
    <td><span class="segpill"><i style="background:${SEG[l.segment]?.color || "#7076A3"}"></i>${esc(SEG[l.segment]?.label || "–")}</span></td>
    <td>${esc(l.incentive_label || "–")}</td>
    <td>${l.consent_marketing ? "Oui" : "Non"}</td>
    <td><select class="st" data-id="${l.id}" aria-label="Statut">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
  </tr>`).join("") : `<tr><td colspan="${COLS.length}" class="empty">Aucun lead ne correspond à ces filtres.</td></tr>`;
  document.querySelectorAll("#tbl tbody tr[data-id]").forEach(tr => tr.addEventListener("click", e => { if (e.target.closest("select")) return; openLead(DATA.leads.find(l => l.id === tr.dataset.id)); }));
  document.querySelectorAll("select.st").forEach(s => s.addEventListener("change", () => patch(s.dataset.id, { status: s.value })));
}

async function patch(id, p) {
  try { const { lead } = await api("PATCH", { id, ...p }); const i = DATA.leads.findIndex(l => l.id === id); if (lead && i >= 0) DATA.leads[i] = lead; render(); return lead; }
  catch (e) { alertBox("Échec de l'enregistrement : " + e.message); }
}

/* ---------- lead drawer ---------- */
function openLead(l) {
  const d = $("#drawer"); d.hidden = false;
  const axes = (l.top_axes || []).map(k => AXES.find(a => a.k === k)?.name || k).join(", ");
  d.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:start">
      <div><p class="eyebrow">${esc(SEG[l.segment]?.label || "Lead")}</p><h2 style="margin-top:6px">${esc(l.first_name || "Sans prénom")}</h2><p class="mono" style="color:var(--muted);margin-top:4px;word-break:break-all">${esc(l.email)}</p></div>
      <button class="iconbtn" id="d-close" aria-label="Fermer">✕</button>
    </div>
    <div class="incent"><b>Incentive suggéré : ${esc(l.incentive_label || "–")}</b><span>${esc(l.incentive_reason || "")}</span></div>
    <dl class="dl">
      <dt>Pouvoir d'achat</dt><dd>${l.buying_power ?? "–"} / 100</dd>
      <dt>Motivation</dt><dd>${l.motivation ?? "–"} / 100</dd>
      <dt>Situation</dt><dd>${esc(SIT[l.situation] || "–")}</dd>
      <dt>Dépenses formation</dt><dd>${esc(SPEND[l.spend] || "–")}</dd>
      <dt>Financement</dt><dd>${esc(PAYER[l.payer] || "–")}</dd>
      <dt>Envie de changer</dt><dd>${l.wish ?? "–"} / 10</dd>
      <dt>Profil</dt><dd>${l.profile === "pro" ? "Pro" : "Étudiant·e / jeune actif·ve"} · ${esc(l.age || "")}</dd>
      <dt>Résultat</dt><dd>${esc(l.level || "–")} · ${l.temp != null ? String(l.temp).replace(".", ",") + " °C" : "–"} · ${esc(ARCHETYPES[l.archetype]?.name || "")}</dd>
      <dt>Axes les plus chauds</dt><dd>${esc(axes || "–")}</dd>
      <dt>Mode</dt><dd>${esc(l.mode || "–")}${l.extended ? " (affiné)" : ""}</dd>
      <dt>Comportement</dt><dd>${[l.offer_clicked && "a cliqué l'offre", l.shared && "a partagé", l.attempts > 1 && l.attempts + " passages"].filter(Boolean).join(" · ") || "–"}</dd>
      <dt>Opt-in marketing</dt><dd>${l.consent_marketing ? "Oui" : "Non (ne pas envoyer d'offre)"}</dd>
      <dt>Source</dt><dd>${esc(l.utm ? Object.entries(l.utm).map(([k, v]) => k + "=" + v).join(" ") : "–")}</dd>
      <dt>Créé le</dt><dd>${new Date(l.created_at).toLocaleString("fr-FR")}</dd>
    </dl>
    <div class="field" style="margin-top:18px"><label for="d-status">Statut</label>
      <select id="d-status" class="st" style="padding:10px">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field"><label for="d-notes">Notes</label><textarea id="d-notes" maxlength="4000">${esc(l.notes || "")}</textarea></div>
    <button class="btn btn-hot" id="d-save" style="margin-top:12px;width:100%">Enregistrer</button>
    <p class="err" id="d-msg" style="color:var(--muted)"></p>`;
  $("#d-close").addEventListener("click", () => { d.hidden = true; });
  $("#d-save").addEventListener("click", async () => {
    const r = await patch(l.id, { status: $("#d-status").value, notes: $("#d-notes").value });
    $("#d-msg").textContent = r ? "Enregistré." : "Échec de l'enregistrement.";
    if (r) l = r;
  });
}
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#drawer").hidden = true; });

/* ---------- CSV ---------- */
$("#btn-csv").addEventListener("click", () => {
  const rows = filtered();
  const cols = ["created_at", "first_name", "email", "consent_marketing", "profile", "age", "situation", "spend", "payer", "wish", "level", "temp", "archetype", "buying_power", "motivation", "segment", "incentive", "incentive_label", "offer_clicked", "shared", "status", "notes"];
  const cell = v => { const s = Array.isArray(v) ? v.join("|") : v == null ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `leads-cerveau-crame-${new Date().toISOString().slice(0, 10)}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
});

if (KEY) load().catch(() => { try { sessionStorage.removeItem("cc_admin"); } catch {} });
