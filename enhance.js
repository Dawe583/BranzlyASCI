/* ===== Branzly — anime.js v4 orchestrace & bklit-styl data-viz =====
   Načítá se jako ESM modul. Vše má statický fallback: když se anime.js
   nenačte nebo je zapnuté prefers-reduced-motion, sekce se vykreslí
   v cílovém stavu bez pohybu (nic se nerozbije). */

// signál pro záchrannou síť v index.html, že modul žije (nastav dřív než cokoli
// jiného — i kdyby se anime.js nenačetlo, chceme řídit odkrytí hero sami)
window.__branzlyAnim = true;

// anime.js v4 (self-contained ESM bundle z CDN); načteme dynamicky, aby
// případné selhání importu shodilo jen animace, ne celý web
let A = {};
try {
  A = await import("https://cdn.jsdelivr.net/npm/animejs@4/dist/bundles/anime.esm.min.js");
} catch (e) {
  console.warn("[branzly] anime.js se nenačetlo, degraduji na statickou podobu:", e);
}
const animate = A.animate;
const stagger = A.stagger;
const svg = A.svg;
const utils = A.utils;

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
// STATIC = nehýbat, jen vykreslit cílový stav (reduced-motion nebo chybějící anime)
const STATIC = RM || typeof animate !== "function";

/* ---------- utility ---------- */
function once(el, cb, opts) {
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) {
      if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); }
    }
  }, Object.assign({ threshold: 0.35, rootMargin: "0px 0px -8% 0px" }, opts || {}));
  io.observe(el);
}

/* ========================================================================
   1) HERO — orchestrovaný nástup + rozpad nadpisu po znacích
   ===================================================================== */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  text.split(" ").forEach((word, wi, arr) => {
    const w = document.createElement("span");
    w.className = "wd";
    [...word].forEach((c) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      w.appendChild(s);
    });
    el.appendChild(w);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
  });
}

function heroIntro() {
  const h1 = document.querySelector(".hero h1");
  if (h1 && !h1.dataset.split) { splitChars(h1); h1.dataset.split = "1"; }
  if (h1) h1.style.opacity = "1"; // kontejner odkryjeme, znaky se animují samy

  const chars = h1 ? h1.querySelectorAll(".ch") : [];
  animate(chars, {
    opacity: [0, 1], translateY: [30, 0], filter: ["blur(8px)", "blur(0px)"],
    duration: 780, delay: stagger(26, { start: 120 }), ease: "outExpo",
  });
  animate(".hero-sub", {
    opacity: [0, 1], translateY: [16, 0], filter: ["blur(8px)", "blur(0px)"],
    duration: 820, delay: 440, ease: "outExpo",
  });
  animate(".hero-cta", {
    opacity: [0, 1], translateY: [16, 0],
    duration: 820, delay: 580, ease: "outExpo",
  });
  animate("#heroVisual", {
    opacity: [0, 1], scale: [0.955, 1],
    duration: 1150, delay: 640, ease: "outExpo",
  });
}

/* ========================================================================
   2) MAGNETICKÁ TLAČÍTKA (spring dojezd)
   ===================================================================== */
function magnetic(el) {
  const strength = 0.32;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const mx = e.clientX - (r.left + r.width / 2);
    const my = e.clientY - (r.top + r.height / 2);
    animate(el, { translateX: mx * strength, translateY: my * strength, duration: 380, ease: "outExpo" });
  });
  el.addEventListener("pointerleave", () => {
    animate(el, { translateX: 0, translateY: 0, duration: 620, ease: "outElastic(1, .5)" });
  });
}

/* ========================================================================
   3) IKONY FUNKCÍ — pop při odhalení
   ===================================================================== */
function featureIcons() {
  const grid = document.querySelector(".feature-grid");
  if (!grid || STATIC) return;
  once(grid, () => {
    animate(".feature-cell .pixel-icon canvas", {
      scale: [0.72, 1], opacity: [0, 1],
      duration: 700, delay: stagger(90), ease: "outBack(1.6)",
    });
  }, { threshold: 0.2 });
}

/* ========================================================================
   4) POČÍTADLA (count-up)
   ===================================================================== */
function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || "0", 10);
  const suf = el.dataset.suf || "";
  if (isNaN(to)) return;
  if (STATIC) { el.textContent = to.toFixed(dec) + suf; return; }
  const o = { n: 0 };
  animate(o, {
    n: to, duration: 1700, ease: "outExpo",
    onUpdate: () => { el.textContent = o.n.toFixed(dec) + suf; },
  });
}

/* ========================================================================
   5) RING CHART (donut) — 80 % vyřešeno agentem
   ===================================================================== */
const RING_SEGMENTS = [
  { value: 80, color: "#3455fa" }, // vyřešeno agentem
  { value: 20, color: "#e6e6e6" }, // předáno člověku
];
function drawRing(canvas, prog) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, lw = 34, R = Math.min(W, H) / 2 - lw / 2 - 6;
  ctx.clearRect(0, 0, W, H);
  // podkladová kolejnice
  ctx.lineWidth = lw; ctx.strokeStyle = "#f0f0f0";
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // segmenty
  const total = RING_SEGMENTS.reduce((s, x) => s + x.value, 0);
  let start = -Math.PI / 2;
  const gap = 0.05;
  ctx.lineCap = "round";
  RING_SEGMENTS.forEach((seg) => {
    const frac = seg.value / total;
    const ang = frac * Math.PI * 2 * prog;
    if (ang > gap) {
      ctx.strokeStyle = seg.color; ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(cx, cy, R, start + gap / 2, start + ang - gap / 2);
      ctx.stroke();
    }
    start += frac * Math.PI * 2;
  });
  // střed
  const pct = Math.round(RING_SEGMENTS[0].value * prog);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "600 74px 'Instrument Serif', serif";
  ctx.fillText(pct + "%", cx, cy - 8);
  ctx.font = "500 22px 'Google Sans Flex', sans-serif";
  ctx.fillStyle = "#787878";
  ctx.fillText("vyřešeno agentem", cx, cy + 40);
}
function ringChart() {
  const canvas = document.getElementById("ringChart");
  if (!canvas) return;
  if (STATIC) { drawRing(canvas, 1); return; }
  drawRing(canvas, 0);
  once(canvas, () => {
    const o = { p: 0 };
    animate(o, { p: 1, duration: 1500, ease: "outExpo", onUpdate: () => drawRing(canvas, o.p) });
  });
}

/* ========================================================================
   6) LEGENDA S PROGRESS BARY (bklit LegendProgress)
   ===================================================================== */
function legendBars() {
  const items = document.querySelectorAll(".viz-legend .lg-item");
  if (!items.length) return;
  items.forEach((it) => {
    const val = parseInt(it.dataset.val || "0", 10);
    const fill = it.querySelector(".lg-fill");
    fill.style.width = val + "%";
    if (STATIC) { fill.style.transform = "scaleX(1)"; }
  });
  if (STATIC) return;
  const list = document.querySelector(".viz-legend");
  once(list, () => {
    animate(".viz-legend .lg-fill", {
      scaleX: [0, 1], duration: 1200, delay: stagger(120), ease: "outExpo",
    });
  });
}

/* ========================================================================
   7) AREA / LINE CHART — kreslená křivka (svg.createDrawable)
   ===================================================================== */
const AREA_DATA = [48, 34, 21, 12, 5, 1];
const AREA_LABELS = ["Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc"];
function buildAreaChart() {
  const el = document.getElementById("areaChart");
  if (!el) return;
  const VB_W = 620, VB_H = 200, padL = 8, padR = 8, padT = 16, padB = 22;
  const max = Math.max(...AREA_DATA);
  const innerW = VB_W - padL - padR, innerH = VB_H - padT - padB;
  const pts = AREA_DATA.map((v, i) => {
    const x = padL + (i / (AREA_DATA.length - 1)) * innerW;
    const y = padT + (1 - v / max) * innerH;
    return [x, y];
  });
  // hladká křivka (Catmull-Rom -> Bézier)
  const line = smoothPath(pts);
  const area = line + ` L ${pts[pts.length - 1][0]} ${VB_H - padB} L ${pts[0][0]} ${VB_H - padB} Z`;

  el.querySelector(".ac-line").setAttribute("d", line);
  el.querySelector(".ac-area").setAttribute("d", area);

  // vodicí linky
  const grid = el.querySelector(".ac-grid");
  grid.innerHTML = "";
  for (let g = 0; g <= 3; g++) {
    const y = padT + (g / 3) * innerH;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", padL); l.setAttribute("x2", VB_W - padR);
    l.setAttribute("y1", y); l.setAttribute("y2", y);
    l.setAttribute("class", "ac-gridline");
    grid.appendChild(l);
  }
  // body
  const dots = el.querySelector(".ac-dots");
  dots.innerHTML = "";
  pts.forEach(([x, y]) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 3.5);
    c.setAttribute("class", "ac-dot");
    dots.appendChild(c);
  });
  // osa X popisky
  const xAxis = document.getElementById("areaX");
  if (xAxis) xAxis.innerHTML = AREA_LABELS.map((l) => `<span>${l}</span>`).join("");

  if (STATIC || !svg || !svg.createDrawable) {
    // staticky – vše viditelné
    el.querySelector(".ac-area").style.opacity = "1";
    el.querySelectorAll(".ac-dot").forEach((d) => (d.style.opacity = "1"));
    return;
  }
  once(el, () => {
    animate(svg.createDrawable(".ac-line"), {
      draw: ["0 0", "0 1"], duration: 1800, ease: "inOut(3)",
    });
    animate(".ac-area", { opacity: [0, 1], duration: 1400, delay: 300, ease: "outQuad" });
    animate(".ac-dot", {
      opacity: [0, 1], scale: [0, 1],
      duration: 460, delay: stagger(230, { start: 500 }), ease: "outBack(2)",
    });
  }, { threshold: 0.3 });
}
// Catmull-Rom spline -> hladká SVG cesta
function smoothPath(p) {
  if (p.length < 2) return "";
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/* ========================================================================
   8) SCROLL-PROGRESS indikátor
   ===================================================================== */
function scrollProgress() {
  const bar = document.getElementById("scrollProg");
  if (!bar) return;
  let ticking = false;
  function update() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
    bar.style.transform = `scaleX(${p})`;
    ticking = false;
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", update);
  update();
}

/* ========================================================================
   spuštění
   ===================================================================== */
function revealStatic() {
  root.classList.remove("pre-anim");
  document.querySelectorAll(".load").forEach((el) => {
    el.style.opacity = "1"; el.style.filter = "none"; el.style.transform = "none";
  });
}

function main() {
  scrollProgress();          // funguje vždy (bez pohybu jen skočí)
  ringChart();
  legendBars();
  buildAreaChart();

  // počítadla se rozběhnou při odhalení (countUp uvnitř řeší STATIC)
  document.querySelectorAll(".stat-num[data-count]").forEach((el) => once(el, countUp));

  if (STATIC) { revealStatic(); return; }

  heroIntro();
  root.classList.remove("pre-anim");

  featureIcons();

  if (finePointer) {
    document.querySelectorAll(".hero-cta .btn").forEach(magnetic);
  }
}

try {
  main();
} catch (err) {
  console.error("[branzly enhance]", err);
  revealStatic();
}
