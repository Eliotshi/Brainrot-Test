/* ============================================================
   CERVEAU CRAMÉ · moteur du test
   ============================================================ */
"use strict";

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "style") n.style.cssText = v;
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const fr1 = x => x.toFixed(1).replace(".", ",");
const pick = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* heat colour for a 0..1 value (thermal palette) */
const HEAT = [[47,69,255],[139,60,255],[232,51,139],[255,122,26],[255,210,63],[255,244,207]];
function heatRGB(t) {
  t = clamp(t, 0, 1) * (HEAT.length - 2);
  const i = Math.floor(t), f = t - i, a = HEAT[i], b = HEAT[Math.min(i + 1, HEAT.length - 1)];
  return a.map((v, k) => Math.round(v + (b[k] - v) * f));
}
const heatCSS = t => `rgb(${heatRGB(t).join(",")})`;

/* ---------- icons ---------- */
const IC = {
  thermo:'<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  radar:'<path d="M12 2l9 6.5-3.5 10.5h-11L3 8.5z"/><path d="M12 7l4.5 3.3-1.7 5.2H9.2l-1.7-5.2z"/>',
  medal:'<circle cx="12" cy="15" r="6"/><path d="M8.5 9.5L6 2h4l2 5 2-5h4l-2.5 7.5"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  sound:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  feather:'<path d="M20 4C12 4 6 10 6 18v2"/><path d="M6 18c6 0 12-4 14-14"/><path d="M10 14h6"/>',
  bubble:'<path d="M4 5h16v11H9l-5 4z"/>',
  snow:'<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/>',
  flame:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
  drill:'<path d="M12 2v6M8 8h8l-2 6h-4z"/><path d="M12 14v8"/>',
  half:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  shield:'<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
  palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="16" cy="10" r="1.3"/>',
  heart:'<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  plan:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>',
};
const icon = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ""}</svg>`;
function hydrateIcons(root = document) { $$("[data-icon]", root).forEach(n => { n.innerHTML = icon(n.dataset.icon); }); }

/* ---------- sound (WebAudio, no files) ---------- */
const Snd = {
  ctx: null, on: store.get("cc_sound") !== false,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  tone(f, d = .12, type = "sine", vol = .06, slide = 0, delay = 0) {
    if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
  },
  pickS(s) { this.tone(260 + s * 110, .1, "triangle", .07); this.tone(390 + s * 160, .14, "sine", .04, 1.3, .05); },
  badge() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .18, "triangle", .06, 1, i * .07)); },
  chapter() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, .5, "sine", .05, 1, i * .09)); },
  whoosh() { this.tone(180, .9, "sawtooth", .03, 6); },
  tick() { this.tone(900, .03, "square", .015); },
};

/* ---------- particles ---------- */
const FX = (() => {
  const cv = $("#fx"), cx = cv.getContext("2d"); let P = [], raf = 0, W = 0, H = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function size() { const d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener("resize", size); size();
  function loop() {
    cx.clearRect(0, 0, W, H);
    P = P.filter(p => p.life > 0);
    for (const p of P) {
      p.life -= p.decay; p.vy += p.g; p.vx *= .985; p.x += p.vx; p.y += p.vy;
      cx.globalAlpha = clamp(p.life, 0, 1); cx.fillStyle = p.c;
      if (p.sq) { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r += p.vr); cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore(); }
      else { cx.beginPath(); cx.arc(p.x, p.y, p.s, 0, 7); cx.fill(); }
    }
    cx.globalAlpha = 1;
    raf = P.length ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  return {
    burst(x, y, heat, n = 18) {
      if (reduce) return;
      const up = heat > .5;
      for (let i = 0; i < n; i++) {
        const a = up ? -Math.PI / 2 + (Math.random() - .5) * 1.8 : Math.random() * Math.PI * 2;
        const v = 1.5 + Math.random() * (up ? 5 : 3);
        P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: up ? -.03 : .04, s: 1.5 + Math.random() * 3, life: 1, decay: .018 + Math.random() * .02, c: heatCSS(clamp(heat + (Math.random() - .5) * .25, 0, 1)) });
      }
      kick();
    },
    confetti(n = 140) {
      if (reduce) return;
      for (let i = 0; i < n; i++) P.push({ x: W / 2 + (Math.random() - .5) * W * .5, y: H * .35, vx: (Math.random() - .5) * 14, vy: -6 - Math.random() * 9, g: .28, s: 6 + Math.random() * 7, life: 1.6, decay: .008, sq: true, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: heatCSS(Math.random()) });
      kick();
    },
  };
})();

/* ---------- toasts ---------- */
function toast(kicker, name, ic = "medal", ms = 2600) {
  const t = el("div", { class: "toast" }, el("div", { class: "ic", html: icon(ic) }), el("div", {}, el("div", { class: "k" }, kicker), el("div", { class: "n" }, name)));
  $("#toasts").append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, ms);
}

/* ---------- API (Vercel + Supabase), always optional ---------- */
const API = {
  async post(path, body) {
    try {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) return null; return await r.json();
    } catch { return null; }
  },
  async stats() {
    try { const r = await fetch("/api/stats"); if (!r.ok) return null; return await r.json(); } catch { return null; }
  },
};
let LIVE = null;
API.stats().then(d => { LIVE = d; landCount(); });

/* ---------- screens ---------- */
const screens = ["land", "setup", "quiz", "cook", "gate", "result"];
function show(k) {
  screens.forEach(s => { $("#s-" + s).hidden = s !== k; });
  scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (k === "land") Cam.start(); else Cam.stop();
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (!g) return;
  Snd.init(); show(g.dataset.go);
});

/* ---------- state ---------- */
const QM = Object.fromEntries(Q.map(q => [q.id, q]));
const S = {
  profile: null, age: null, mode: null, target: 20,
  answers: [], cur: null, curBonus: false, shownAt: 0,
  xp: 0, combo: 0, badges: [], qual: {}, qualIdx: -1,
  started: 0, resultId: null, unlocked: false, extended: false,
  name: "", email: "", events: new Set(), busy: false,
};
const utm = (() => { try { const p = new URLSearchParams(location.search); const o = {}; ["utm_source","utm_medium","utm_campaign","utm_content","ref"].forEach(k => { if (p.get(k)) o[k] = p.get(k).slice(0, 80); }); return o; } catch { return {}; } })();

/* ============================================================
   LANDING
   ============================================================ */
function landCount() {
  const n = LIVE && LIVE.n_total;
  if (n >= 100) { const c = $("#land-count"); c.hidden = false; c.innerHTML = icon("thermo") + ` <b>${n.toLocaleString("fr-FR")}</b>&nbsp;cerveaux déjà scannés`; }
}
function renderLanding() {
  // archetypes: 4 visibles, 8 cachés
  const visible = ["perroquet", "attention", "plume", "coeur"];
  const order = [...visible, ...Object.keys(ARCHETYPES).filter(k => !visible.includes(k))];
  $("#arch-grid").replaceChildren(...order.map(k => {
    const A = ARCHETYPES[k], locked = !visible.includes(k);
    return el("div", { class: "arch" + (locked ? " locked" : "") }, el("div", { class: "sw" }), el("div", { class: "n" }, A.name), el("div", { class: "t" }, A.tag));
  }));
  $("#scale5").replaceChildren(...LEVELS.map(L => el("div", { class: "lv" },
    el("div", { class: "bar", style: `background:${L.col}` }),
    el("span", { class: "n" }, L.name),
    el("span", { class: "r" }, `${Math.round(tempOf(L.from))}–${Math.round(tempOf(Math.min(L.to, 100)))} °C`),
    el("span", { class: "d" }, L.tag))));
  // radar d'exemple
  const sample = { plume: 72, pensee: 58, memoire: 49, boussole: 41, attention: 77, idees: 55, coeur: 34, perroquet: 86 };
  $("#pv-radar").innerHTML = radarSVG({ me: sample, ref: { plume: 50, pensee: 45, memoire: 42, boussole: 36, attention: 50, idees: 43, coeur: 30, perroquet: 42 }, size: 340, blurVals: true });
}

/* thermal camera hero */
const Cam = (() => {
  const cv = $("#cam"), N = 96; let ctx, img, raf = 0, t0 = performance.now(), lastTxt = 0;
  cv.width = N; cv.height = N; ctx = cv.getContext("2d"); img = ctx.createImageData(N, N);
  const CAM = [[5,6,14],[22,26,92],[47,69,255],[139,60,255],[232,51,139],[255,122,26],[255,210,63],[255,244,207]];
  const lut = []; for (let i = 0; i < 256; i++) { const t = i / 255 * (CAM.length - 1), j = Math.min(Math.floor(t), CAM.length - 2), f = t - j; lut.push(CAM[j].map((v, k) => Math.round(v + (CAM[j + 1][k] - v) * f))); }
  const blobs = Array.from({ length: 6 }, (_, i) => ({ ph: i * 1.7, sp: .25 + Math.random() * .35, r: .16 + Math.random() * .1 }));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(now) {
    const t = (now - t0) / 1000, d = img.data; let mx = 0;
    const pos = blobs.map((b, i) => ({ x: .5 + Math.sin(t * b.sp + b.ph) * .22 * (i % 2 ? 1 : -1), y: .48 + Math.cos(t * b.sp * 1.3 + b.ph) * .16, r: b.r }));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      // two hemispheres
      const lx = (u - .33) / .26, ly = (v - .5) / .34, rx = (u - .67) / .26, ry = ly;
      const hemi = Math.max(1 - (lx * lx + ly * ly), 1 - (rx * rx + ry * ry));
      const fiss = 1 - Math.exp(-Math.pow((u - .5) / .018, 2));
      let mask = clamp(hemi * 2.4, 0, 1) * (.3 + .7 * fiss);
      const folds = .5 + .5 * Math.sin(u * 38 + Math.sin(v * 21 + t * .6) * 2.4) * Math.cos(v * 31 - t * .4);
      let h = 0; for (const p of pos) { const dx = u - p.x, dy = v - p.y; h += Math.exp(-(dx * dx + dy * dy) / (p.r * p.r)); }
      let val = mask * (.16 + h * .26 + folds * .24) + (1 - mask) * .05 * (1 + .5 * Math.sin(t + u * 6));
      val = clamp(val, 0, 1); if (val > mx) mx = val;
      const c = lut[(val * 255) | 0], k = (y * N + x) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (now - lastTxt > 250) { lastTxt = now; $("#cam-temp").textContent = fr1(66 + Math.sin(t * .7) * 4 + Math.sin(t * 2.3)) + " °C"; $("#cam-max").textContent = "MAX " + fr1(42 + mx * 53) + " °C"; }
    raf = reduce ? 0 : requestAnimationFrame(frame);
  }
  return { start() { if (!raf) raf = requestAnimationFrame(frame); }, stop() { cancelAnimationFrame(raf); raf = 0; } };
})();

/* ============================================================
   SETUP
   ============================================================ */
$$("[data-set]").forEach(b => b.addEventListener("click", () => {
  const k = b.dataset.set; S[k] = b.dataset.v; Snd.tick();
  $$(`[data-set="${k}"]`).forEach(o => o.setAttribute("aria-pressed", o === b ? "true" : "false"));
  $("#qb-" + k).classList.add("done");
  const n = ["profile", "age", "mode"].filter(x => S[x]).length;
  $("#setup-step").textContent = `Étape ${Math.min(n + 1, 3)} / 3`;
  const ok = n === 3; $("#btn-start").disabled = !ok;
  $("#setup-hint").textContent = ok ? (S.mode === "complet" ? "50 questions · le test s'adapte à chaque réponse" : "20 questions · tu pourras affiner ensuite") : `Encore ${3 - n} réglage${3 - n > 1 ? "s" : ""}.`;
  if (!ok) { const nx = ["profile", "age", "mode"].find(x => !S[x]); $("#qb-" + nx).scrollIntoView({ behavior: "smooth", block: "center" }); }
}));
$("#btn-start").addEventListener("click", () => {
  Snd.init(); Snd.chapter();
  S.target = S.mode === "complet" ? 50 : 20;
  S.answers = []; S.xp = 0; S.combo = 0; S.badges = []; S.qual = {}; S.qualIdx = -1; S.started = Date.now();
  S.resultId = null; S.unlocked = false; S.extended = false; S.events = new Set();
  updateHUD(); show("quiz");
  nextQuestion();
});

/* ============================================================
   ADAPTIVE ENGINE
   ============================================================ */
const eligible = q => q.pr === "all" || q.pr === S.profile;
function scoreOf(q, raw) {
  if (q.t === "b") return q.sc[raw];
  if (q.t === "s") return raw / 100 * 3;
  if (q.t === "t") return raw * .75;
  return raw * 3 / (q.a.length - 1);
}
function axisStats() {
  const st = Object.fromEntries(AXES.map(a => [a.k, { n: 0, sum: 0, mean: 0 }]));
  for (const a of S.answers) { const s = st[a.ax]; s.n++; s.sum += a.s; }
  for (const k in st) st[k].mean = st[k].n ? st[k].sum / st[k].n : 0;
  return st;
}
function runningScore() {
  const st = axisStats(), on = Object.values(st).filter(s => s.n);
  return on.length ? avg(on.map(s => s.mean)) / 3 * 100 : 0;
}
const chapterCount = () => S.target >= 50 ? 5 : 4;
const chapterSize = () => S.target / chapterCount();

function pickNext() {
  const asked = new Set(S.answers.map(a => a.id));
  const n = S.answers.length, remaining = S.target - n;
  const st = axisStats(), minPer = S.target >= 50 ? 5 : 2;
  const deficit = AXES.filter(a => st[a.k].n < minPer).map(a => a.k);
  const last = S.answers[n - 1];

  // 1. a hot answer unlocks its follow-up, unless coverage is at risk
  if (last && deficit.length < remaining) {
    const lq = QM[last.id];
    if (lq.fu && last.s >= 2 && !asked.has(lq.fu) && eligible(QM[lq.fu])) return { q: QM[lq.fu], bonus: true };
  }
  const pool = ax => Q.filter(q => q.ax === ax && !q.bonus && eligible(q) && !asked.has(q.id));

  // 2. choose the axis
  let ax = null;
  const unscreened = AXES.filter(a => st[a.k].n === 0).map(a => a.k);
  if (unscreened.length) ax = S._order.find(k => unscreened.includes(k));
  else if (deficit.length >= remaining) ax = deficit.find(k => pool(k).length) || null;
  if (!ax) {
    let best = -1e9;
    for (const a of AXES) {
      const s = st[a.k]; if (!pool(a.k).length) continue;
      let w = (s.n < minPer ? 3 : 0) + (s.mean / 3) * 1.2 + 1 / (s.n + 1) + Math.random() * .8;
      if (last && last.ax === a.k) w -= 2.5;
      if (w > best) { best = w; ax = a.k; }
    }
  }
  if (!ax) { // bank exhausted on every axis: take anything left
    const any = Q.filter(q => !q.bonus && eligible(q) && !asked.has(q.id));
    return any.length ? { q: pick(any), bonus: false } : null;
  }

  // 3. choose the intensity: hot axes get harder questions to separate "bien cuit" from "carbonisé"
  const s = st[ax], target = s.n === 0 ? 1 : s.mean < 1 ? 1.6 : s.mean < 2 ? 2 : 3;
  const lastT = last ? QM[last.id].t : null;
  const cands = pool(ax).map(q => ({ q, w: Math.abs(q.lvl - target) + (q.pr !== "all" ? -.35 : 0) + (q.t === lastT && q.t !== "c" ? .6 : 0) + Math.random() * .4 }));
  cands.sort((a, b) => a.w - b.w);
  return { q: cands[0].q, bonus: false };
}

function nextQuestion() {
  if (!S._order) S._order = shuffle(AXES.map(a => a.k));
  if (S.answers.length === 0) S._order = shuffle(AXES.map(a => a.k));
  const nx = pickNext();
  if (!nx) return endOfMain();
  S.cur = nx.q; S.curBonus = nx.bonus;
  renderQuestion();
}

/* ---------- rendering ---------- */
function updateHUD() {
  const n = S.answers.length, cs = chapterSize(), cc = chapterCount();
  const inQual = S.qualIdx >= 0;
  const ch = Math.min(Math.floor(n / cs), cc - 1);
  $("#hud-chap").textContent = inQual ? "Chapitre bonus · Plan de sauvetage" : `Chapitre ${ch + 1} · ${CHAPTERS[ch]}`;
  const prog = $("#prog");
  if (prog.children.length !== cc + 1) prog.replaceChildren(...Array.from({ length: cc + 1 }, (_, i) => el("div", { class: "seg", style: i === cc ? "flex:.45" : "" }, el("i"))));
  [...prog.children].forEach((seg, i) => {
    const fill = i < cc ? clamp((n - i * cs) / cs, 0, 1) : clamp((inQual ? S.qualIdx : Object.keys(S.qual).length >= QUAL.length ? QUAL.length : 0) / QUAL.length, 0, 1);
    const bar = seg.firstChild; bar.style.width = fill * 100 + "%"; bar.style.backgroundPosition = `${(i / cc) * 100}% 0`;
  });
  const sc = runningScore(), temp = n ? tempOf(sc) : 37;
  $("#temp-v").textContent = fr1(temp);
  $("#tdot").style.color = heatCSS(sc / 100); $("#tdot").style.background = heatCSS(sc / 100);
  $("#xp-v").textContent = S.xp;
}
function bumpPill(id) { const p = $(id); p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop"); }

function renderQuestion() {
  const q = S.cur, n = S.answers.length;
  S.shownAt = performance.now(); S.busy = false;
  const meta = $("#qmeta"); meta.replaceChildren();
  if (S.curBonus) meta.append(el("span", { class: "bonuschip", html: icon("drill") + "Question bonus · on creuse" }));
  meta.append(el("span", { class: "axchip" }, "Axe · " + AX[q.ax].name));
  meta.append(el("span", { class: "qnum mono" }, `Q ${n + 1} / ${S.target}`));
  $("#qtext").textContent = q.q;
  const body = $("#qbody"); body.replaceChildren(renderBody(q, (raw, label, ev) => answer(raw, label, ev)));
  $("#btn-back").style.visibility = n > 0 ? "visible" : "hidden";
  const card = $("#qcard"); card.classList.remove("qanim-in"); void card.offsetWidth; card.classList.add("qanim-in");
  updateHUD();
}

/* generic body renderer, shared with the bonus chapter */
function renderBody(q, onPick, opts = {}) {
  const t = q.t || "c";
  const answers = opts.answers || q.a;
  if (t === "s") {
    const wrap = el("div", { class: "slider-wrap" });
    const val = el("div", { class: "slider-val mono" }, "50 %"), cmt = el("div", { class: "slider-cmt" });
    const rng = el("input", { class: "range", type: "range", min: 0, max: 100, step: 5, value: 50, id: "rng-" + q.id, "aria-label": q.q });
    const go = el("button", { class: "btn btn-hot slider-go" }, "Valider");
    const upd = () => { const v = +rng.value; val.textContent = v + " %"; val.style.color = heatCSS(v / 100); cmt.textContent = v < 15 ? "Presque tout fait main." : v < 40 ? "L'IA donne un coup de main." : v < 65 ? "Moitié-moitié, ça chauffe." : v < 90 ? "L'IA tient la plume." : "Tu signes, elle écrit."; Snd.tick(); };
    rng.addEventListener("input", upd); upd(); cmt.textContent = "Fais glisser, sois honnête.";
    go.addEventListener("click", ev => onPick(+rng.value, rng.value + " %", ev));
    wrap.append(val, cmt, rng, el("div", { class: "slider-ends" }, el("span", {}, q.lo || "0 %"), el("span", {}, q.hi || "100 %")), go);
    return wrap;
  }
  if (t === "n") {
    const g = el("div", { class: "answers", style: "grid-template-columns:repeat(auto-fit,minmax(48px,1fr))" });
    for (let i = 0; i <= 10; i++) {
      const b = el("button", { class: "ans", style: "justify-content:center;padding:14px 0;font-family:var(--f-mono);font-weight:700" }, String(i));
      b.addEventListener("click", ev => onPick(i, String(i), ev)); g.append(b);
    }
    return el("div", {}, g, el("div", { class: "slider-ends" }, el("span", {}, "0 · pas du tout"), el("span", {}, "10 · tout de suite")));
  }
  const cls = t === "b" ? "answers vs" : t === "t" ? "answers thermo5" : "answers";
  const g = el("div", { class: cls });
  answers.forEach((txt, i) => {
    if (t === "b" && i === 1) g.append(el("span", { class: "vsdot" }, "OU"));
    const heat = t === "t" ? i / 4 : t === "b" ? (q.sc ? q.sc[i] / 3 : i) : i / Math.max(1, answers.length - 1);
    const b = el("button", { class: "ans", style: `--pc:${heatCSS(heat)}` });
    if (t === "t") b.append(el("span", { class: "hb", style: `background:${heatCSS(i / 4)}` }));
    else if (t !== "b") b.append(el("span", { class: "key" }, String.fromCharCode(65 + i)));
    b.append(el("span", { class: "lbl" }, txt));
    b.addEventListener("click", ev => onPick(i, txt, ev));
    g.append(b);
  });
  return g;
}

/* keyboard: 1-9 / A-D / Enter */
document.addEventListener("keydown", e => {
  if ($("#s-quiz").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if ($(".overlay")) { if (e.key === "Enter") $(".overlay .btn")?.click(); return; }
  const btns = $$("#qbody .ans"); if (!btns.length) { if (e.key === "Enter") $("#qbody .slider-go")?.click(); return; }
  let i = -1;
  if (/^[1-9]$/.test(e.key)) i = +e.key - 1;
  else if (/^[a-dA-D]$/.test(e.key)) i = e.key.toUpperCase().charCodeAt(0) - 65;
  else if (e.key === "0" && btns.length === 11) i = 0;
  if (btns.length === 11 && /^[0-9]$/.test(e.key)) i = +e.key;
  if (i >= 0 && btns[i]) btns[i].click();
});

/* ---------- answering ---------- */
function answer(raw, label, ev) {
  if (S.busy) return; S.busy = true;
  const q = S.cur, s = scoreOf(q, raw), dt = performance.now() - S.shownAt;
  const before = S.answers.length ? tempOf(runningScore()) : 37;
  S.combo = dt < 10000 ? S.combo + 1 : 1;
  const mult = S.combo >= 6 ? 3 : S.combo >= 3 ? 2 : 1;
  const gain = 10 * mult + (S.curBonus ? 15 : 0);
  S.xp += gain;
  S.answers.push({ id: q.id, ax: q.ax, s: Math.round(s * 100) / 100, raw, lvl: q.lvl, label, bonus: S.curBonus, dt: Math.round(dt), gain });
  const after = tempOf(runningScore()), delta = after - before;

  // feedback
  const btn = ev && ev.target.closest(".ans");
  $$("#qbody .ans").forEach(b => b.classList.toggle(b === btn ? "picked" : "dim", true));
  const rect = (btn || ev?.target)?.getBoundingClientRect?.();
  if (rect) FX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, s / 3, 10 + Math.round(s * 8));
  Snd.pickS(s);
  const lvl = Math.min(3, Math.round(s));
  const rx = el("div", { class: "react" }, el("span", { class: "d" }, (delta >= 0 ? "+" : "") + fr1(delta) + " °C"), pick(REACTIONS[lvl]));
  const card = $("#qcard"), cr = card.getBoundingClientRect();
  rx.style.top = (rect ? rect.top - cr.top : 0) + "px"; card.append(rx); setTimeout(() => rx.remove(), 1200);
  const combo = $("#combo"); combo.textContent = mult > 1 ? `Combo ×${mult} · +${gain} XP` : `+${gain} XP`; combo.classList.add("on");
  bumpPill("#hud-xp"); bumpPill("#hud-temp");
  checkBadges();
  updateHUD();
  setTimeout(() => { combo.classList.remove("on"); afterAnswer(); }, 820);
}

function afterAnswer() {
  const n = S.answers.length, cs = chapterSize();
  if (n >= S.target) return endOfMain();
  if (n % cs === 0) return chapterBreak(n / cs);
  nextQuestion();
}

$("#btn-back").addEventListener("click", () => {
  if (S.busy || !S.answers.length) return;
  const a = S.answers.pop(); S.xp = Math.max(0, S.xp - a.gain); S.combo = 0;
  S.cur = QM[a.id]; S.curBonus = a.bonus; renderQuestion();
});

/* ---------- badges ---------- */
function award(id) {
  if (S.badges.includes(id)) return;
  S.badges.push(id);
  const B = BADGES.find(b => b.id === id);
  setTimeout(() => { toast("Badge débloqué", B.name, B.icon); Snd.badge(); }, 250);
  S.xp += 20;
}
function checkBadges() {
  const A = S.answers, n = A.length, last = A[n - 1];
  if (n >= 1) award("start");
  if (last.ax === "plume" && last.s === 0) award("plume0");
  if ((["k1", "ke2", "kp1", "k1f"].includes(last.id) && last.s >= 2) || (last.id === "k5" && last.s >= 3)) award("parrot");
  const l3 = A.slice(-3);
  if (l3.length === 3 && l3.every(a => a.s <= .5)) award("ice3");
  if (l3.length === 3 && l3.every(a => a.s >= 2.5)) award("fire3");
  const nb = A.filter(a => a.bonus).length;
  if (nb >= 1) award("digger"); if (nb >= 3) award("digger3");
  if (A.filter(a => a.s >= 2.99).length >= 5) award("honest");
  if (n >= S.target / 2) award("half");
  if (new Set(A.map(a => Math.round(a.s))).size >= 4) award("palette");
  const l5 = A.slice(-5); if (l5.length === 5 && l5.reduce((s, a) => s + a.dt, 0) < 20000) award("speed");
  if (A.filter(a => a.ax === "coeur" && a.s >= 2).length >= 3) award("heart");
  if (last.id === "a4" && last.s === 0) award("reader");
  const cs = chapterSize();
  if (n % cs === 0) { const ch = A.slice(-cs); if (avg(ch.map(a => a.s)) < .75) award("resist"); }
}

/* ---------- chapter break ---------- */
function overlay(card) {
  const o = el("div", { class: "overlay", role: "dialog", "aria-modal": "true" }, card);
  document.body.append(o); hydrateIcons(o);
  setTimeout(() => $(".btn", o)?.focus(), 60);
  return o;
}
function hottestHint() {
  const st = axisStats();
  const k = Object.keys(st).filter(k => st[k].n).sort((a, b) => st[b].mean - st[a].mean)[0];
  const nm = AX[k].name; return { first: nm[0], rest: nm.slice(1) };
}
function chapterBreak(done) {
  Snd.chapter(); FX.confetti(70);
  S.xp += 50; updateHUD();
  const cs = chapterSize(), chapAns = S.answers.slice(-cs);
  const temp = tempOf(runningScore());
  const h = hottestHint();
  const newB = S.badges.slice(-3);
  const next = CHAPTERS[done];
  const card = el("div", { class: "ovcard" },
    el("p", { class: "eyebrow" }, `Chapitre ${done} terminé`),
    el("h2", {}, CHAPTERS[done - 1] + " : réussi"),
    el("div", { class: "ov-stats" },
      el("div", { class: "ov-stat" }, el("div", { class: "v mono", style: `color:${heatCSS(runningScore() / 100)}` }, fr1(temp) + "°"), el("div", { class: "k" }, "Température")),
      el("div", { class: "ov-stat" }, el("div", { class: "v mono" }, "+" + (chapAns.reduce((s, a) => s + a.gain, 0) + 50)), el("div", { class: "k" }, "XP gagnés")),
      el("div", { class: "ov-stat" }, el("div", { class: "v mono" }, `${S.badges.length}/${BADGES.length}`), el("div", { class: "k" }, "Badges"))),
    el("div", { class: "ov-hint", html: `Indice : ton axe le plus chaud pour l'instant commence par <b>« ${h.first} »</b> <span class="blur-soft" style="display:inline-block" aria-hidden="true">${h.rest.replace(/./g, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)])}</span>. Il se confirmera (ou pas) dans les questions suivantes.` }),
    el("button", { class: "btn btn-hot btn-big", onclick: e => { e.target.closest(".overlay").remove(); nextQuestion(); } }, `Chapitre ${done + 1} · ${next}`, el("span", { "data-icon": "arrow" })));
  overlay(card);
}

/* ---------- end of main quiz → bonus chapter ---------- */
function endOfMain() {
  if (S.extended || Object.keys(S.qual).length >= QUAL.length) return finish();
  Snd.chapter(); FX.confetti(90); S.xp += 50; updateHUD();
  overlay(el("div", { class: "ovcard" },
    el("p", { class: "eyebrow" }, `${S.answers.length} questions · diagnostic terminé`),
    el("h2", {}, "Chapitre bonus : ton plan de sauvetage"),
    el("p", { style: "color:var(--muted);margin-top:12px" }, "Quatre questions rapides pour adapter ton plan à ta vie. Ensuite, ton rapport sort du four."),
    el("div", { class: "ov-stats" },
      el("div", { class: "ov-stat" }, el("div", { class: "v mono" }, "4"), el("div", { class: "k" }, "Questions")),
      el("div", { class: "ov-stat" }, el("div", { class: "v mono" }, "+60"), el("div", { class: "k" }, "XP")),
      el("div", { class: "ov-stat" }, el("div", { class: "v mono" }, "30 s"), el("div", { class: "k" }, "Durée"))),
    el("button", { class: "btn btn-hot btn-big", onclick: e => { e.target.closest(".overlay").remove(); S.qualIdx = 0; renderQual(); } }, "Personnaliser mon plan", el("span", { "data-icon": "arrow" }))));
}
function renderQual() {
  const Qd = QUAL[S.qualIdx]; S.busy = false;
  const answers = Qd.a ? (Array.isArray(Qd.a) ? Qd.a : Qd.a[S.profile]) : null;
  const meta = $("#qmeta"); meta.replaceChildren(
    el("span", { class: "bonuschip", html: icon("plan") + "Plan perso" }),
    el("span", { class: "qnum mono" }, `${S.qualIdx + 1} / ${QUAL.length}`));
  $("#qtext").textContent = Qd.q;
  $("#qbody").replaceChildren(renderBody({ id: Qd.id, t: Qd.t || "c", a: answers, q: Qd.q }, (raw, label, ev) => {
    if (S.busy) return; S.busy = true;
    const codes = Qd.v ? (Array.isArray(Qd.v) ? Qd.v : Qd.v[S.profile]) : null;
    S.qual[Qd.id] = codes ? codes[raw] : raw;
    const btn = ev && ev.target.closest(".ans");
    $$("#qbody .ans").forEach(b => b.classList.toggle(b === btn ? "picked" : "dim", true));
    const r = btn?.getBoundingClientRect(); if (r) FX.burst(r.left + r.width / 2, r.top + r.height / 2, .8, 14);
    Snd.pickS(2); S.xp += 15; bumpPill("#hud-xp");
    setTimeout(() => { S.qualIdx++; if (S.qualIdx >= QUAL.length) { S.qualIdx = -1; updateHUD(); finish(); } else { renderQual(); updateHUD(); } }, 520);
  }, { answers }));
  $("#btn-back").style.visibility = "hidden";
  const card = $("#qcard"); card.classList.remove("qanim-in"); void card.offsetWidth; card.classList.add("qanim-in");
  updateHUD();
}

/* ============================================================
   FINISH · cooking → gate → report
   ============================================================ */
async function finish() {
  if (S.answers.length >= 50) award("marathon");
  const R = computeReport();
  show("cook");
  Snd.whoosh();
  const steps = [
    `Analyse de tes ${S.answers.length} réponses`,
    "Calcul des 8 axes de cuisson",
    `Comparaison avec les ${PROFILES_PL[S.profile]} de ${S.age} ans`,
    "Identification de ton archétype parmi 12",
    "Rédaction de ton plan sur 21 jours",
  ];
  const ul = $("#cook-steps"); ul.replaceChildren(...steps.map(s => el("li", {}, el("span", { class: "b" }), s)));
  const save = API.post("/api/submit", payload(R)).then(d => { if (d && d.result_id) S.resultId = d.result_id; });
  const ring = $("#ring"), val = $("#cook-v"), total = 4200, t0 = performance.now();
  await new Promise(res => {
    const step = now => {
      const p = clamp((now - t0) / total, 0, 1), e = 1 - Math.pow(1 - p, 2);
      ring.style.strokeDashoffset = 276.5 * (1 - e); val.textContent = Math.round(e * 100) + " %";
      const k = Math.min(steps.length - 1, Math.floor(e * steps.length));
      [...ul.children].forEach((li, i) => { li.className = i < k ? "ok" : i === k ? "on" : ""; if (i < k) li.firstChild.innerHTML = icon("check"); });
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  [...ul.children].forEach(li => { li.className = "ok"; li.firstChild.innerHTML = icon("check"); });
  await Promise.race([save, sleep(1500)]);
  await sleep(250);
  if (S.unlocked) { renderReport(R); show("result"); FX.confetti(160); Snd.badge(); }
  else renderGate(R);
}

function payload(R) {
  return {
    result_id: S.resultId || undefined,
    profile: S.profile, age: S.age, mode: S.extended ? "complet+" : S.mode,
    n_questions: S.answers.length,
    overall: Math.round(R.overall * 10) / 10, temp: Math.round(R.temp * 10) / 10,
    level: R.level.name, archetype: R.archKey, scores: R.scores,
    answers: S.answers.map(a => ({ id: a.id, s: a.s, dt: a.dt, b: a.bonus ? 1 : 0 })),
    qual: S.qual, badges: S.badges, xp: S.xp,
    duration_s: Math.round((Date.now() - S.started) / 1000), utm,
  };
}

function renderGate(R) {
  $("#gate-level").textContent = R.level.name;
  $("#gate-temp").textContent = fr1(R.temp) + " °C";
  $("#gate-temp").style.color = heatCSS(R.overall / 100);
  $("#gate-tag").textContent = R.level.tag + " Ton rapport détaillé t'attend juste à côté.";
  $("#gate-prec").textContent = `Précision ${R.precision} % · ${S.answers.length} réponses`;
  const locked = [
    ["Ton archétype parmi 12", R.arch.name],
    ["Ta carte thermique sur 8 axes", "8 axes"],
    [`Ta place face aux ${PROFILES_PL[S.profile]}`, `Top ${100 - R.pctGroup} %`],
    ["Ton autonomie sans IA", R.autonomy],
    ["Tes binômes : allié·e et pire ennemi·e", ARCHETYPES[R.arch.ally].name],
    ["Tes 15 badges et tes réponses signature", `${S.badges.length}/15`],
    ["Ton plan sur 21 jours", "3 semaines"],
  ];
  // decoy text of the same shape: the real values never reach the DOM before the email
  const scramble = v => String(v).replace(/[A-Za-zÀ-ÿ]/g, () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]).replace(/[0-9]/g, () => Math.floor(Math.random() * 10));
  $("#gate-locked").replaceChildren(...locked.map(([k, v]) => el("li", {}, el("span", { html: icon("lock") }), el("span", {}, k), el("span", { class: "blur-soft", "aria-hidden": "true" }, scramble(v)))));
  show("gate");
  setTimeout(() => { $("#gate-mark").style.left = R.overall + "%"; }, 120);
  $("#gate-mark").style.transition = "left 1.4s cubic-bezier(.2,.8,.2,1)";
  S._R = R;
}

$("#lead-form").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#f-name").value.trim(), email = $("#f-email").value.trim();
  let ok = true;
  $("#e-name").textContent = ""; $("#e-email").textContent = "";
  if (name.length < 1) { $("#e-name").textContent = "Indique ton prénom pour personnaliser le rapport."; ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $("#e-email").textContent = "Cette adresse ne semble pas valide. Vérifie le @ et le domaine."; ok = false; }
  if (!ok) { $("#lead-form").classList.add("shake"); setTimeout(() => $("#lead-form").classList.remove("shake"), 400); return; }
  const btn = $("#btn-unlock"); btn.disabled = true; btn.lastChild.textContent = "Ouverture du rapport…";
  S.name = name; S.email = email; S.unlocked = true; S.mkt = $("#f-mkt").checked;
  const R = S._R;
  // make sure the result row exists before linking the lead
  if (!S.resultId) { const d = await API.post("/api/submit", payload(R)); if (d && d.result_id) S.resultId = d.result_id; }
  API.post("/api/lead", { result_id: S.resultId, first_name: name, email, consent_marketing: $("#f-mkt").checked, company: $("#f-company").value, utm });
  renderReport(R); show("result"); FX.confetti(180); Snd.badge();
  btn.disabled = false;
});

function track(type) {
  if (S.events.has(type)) return; S.events.add(type);
  if (S.resultId) API.post("/api/event", { result_id: S.resultId, type });
}

/* ---------- extend Express → Complet ---------- */
function extendRun() {
  S.extended = true; S.target = 50; S.mode = "complet";
  $("#prog").replaceChildren();
  show("quiz"); updateHUD(); track("extended");
  const done = Math.floor(S.answers.length / chapterSize());
  overlay(el("div", { class: "ovcard" },
    el("p", { class: "eyebrow" }, "Mode complet activé"),
    el("h2", {}, "30 questions de plus, précision +13 points"),
    el("p", { style: "color:var(--muted);margin-top:12px" }, "Tes réponses sont gardées. On creuse maintenant tes axes les plus chauds."),
    el("button", { class: "btn btn-hot btn-big", onclick: e => { e.target.closest(".overlay").remove(); nextQuestion(); } }, `Chapitre ${done + 1} · ${CHAPTERS[done]}`, el("span", { "data-icon": "arrow" }))));
}

/* ---------- sound toggle ---------- */
function soundBtn() { const b = $("#btn-sound"); b.innerHTML = icon(Snd.on ? "sound" : "mute"); b.setAttribute("aria-label", Snd.on ? "Couper le son" : "Activer le son"); }
$("#btn-sound").addEventListener("click", () => { Snd.on = !Snd.on; store.set("cc_sound", Snd.on); soundBtn(); if (Snd.on) Snd.tick(); });

/* ---------- boot ---------- */
addEventListener("DOMContentLoaded", () => {
  hydrateIcons(); soundBtn(); renderLanding(); show("land");
  $("#btn-restart-top").addEventListener("click", () => location.reload());
});
