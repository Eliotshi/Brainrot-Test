/* ============================================================
   CERVEAU CRAMÉ · calcul et rendu du rapport
   ============================================================ */
"use strict";

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const AXK = AXES.map(a => a.k);

/* ---------- reference groups: real players when n ≥ 50, modelled panel otherwise ---------- */
const MIN_LIVE = 50;
function modelRef(profiles, ages) {
  const means = {};
  for (const k of AXK) means[k] = avg(profiles.flatMap(p => ages.map(a => clamp(PANEL.base[p][k] + PANEL.age[a], 0, 100))));
  const sds = Object.fromEntries(AXK.map(k => [k, PANEL.sd]));
  return { means, sds, overall: avg(AXK.map(k => means[k])), overall_sd: 14, n: 0, live: false };
}
function liveOr(g, fallback) { return g && g.n >= MIN_LIVE ? { ...g, live: true } : fallback; }
const refGroup = (p, a) => liveOr(LIVE?.groups?.[p + "|" + a], modelRef([p], [a]));
const refProfile = p => liveOr(LIVE?.profiles?.[p], modelRef([p], AGES));
const refAll = () => liveOr(LIVE?.all, modelRef(["etu", "pro"], AGES));
const pct = (x, m, sd) => clamp(Math.round(Phi((x - m) / Math.max(sd, 4)) * 100), 1, 99);

/* ---------- archetype ---------- */
function archetypeOf(sc) {
  const v = AXK.map(k => sc[k]), o = avg(v), mx = Math.max(...v), mn = Math.min(...v);
  if (o < 22 && mx < 45) return "bleu";
  if (o >= 78) return "carbo";
  if (mx - mn < 16) return "equi";
  const prod = avg([sc.plume, sc.pensee, sc.memoire, sc.attention]), hum = avg([sc.coeur, sc.perroquet, sc.boussole]);
  if (prod >= 58 && hum <= 35) return "cyborg";
  return AXK.reduce((b, k) => sc[k] > sc[b] ? k : b, AXK[0]);
}

/* rarity: real distribution once 200+ players, otherwise a seeded simulation of the panel */
let _sim = null;
function rarity(key) {
  const arc = LIVE?.archetypes, tot = arc ? Object.values(arc).reduce((s, x) => s + x, 0) : 0;
  if (tot >= 200) return { pct: Math.max(1, Math.round((arc[key] || 0) / tot * 100)), live: true };
  if (!_sim) {
    let a = 0x9e3779b9; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    _sim = {}; const N = 6000;
    for (let i = 0; i < N; i++) {
      const p = rnd() < .5 ? "etu" : "pro", ag = AGES[Math.floor(rnd() * 4)], g = gauss(), sc = {};
      for (const k of AXK) sc[k] = clamp(PANEL.base[p][k] + PANEL.age[ag] + PANEL.sd * (.65 * g + .76 * gauss()), 0, 100);
      const ar = archetypeOf(sc); _sim[ar] = (_sim[ar] || 0) + 1;
    }
    for (const k in _sim) _sim[k] = _sim[k] / N * 100;
  }
  return { pct: Math.max(1, Math.round(_sim[key] || 1)), live: false };
}

/* ---------- compute everything ---------- */
function computeReport() {
  const st = axisStats(), scores = {}, conf = {};
  for (const k of AXK) { scores[k] = st[k].n ? Math.round(st[k].mean / 3 * 100) : 50; conf[k] = st[k].n; }
  const overall = avg(AXK.map(k => scores[k]));
  const level = levelOf(overall), temp = tempOf(overall);
  const archKey = archetypeOf(scores), arch = ARCHETYPES[archKey];
  const G = refGroup(S.profile, S.age), P = refProfile(S.profile), ALL = refAll();
  const other = S.profile === "etu" ? "pro" : "etu", O = refProfile(other);
  const axPct = Object.fromEntries(AXK.map(k => [k, pct(scores[k], G.means[k], G.sds[k])]));
  const N = S.answers.length;
  const hours = 96 * Math.pow(1 - overall / 100, 1.8);
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  const ranked = AXK.slice().sort((a, b) => scores[b] - scores[a]);
  const hot = S.answers.slice().sort((a, b) => b.s - a.s || b.lvl - a.lvl);
  const cold = S.answers.slice().sort((a, b) => a.s - b.s || b.lvl - a.lvl);
  return {
    scores, conf, overall, level, temp, archKey, arch, G, P, ALL, O, other, axPct,
    pctGroup: pct(overall, G.overall, G.overall_sd), pctAll: pct(overall, ALL.overall, ALL.overall_sd), pctOther: pct(overall, O.overall, O.overall_sd),
    precision: Math.round(50 + 45 * (1 - Math.exp(-N / 22))),
    autonomy: `${h} h ${String(m).padStart(2, "0")}`, autonomyH: hours,
    braise: Math.round(S.answers.filter(a => a.s >= 2).length / Math.max(1, N) * 100),
    nBonus: S.answers.filter(a => a.bonus).length,
    top: ranked.slice(0, 2), bottom: ranked[ranked.length - 1],
    signature: hot.slice(0, 3), crudest: cold[0],
    rarity: rarity(archKey),
  };
}

/* ---------- radar SVG ---------- */
function radarSVG({ me, ref, ref2, size = 400, blurVals = false, active = null, uid = "r" + Math.random().toString(36).slice(2, 7) }) {
  const c = size / 2, R = size * .35, n = AXK.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * R * v / 100, c + Math.sin(a) * R * v / 100]; };
  const poly = o => AXK.map((k, i) => pt(i, o[k]).map(x => x.toFixed(1)).join(",")).join(" ");
  let g = `<defs><radialGradient id="${uid}g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2F45FF"/><stop offset=".45" stop-color="#E8338B"/><stop offset=".8" stop-color="#FF7A1A"/><stop offset="1" stop-color="#FFD23F"/></radialGradient></defs>`;
  for (const r of [25, 50, 75, 100]) g += `<polygon points="${AXK.map((k, i) => pt(i, r).join(",")).join(" ")}" fill="none" stroke="#2A3060" stroke-width="1"/>`;
  AXK.forEach((k, i) => { const [x, y] = pt(i, 100); g += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#2A3060" stroke-width="1"/>`; });
  g += `<text x="${c + 4}" y="${c - R * .5 + 4}" fill="#7076A3" font-size="10" font-family="JetBrains Mono, monospace">50</text>`;
  if (ref2) g += `<polygon points="${poly(ref2)}" fill="none" stroke="#8B3CFF" stroke-width="1.6" stroke-dasharray="3 4"/>`;
  if (ref) g += `<polygon points="${poly(ref)}" fill="none" stroke="#F2F0FF" stroke-opacity=".7" stroke-width="1.6" stroke-dasharray="6 5"/>`;
  g += `<polygon points="${poly(me)}" fill="url(#${uid}g)" fill-opacity=".42" stroke="url(#${uid}g)" stroke-width="2.5" stroke-linejoin="round"/>`;
  AXK.forEach((k, i) => {
    const [x, y] = pt(i, me[k]); g += `<circle cx="${x}" cy="${y}" r="${active === k ? 7 : 4.5}" fill="${heatCSS(me[k] / 100)}" stroke="#080A16" stroke-width="2"/>`;
    const a = -Math.PI / 2 + i * 2 * Math.PI / n, lx = c + Math.cos(a) * (R + 20), ly = c + Math.sin(a) * (R + 20);
    const anchor = Math.abs(Math.cos(a)) < .2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
    const dy = Math.sin(a) < -.5 ? -10 : Math.sin(a) > .5 ? 14 : 0;
    g += `<g data-ax="${k}" style="cursor:pointer"><text x="${lx}" y="${ly + dy}" text-anchor="${anchor}" fill="${active === k ? "#FFD23F" : "#F2F0FF"}" font-size="14" font-weight="600" font-family="Onest, sans-serif">${AX[k].name}</text>`;
    g += `<text x="${lx}" y="${ly + dy + 15}" text-anchor="${anchor}" fill="#A2A7CF" font-size="11" font-family="JetBrains Mono, monospace" ${blurVals ? 'filter="url(#' + uid + 'b)"' : ""}>${Math.round(me[k])}</text></g>`;
  });
  if (blurVals) g = g.replace("</defs>", `<filter id="${uid}b"><feGaussianBlur stdDeviation="3"/></filter></defs>`);
  return `<svg viewBox="-58 -8 ${size + 116} ${size + 18}" role="img" aria-label="Carte thermique sur 8 axes">${g}</svg>`;
}

/* ---------- bell curve ---------- */
function bellSVG(me, m, sd) {
  const W = 520, H = 170, pad = 16, X = v => pad + v / 100 * (W - 2 * pad);
  const pdf = v => Math.exp(-.5 * Math.pow((v - m) / sd, 2));
  let d = `M${X(0)},${H - 28}`, dl = d;
  for (let v = 0; v <= 100; v += 1) { const y = H - 28 - pdf(v) * (H - 60); d += ` L${X(v).toFixed(1)},${y.toFixed(1)}`; if (v <= me) dl += ` L${X(v).toFixed(1)},${y.toFixed(1)}`; }
  d += ` L${X(100)},${H - 28} Z`; dl += ` L${X(me)},${H - 28} Z`;
  const ym = H - 28 - pdf(me) * (H - 60);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ta position dans la distribution">
    <defs><linearGradient id="bellg" x1="0" x2="1"><stop offset="0" stop-color="#2F45FF"/><stop offset=".5" stop-color="#E8338B"/><stop offset="1" stop-color="#FFD23F"/></linearGradient></defs>
    <path d="${d}" fill="#22274D"/><path d="${dl}" fill="url(#bellg)" opacity=".85"/>
    <line x1="${X(m)}" x2="${X(m)}" y1="20" y2="${H - 28}" stroke="#F2F0FF" stroke-opacity=".5" stroke-dasharray="4 4"/>
    <text x="${X(m)}" y="14" text-anchor="middle" fill="#A2A7CF" font-size="11" font-family="JetBrains Mono, monospace">moyenne ${Math.round(m)}</text>
    <line x1="${X(me)}" x2="${X(me)}" y1="${ym - 8}" y2="${H - 28}" stroke="#FFF4CF" stroke-width="2.5"/>
    <circle cx="${X(me)}" cy="${ym - 8}" r="6" fill="#FFF4CF"/>
    <text x="${clamp(X(me), 30, W - 30)}" y="${H - 8}" text-anchor="middle" fill="#F2F0FF" font-size="12" font-weight="700" font-family="Onest, sans-serif">Toi · ${Math.round(me)}</text>
    <text x="${pad}" y="${H - 8}" fill="#7076A3" font-size="10" font-family="JetBrains Mono, monospace">cru</text>
    <text x="${W - pad}" y="${H - 8}" text-anchor="end" fill="#7076A3" font-size="10" font-family="JetBrains Mono, monospace">cramé</text>
  </svg>`;
}

/* ---------- render ---------- */
function bandOf(v) { return v < 34 ? 0 : v < 67 ? 1 : 2; }
const BANDN = ["Cru", "Tiède", "Brûlant"];
function confDots(n) { const k = n >= 6 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : 1; return `<span class="conf" title="Précision : ${n} réponse${n > 1 ? "s" : ""}">${[1, 2, 3, 4].map(i => `<i class="${i <= k ? "on" : ""}"></i>`).join("")}</span>`; }

function renderReport(R) {
  const name = S.name ? esc(S.name) : "Toi";
  const L = R.level, A = R.arch, src = R.G.live ? `${R.G.n.toLocaleString("fr-FR")} vrais joueurs` : "panel de référence modélisé";
  const grpLbl = `${PROFILES_PL[S.profile]} de ${S.age} ans`;
  const al = ARCHETYPES[A.ally], cl = ARCHETYPES[A.clash];
  const sig = R.signature.map(a => ({ a, q: QM[a.id] }));
  const cr = R.crudest, crq = QM[cr.id];
  const plan = R.top.map(k => AX[k]);
  const isExpress = S.target < 50;
  const ref = R.G.means, ref2 = R.O.means;

  $("#res").innerHTML = `
  <section class="res-hero">
    <div>
      <p class="eyebrow">${name}, ton cerveau est</p>
      <h1 class="heat-text" style="margin-top:10px">${esc(L.name)}</h1>
      <p class="lvtag">${esc(L.tag)}</p>
      <p class="lvtext">${esc(L.text)}</p>
      <div class="res-chips">
        <span class="chip">${icon("radar")} Précision ${R.precision} %</span>
        <span class="chip">${icon("thermo")} ${S.answers.length} réponses · mode ${S.target >= 50 ? "complet" : "express"}</span>
        <span class="chip">${icon("bolt")} ${S.xp} XP</span>
      </div>
    </div>
    <div class="gauge">
      <span class="eyebrow">Température à cœur</span>
      <div class="bigtemp mono" style="color:${heatCSS(R.overall / 100)};margin-top:8px" id="r-temp">0,0 °C</div>
      <div class="gauge-bar"><span class="gauge-mark-grp" style="left:${R.G.overall}%" title="Moyenne de ton groupe"></span><span class="gauge-mark" id="r-mark" style="left:0"></span></div>
      <div class="gauge-lbls">${LEVELS.map(l => `<span class="${l === L ? "on" : ""}">${l.name}</span>`).join("")}</div>
      <p class="gauge-note">Le trait fin marque la moyenne des ${esc(grpLbl)} (${Math.round(tempOf(R.G.overall))} °C).</p>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Ton archétype · 1 sur 12</p></div></div>
    <div class="archcard">
      <div class="arch-emblem">${esc(A.name.split(" ").map(w => w[0]).join("").slice(0, 2))}</div>
      <div style="min-width:0">
        <h3>${esc(A.name)}</h3>
        <p class="tagl">${esc(A.tag)}</p>
        <p class="desc">${esc(A.desc)}</p>
        <div class="arch-meta">
          <span class="chip">${icon("eye")} ${R.rarity.pct} % ${R.rarity.live ? "des joueurs" : "du panel"} ont ce profil</span>
          <span class="chip">Référence : ${esc(A.ref)}</span>
        </div>
      </div>
      <div class="fa">
        <div class="fa-box f"><h4>Tes forces</h4><ul>${A.forces.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="fa-box a"><h4>Tes angles morts</h4><ul>${A.angles.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Carte thermique</p><h2 style="margin-top:8px">Tes 8 axes de cuisson</h2><p>Touche un axe pour voir le détail. Compare ta forme à celle des autres.</p></div></div>
    <div class="radar-wrap">
      <div class="radar-box">
        <div class="toggles" id="r-tg">
          <button class="tg" data-tg="ref" aria-pressed="true"><i style="background:#F2F0FF"></i>${esc(PROFILES_PL[S.profile])} ${esc(S.age)}</button>
          <button class="tg" data-tg="ref2" aria-pressed="false"><i style="background:#8B3CFF"></i>${esc(PROFILES_PL[R.other])}</button>
        </div>
        <div id="r-radar"></div>
      </div>
      <div class="axis-detail" id="r-axis"></div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Détail par axe</p><h2 style="margin-top:8px">Où ça chauffe, où ça tient</h2><p>Le trait blanc marque la moyenne de ton groupe. Les points indiquent la précision de la mesure.</p></div></div>
    <div class="axes-list">${AXK.slice().sort((a, b) => R.scores[b] - R.scores[a]).map(k => {
      const v = R.scores[k], p = R.axPct[k];
      return `<button class="axrow" aria-expanded="false" data-axr="${k}">
        <span class="nm">${esc(AX[k].name)}<small>${esc(AX[k].full)}</small></span>
        <span class="axbar"><i style="--bw:${v ? 10000 / v : 100}%" data-w="${v}"></i><b style="left:${R.G.means[k]}%"></b></span>
        <span class="val" style="color:${heatCSS(v / 100)}">${v}</span>
        <span class="sub"><span>${BANDN[bandOf(v)]} · plus cramé·e que ${p} % de ton groupe</span><span>Précision${confDots(R.conf[k])}</span></span>
        <span class="interp">${esc(AX[k].bands[bandOf(v)])}</span>
      </button>`;
    }).join("")}</div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Face aux autres</p><h2 style="margin-top:8px">Tu es plus cramé·e que…</h2></div></div>
    <div class="cmp-grid">
      <div class="cmp-big">
        <div class="pc heat-text">${R.pctGroup} %</div>
        <p>des ${esc(grpLbl)}. ${R.pctGroup >= 50 ? `Tu fais partie des ${100 - R.pctGroup + 1} % les plus cuits de ton groupe.` : `Ton cerveau est plus cru que celui de ${100 - R.pctGroup} % de ton groupe.`}</p>
        ${bellSVG(R.overall, R.G.overall, R.G.overall_sd)}
      </div>
      <div class="cmp-big">
        <span class="eyebrow">Score global sur 100</span>
        <div class="bars" style="margin-top:14px">
          ${[["Toi", R.overall, true], [`${PROFILES_PL[S.profile]} ${S.age}`, R.G.overall], [PROFILES_PL.etu, refProfile("etu").overall], [PROFILES_PL.pro, refProfile("pro").overall], ["Tout le monde", R.ALL.overall]]
            .map(([l, v, me]) => `<div class="brow ${me ? "me" : ""}"><span class="lb">${esc(l)}</span><span class="tr"><i data-w="${v}"></i></span><span class="v">${Math.round(v)}</span></div>`).join("")}
        </div>
        <div class="pv-list" style="margin-top:20px">
          <div class="row"><span>Plus cramé·e que l'ensemble des joueurs</span><b>${R.pctAll} %</b></div>
          <div class="row"><span>Plus cramé·e que les ${esc(PROFILES_PL[R.other])}</span><b>${R.pctOther} %</b></div>
        </div>
        <p class="fineprint">Source : ${src}${R.G.live ? "" : ". Les vraies statistiques remplacent le panel dès 50 joueurs par groupe"}.</p>
      </div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Ton cerveau en chiffres</p></div></div>
    <div class="stats">
      <div class="stat"><span class="k">Autonomie sans IA</span><span class="v mono">${R.autonomy}</span>
        <div class="battery">${Array.from({ length: 10 }, (_, i) => `<span class="cell ${i < Math.round(R.autonomyH / 9.6) ? "on" : ""}"></span>`).join("")}<span class="cap"></span></div>
        <span class="s">avant le premier « je demande vite fait »</span></div>
      <div class="stat"><span class="k">Réponses côté braise</span><span class="v mono" style="color:${heatCSS(R.braise / 100)}">${R.braise} %</span><span class="s">de tes réponses sont chaudes ou brûlantes</span></div>
      <div class="stat"><span class="k">Questions bonus débloquées</span><span class="v mono">${R.nBonus}</span><span class="s">le test a creusé ${R.nBonus} de tes réponses</span></div>
      <div class="stat"><span class="k">Ton axe le plus cru</span><span class="v">${esc(AX[R.bottom].name)}</span><span class="s">${R.scores[R.bottom]}/100 · ton point d'appui</span></div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Tes réponses signature</p><h2 style="margin-top:8px">Ce qui t'a trahi·e</h2></div></div>
    <div class="sig">
      ${sig.map(({ a, q }, i) => `<div class="sigcard"><span class="lbl" style="color:${heatCSS(a.s / 3)}">#${i + 1} la plus cramée · ${esc(AX[q.ax].name)}</span><span class="q">${esc(q.q)}</span><span class="a">« ${esc(a.label)} »</span><span class="heatbar" style="background:${heatCSS(a.s / 3)}"></span></div>`).join("")}
      <div class="sigcard"><span class="lbl" style="color:var(--t1)">Ta réponse la plus crue · ${esc(AX[crq.ax].name)}</span><span class="q">${esc(crq.q)}</span><span class="a">« ${esc(cr.label)} »</span><span class="heatbar" style="background:${heatCSS(cr.s / 3)}"></span></div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Tes binômes</p><h2 style="margin-top:8px">Avec qui tu cuisines, contre qui tu brûles</h2></div></div>
    <div class="duo">
      <div class="duocard al"><span class="k">Ton allié·e idéal·e</span><h3>${esc(al.name)}</h3><p>${esc(al.tag)} Vous vous complétez : ce qu'il ou elle garde au frais, tu le délègues, et inversement.</p></div>
      <div class="duocard cl"><span class="k">Ton pire binôme</span><h3>${esc(cl.name)}</h3><p>${esc(cl.tag)} Vos usages de l'IA sont aux antipodes. Idéal pour un défi : faites le test tous les deux.</p></div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Collection</p><h2 style="margin-top:8px">${S.badges.length} badges sur ${BADGES.length}</h2><p>${S.badges.length < BADGES.length ? "Les badges grisés restent à débloquer. Certains ne s'obtiennent qu'en mode complet." : "Collection complète. Respect."}</p></div></div>
    <div class="badges">${BADGES.map(b => { const on = S.badges.includes(b.id); return `<div class="bdg ${on ? "" : "off"}"><span class="ic">${icon(on ? b.icon : "lock")}</span><span class="n">${esc(b.name)}</span><span class="d">${esc(b.desc)}</span></div>`; }).join("")}</div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Ton plan anti-surcuisson</p><h2 style="margin-top:8px">On baisse le feu, en commençant par ${esc(plan[0].name)}</h2></div></div>
    <div class="plan">
      <div class="defis">
        <h3>3 défis à lancer ce soir, gratuitement</h3>
        <p style="color:var(--muted);margin-top:6px;font-size:.94rem">Choisis pour ton axe le plus chaud : ${esc(plan[0].full)} (${R.scores[plan[0].k]}/100).</p>
        <ol>${plan[0].defis.map(d => `<li>${esc(d)}</li>`).join("")}</ol>
      </div>
      <div class="offer">
        <span class="k">Programme Désintox Cérébrale</span>
        <h3>21 jours pour reprendre le volant</h3>
        <p class="why">Construit sur tes deux axes les plus chauds : ${esc(plan[0].name)} et ${esc(plan[1].name)}. 15 minutes par jour.</p>
        <div class="weeks">
          <div class="week"><span class="w">S1</span><div><b>Sevrage</b><span>Repérer ce que tu délègues sans t'en rendre compte, en commençant par ${esc(plan[0].full.toLowerCase())}.</span></div></div>
          <div class="week"><span class="w">S2</span><div><b>${esc(plan[0].name)}</b><span>${esc(plan[0].week)}</span></div></div>
          <div class="week"><span class="w">S3</span><div><b>${esc(plan[1].name)} · Coopérer</b><span>${esc(plan[1].week)} Puis l'IA comme sparring-partner, pas comme pilote.</span></div></div>
        </div>
        <div class="price"><span class="p">49 €</span><span class="m">prix de lancement · vidéos, exercices, groupe privé</span></div>
        <button class="btn btn-hot btn-big" id="btn-offer">Je commence ma désintox <span data-icon="arrow"></span></button>
        <p class="offer-note" id="offer-note"></p>
      </div>
    </div>
  </section>

  <section class="rsec">
    <div class="rsec-head"><div><p class="eyebrow">Partage</p><h2 style="margin-top:8px">Défie tes potes</h2><p>Ta carte est prête pour une story ou un post. Qui sera le plus cramé ?</p></div></div>
    <div class="share">
      <div class="sharecard"><canvas id="share-cv" width="1080" height="1350"></canvas></div>
      <div class="share-actions">
        <div class="share-text" id="share-text"></div>
        <div class="share-btns">
          <button class="btn btn-hot" id="btn-dl">${icon("download")} Télécharger ma carte</button>
          <button class="btn btn-ghost" id="btn-copy">${icon("copy")} Copier le texte</button>
          <button class="btn btn-ghost" id="btn-defi">${icon("bolt")} Copier un défi</button>
        </div>
        ${isExpress ? `<div class="upgrade"><div><h3>Ton diagnostic est précis à ${R.precision} %</h3><p>Passe en mode complet : 30 questions de plus, tes réponses sont gardées, précision ~90 % et badge Marathon.</p></div><button class="btn btn-hot" id="btn-extend">Affiner mon diagnostic</button></div>` : ""}
        <button class="btn btn-ghost" id="btn-restart">${icon("refresh")} Refaire le test</button>
      </div>
    </div>
    <details class="method">
      <summary>Comment on calcule tout ça</summary>
      <div>
        <p>Le test pioche dans une banque de 128 questions. Les 8 premières dépistent chaque axe. Ensuite, chaque réponse oriente la suivante : une réponse brûlante déclenche une question bonus sur le même sujet, et les axes les plus chauds reçoivent des questions plus exigeantes.</p>
        <p>Chaque réponse vaut de 0 (cru) à 3 (cramé). Un axe est la moyenne de ses réponses ramenée sur 100. La température est 42 °C + score global / 2.</p>
        <p>Comparaisons : ${R.G.live ? `calculées sur ${R.G.n.toLocaleString("fr-FR")} vrais joueurs de ton groupe` : "panel de référence modélisé, remplacé par les vrais résultats dès 50 joueurs par groupe"}. Test humoristique, pas un diagnostic médical.</p>
      </div>
    </details>
  </section>`;
  hydrateIcons($("#res"));

  // animations
  const t0 = performance.now();
  const tick = now => { const p = clamp((now - t0) / 1600, 0, 1), e = 1 - Math.pow(1 - p, 3); $("#r-temp").textContent = fr1(37 + (R.temp - 37) * e) + " °C"; if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(() => { $("#r-mark").style.left = R.overall + "%"; $$("#res [data-w]").forEach(i => i.style.width = i.dataset.w + "%"); }, 150);

  // radar + axis detail
  const tg = { ref: true, ref2: false };
  let active = R.top[0];
  const drawRadar = () => {
    $("#r-radar").innerHTML = radarSVG({ me: R.scores, ref: tg.ref ? ref : null, ref2: tg.ref2 ? ref2 : null, size: 400, active });
    $$("#r-radar [data-ax]").forEach(g => g.addEventListener("click", () => { active = g.dataset.ax; drawRadar(); drawAxis(); }));
  };
  const drawAxis = () => {
    const k = active, v = R.scores[k], X = AX[k];
    $("#r-axis").innerHTML = `<span class="k">${esc(X.full)}</span><h3>${esc(X.name)}</h3><div class="sc mono" style="color:${heatCSS(v / 100)}">${v}<span style="font-size:1rem;color:var(--muted)">/100</span></div>
      <p>${esc(X.what)}</p><p style="color:var(--fg)">${esc(X.bands[bandOf(v)])}</p>
      <p>Moyenne de ton groupe : <b style="color:var(--fg)">${Math.round(R.G.means[k])}</b> · plus cramé·e que <b style="color:var(--fg)">${R.axPct[k]} %</b> · ${R.conf[k]} réponse${R.conf[k] > 1 ? "s" : ""}</p>`;
  };
  drawRadar(); drawAxis();
  $$("#r-tg .tg").forEach(b => b.addEventListener("click", () => { tg[b.dataset.tg] = !tg[b.dataset.tg]; b.setAttribute("aria-pressed", tg[b.dataset.tg]); drawRadar(); }));
  $$("#res .axrow").forEach(r => r.addEventListener("click", () => { const o = r.getAttribute("aria-expanded") === "true"; r.setAttribute("aria-expanded", !o); active = r.dataset.axr; drawRadar(); drawAxis(); }));

  // offer
  $("#btn-offer").addEventListener("click", () => {
    track("offer_click");
    if (CHECKOUT_URL) location.href = CHECKOUT_URL + (CHECKOUT_URL.includes("?") ? "&" : "?") + "client_reference_id=" + encodeURIComponent(S.resultId || "");
    else $("#offer-note").textContent = S.mkt ? "Les inscriptions ouvrent très bientôt. Ton intérêt est noté : on te prévient en premier par e-mail." : "Les inscriptions ouvrent très bientôt. Coche l'option e-mail au prochain passage pour être prévenu·e en premier.";
  });

  // share
  const shareTxt = `J'ai fait le test « Ton cerveau est-il cramé par l'IA ? » : ${L.name.toUpperCase()}, ${fr1(R.temp)} °C à cœur. Archétype : ${A.name}. Et toi, tu en es où ? → ${TEST_URL}`;
  const defiTxt = `Je te défie : mon cerveau est à ${fr1(R.temp)} °C (${L.name}). Tu fais mieux ? Test adaptatif, 4 minutes, sans tricher avec l'IA → ${TEST_URL}`;
  $("#share-text").textContent = shareTxt;
  const copy = async (txt, btn, channel) => {
    track("share"); T("share", { props: { channel } });
    try { await navigator.clipboard.writeText(txt); const o = btn.innerHTML; btn.textContent = "Copié !"; setTimeout(() => { btn.innerHTML = o; }, 1500); }
    catch { const r = document.createRange(); r.selectNodeContents($("#share-text")); getSelection().removeAllRanges(); getSelection().addRange(r); }
  };
  $("#btn-copy").addEventListener("click", e => copy(shareTxt, e.currentTarget, "copy"));
  $("#btn-defi").addEventListener("click", e => copy(defiTxt, e.currentTarget, "defi"));
  $("#btn-dl").addEventListener("click", () => downloadCard(R));
  $("#btn-restart").addEventListener("click", () => location.reload());
  $("#btn-extend")?.addEventListener("click", extendRun);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => drawShareCard($("#share-cv"), R));
}

/* ---------- share card (1080×1350) ---------- */
function drawShareCard(cv, R) {
  const x = cv.getContext("2d"), W = cv.width, H = cv.height;
  x.fillStyle = "#080A16"; x.fillRect(0, 0, W, H);
  [[.2, .18, 520, .1], [.85, .3, 460, .5], [.5, .95, 620, R.overall / 100]].forEach(([u, v, r, h]) => {
    const g = x.createRadialGradient(u * W, v * H, 0, u * W, v * H, r); g.addColorStop(0, heatCSS(h).replace("rgb", "rgba").replace(")", ",.55)")); g.addColorStop(1, "rgba(8,10,22,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
  const grad = x.createLinearGradient(80, 0, W - 80, 0); ["#2F45FF", "#8B3CFF", "#E8338B", "#FF7A1A", "#FFD23F"].forEach((c, i) => grad.addColorStop(i / 4, c));
  x.fillStyle = "#A2A7CF"; x.font = "600 34px 'JetBrains Mono', monospace"; x.fillText("CERVEAU CRAMÉ · THERMO-SCAN", 80, 120);
  x.fillStyle = "#F2F0FF"; x.font = "700 56px Onest, sans-serif"; x.fillText("Mon cerveau est", 80, 250);
  x.fillStyle = grad; let fs = 150; x.font = `800 ${fs}px Unbounded, sans-serif`;
  while (x.measureText(R.level.name).width > W - 160 && fs > 70) { fs -= 6; x.font = `800 ${fs}px Unbounded, sans-serif`; }
  x.fillText(R.level.name, 80, 250 + fs + 20);
  x.fillStyle = "#FFF4CF"; x.font = "800 120px 'JetBrains Mono', monospace"; x.fillText(fr1(R.temp) + "°C", 80, 640);
  x.fillStyle = grad; x.fillRect(80, 690, W - 160, 18);
  x.fillStyle = "#F2F0FF"; x.beginPath(); x.arc(80 + (W - 160) * R.overall / 100, 699, 22, 0, 7); x.fill();
  x.fillStyle = "#A2A7CF"; x.font = "500 36px Onest, sans-serif"; x.fillText("Archétype", 80, 800);
  x.fillStyle = "#F2F0FF"; x.font = "700 60px Unbounded, sans-serif"; x.fillText(R.arch.name, 80, 875);
  // mini bars
  const top = AXK.slice().sort((a, b) => R.scores[b] - R.scores[a]).slice(0, 4);
  top.forEach((k, i) => {
    const y = 960 + i * 70; x.fillStyle = "#A2A7CF"; x.font = "600 32px Onest, sans-serif"; x.fillText(AX[k].name, 80, y + 26);
    x.fillStyle = "#22274D"; x.fillRect(360, y, 560, 26); x.fillStyle = heatCSS(R.scores[k] / 100); x.fillRect(360, y, 560 * R.scores[k] / 100, 26);
    x.fillStyle = "#F2F0FF"; x.font = "600 30px 'JetBrains Mono', monospace"; x.fillText(String(R.scores[k]), 940, y + 25);
  });
  x.fillStyle = "#F2F0FF"; x.font = "700 46px Onest, sans-serif"; x.fillText("Et toi, combien de degrés ?", 80, 1250);
  x.fillStyle = "#A2A7CF"; x.font = "600 30px 'JetBrains Mono', monospace"; x.fillText(location.host, 80, 1302);
}
async function downloadCard(R) {
  track("share");
  const cv = $("#share-cv"); drawShareCard(cv, R);
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  const file = new File([blob], "cerveau-crame.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Cerveau Cramé" }); T("share", { props: { channel: "native" } }); return; } catch {} }
  T("share", { props: { channel: "download" } });
  const a = el("a", { href: URL.createObjectURL(blob), download: "cerveau-crame.png" }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
