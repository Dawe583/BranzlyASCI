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
const onScroll = A.onScroll;
const splitText = A.splitText;
const createTimer = A.createTimer;
const utils = A.utils;

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
// STATIC = nehýbat, jen vykreslit cílový stav (reduced-motion nebo chybějící anime)
const STATIC = RM || typeof animate !== "function";
const NS = "http://www.w3.org/2000/svg";

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

/* hero exit: při odscrollování se text plynule odsune a rozostří (scrub) */
function heroExitScrub() {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const els = [...hero.querySelectorAll("h1, .hero-sub, .hero-cta")];
  let ticking = false;
  const upd = () => {
    ticking = false;
    const range = Math.max(1, hero.offsetHeight * 0.8);
    const p = Math.min(1, Math.max(0, scrollY / range));
    for (const el of els) {
      el.style.opacity = String(1 - 0.8 * p);
      el.style.filter = `blur(${(5 * p).toFixed(2)}px)`;
      el.style.transform = `translateY(${(-34 * p).toFixed(1)}px)`;
    }
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(upd); }
  }, { passive: true });
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
  if (!grid) return;
  once(grid, () => {
    animate(".feature-cell .pixel-icon canvas", {
      scale: [0.72, 1], opacity: [0, 1],
      duration: 700, delay: stagger(90), ease: "outBack(1.6)",
    });
  }, { threshold: 0.2 });
}

/* ========================================================================
   4) NADPISY SEKCÍ — splitText, slova vyjíždějí z masky
   ===================================================================== */
function headingReveals() {
  if (!splitText) return;
  document.querySelectorAll("main section h3").forEach((h) => {
    try {
      const s = splitText(h, { words: { wrap: "clip" } });
      if (!s.words || !s.words.length) return;
      h.classList.add("no-reveal");
      utils.set(s.words, { translateY: "115%", opacity: 0 }); // skrýt před triggerem
      once(h, () => {
        animate(s.words, {
          translateY: ["115%", "0%"], opacity: [0, 1],
          duration: 750, delay: stagger(55), ease: "outExpo",
        });
      }, { threshold: 0.6 });
    } catch (err) {
      console.warn("[branzly] splitText selhal, nechávám CSS reveal:", err);
    }
  });
}

/* ========================================================================
   5) PRŮSEČÍK — ruce se sbližují podle scrollu, dotek spustí vlnu
   (window.__meet.p čte shapeFn v script.js)
   ===================================================================== */
function meetScrub() {
  const vis = document.querySelector(".intersection-visual");
  const meet = window.__meet;
  if (!vis || !meet || !onScroll) return;
  meet.p = 0;
  vis.classList.add("meet-scrub");
  const st = { p: 0 };
  animate(st, {
    p: 1, ease: "linear",
    autoplay: onScroll({ target: vis, enter: "bottom top", leave: "center center", sync: true }),
    onUpdate: () => {
      meet.p = st.p;
      vis.classList.toggle("meet-touched", st.p > 0.96);
    },
  });
}

/* ========================================================================
   6) MARQUEE — rychlost a náklon reagují na rychlost scrollu (Lenis)
   ===================================================================== */
function marqueeVelocity() {
  const lenis = window.__lenis;
  const marquee = document.querySelector(".marquee");
  const track = document.getElementById("marqueeTrack");
  if (!lenis || !marquee || !track) return;
  let cssAnim = null;
  try { cssAnim = track.getAnimations()[0] || null; } catch { /* starší prohlížeč */ }
  let vel = 0;
  lenis.on("scroll", (e) => { vel = e.velocity || 0; });
  function tick() {
    const target = 1 + Math.min(2.5, Math.abs(vel) * 0.12);
    if (cssAnim) cssAnim.playbackRate += (target - cssAnim.playbackRate) * 0.08;
    const skew = Math.max(-5, Math.min(5, vel * 0.3));
    marquee.style.transform = `skewX(${skew.toFixed(2)}deg)`;
    vel *= 0.9;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ========================================================================
   7) ORBIT 2.0 — uzly skutečně obíhají, dá se roztočit, hover kreslí
   spojnici a pošle datový paket do středu
   ===================================================================== */
function orbitLive() {
  const orbit = document.querySelector(".orbit");
  if (!orbit) return;
  const nodes = [...orbit.querySelectorAll(".orbit-node")];
  if (!nodes.length) return;
  orbit.classList.add("orbit-live");

  // SVG vrstva pro spojnice a pakety
  const overlay = document.createElementNS(NS, "svg");
  overlay.setAttribute("class", "orbit-links");
  overlay.setAttribute("viewBox", "0 0 100 100");
  orbit.appendChild(overlay);

  // sudé uzly na vnějším prstenci, liché na vnitřním (protiběžně)
  const conf = nodes.map((el, i) => ({
    el,
    r: i % 2 ? 28 : 50,
    a0: (i / nodes.length) * Math.PI * 2 - Math.PI / 2,
    dir: i % 2 ? -1 : 1,
    sp: i % 2 ? 0.14 : 0.08,
    x: 50, y: 50,
  }));
  const st = { t: 0, spin: 0, vel: 0, hold: false, drag: false };

  function place() {
    for (const c of conf) {
      const a = c.a0 + st.spin + st.t * c.sp * c.dir;
      c.x = 50 + Math.cos(a) * c.r;
      c.y = 50 + Math.sin(a) * c.r;
      c.el.style.left = c.x + "%";
      c.el.style.top = c.y + "%";
    }
  }
  nodes.forEach((el) => { el.style.right = "auto"; el.style.bottom = "auto"; });
  place();

  let last = performance.now();
  createTimer({
    duration: 1e9,
    onUpdate: () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!st.hold && !st.drag) st.t += dt;
      if (!st.drag && Math.abs(st.vel) > 0.0002) {
        st.spin += st.vel * dt;
        st.vel *= Math.pow(0.15, dt); // útlum setrvačnosti
      }
      place();
    },
  });

  // roztočení tahem (flick s dojezdem)
  let lastA = 0, lastT = 0;
  const angOf = (e) => {
    const r = orbit.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  orbit.addEventListener("pointerdown", (e) => {
    st.drag = true; st.vel = 0;
    lastA = angOf(e); lastT = performance.now();
    try { orbit.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  orbit.addEventListener("pointermove", (e) => {
    if (!st.drag) return;
    const a = angOf(e);
    let d = a - lastA;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    const now = performance.now();
    st.spin += d;
    st.vel = d / Math.max(0.016, (now - lastT) / 1000);
    lastA = a; lastT = now;
    place();
  });
  const endDrag = () => {
    if (!st.drag) return;
    st.drag = false;
    st.vel = Math.max(-5, Math.min(5, st.vel));
  };
  orbit.addEventListener("pointerup", endDrag);
  orbit.addEventListener("pointercancel", endDrag);
  orbit.addEventListener("pointerleave", endDrag);

  // hover uzlu: spojnice do středu + datový paket + pulz loga
  conf.forEach((c) => {
    let path = null, packet = null;
    c.el.addEventListener("pointerenter", () => {
      st.hold = true;
      path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M ${c.x} ${c.y} L 50 50`);
      path.setAttribute("class", "orbit-link");
      overlay.appendChild(path);
      packet = document.createElementNS(NS, "circle");
      packet.setAttribute("class", "orbit-packet");
      packet.setAttribute("r", "1.4");
      packet.setAttribute("cx", c.x);
      packet.setAttribute("cy", c.y);
      overlay.appendChild(packet);
      animate(svg.createDrawable(path), { draw: ["0 0", "0 1"], duration: 400, ease: "outQuad" });
      const pos = { x: c.x, y: c.y };
      const pk = packet;
      animate(pos, {
        x: 50, y: 50, duration: 650, delay: 150, ease: "inOutQuad",
        onUpdate: () => { pk.setAttribute("cx", pos.x); pk.setAttribute("cy", pos.y); },
        onComplete: () => {
          pk.setAttribute("opacity", "0");
          animate(".orbit-center svg", { scale: [1, 1.25, 1], duration: 520, ease: "outBack(2)" });
        },
      });
    });
    c.el.addEventListener("pointerleave", () => {
      st.hold = false;
      const p = path, pk = packet;
      path = null; packet = null;
      if (p) animate(p, { opacity: 0, duration: 220, ease: "linear", onComplete: () => p.remove() });
      if (pk) pk.remove();
    });
  });
}

/* ========================================================================
   8) POČÍTADLA (count-up)
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
   9) CENÍK — count-up cen, stagger položek, kreslená linka fází
   ===================================================================== */
function tierEnhance() {
  document.querySelectorAll(".tier-row").forEach((row) => {
    // cena: zabalit číslo do spanu a počítat při odhalení
    const priceEl = row.querySelector(".tier-price");
    let numSpan = null, target = 0;
    if (priceEl && priceEl.firstChild && priceEl.firstChild.nodeType === 3) {
      const txt = priceEl.firstChild.textContent;
      const num = parseInt(txt.replace(/\D/g, ""), 10);
      if (num) {
        target = num;
        numSpan = document.createElement("span");
        numSpan.textContent = "0";
        const suffix = txt.replace(/[\d\s ]+/, ""); // "Kč"
        priceEl.insertBefore(numSpan, priceEl.firstChild);
        priceEl.firstChild.nextSibling.textContent = " " + suffix;
      }
    }
    const items = row.querySelectorAll(".tier-list li");
    once(row, () => {
      if (numSpan) {
        const o = { n: 0 };
        animate(o, {
          n: target, duration: 1400, ease: "outExpo",
          onUpdate: () => { numSpan.textContent = Math.round(o.n).toLocaleString("cs-CZ"); },
        });
      }
      if (items.length) {
        animate(items, {
          opacity: [0, 1], translateX: [-14, 0],
          duration: 550, delay: stagger(80, { start: 200 }), ease: "outQuad",
        });
      }
    }, { threshold: 0.35 });
    items.forEach((li) => { li.style.opacity = "0"; });
  });

  // svislá linka spojující fáze — dokresluje se podle scrollu
  const stack = document.querySelector(".tier-stack");
  if (stack && onScroll && svg && matchMedia("(min-width: 901px)").matches) {
    const line = document.createElementNS(NS, "svg");
    line.setAttribute("class", "tier-line");
    line.setAttribute("viewBox", "0 0 100 100");
    line.setAttribute("preserveAspectRatio", "none");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M 50 0 L 50 100");
    p.setAttribute("vector-effect", "non-scaling-stroke");
    line.appendChild(p);
    stack.appendChild(line);
    animate(svg.createDrawable(p), {
      draw: ["0 0", "0 1"], ease: "linear",
      autoplay: onScroll({ target: stack, enter: "bottom top", leave: "center bottom", sync: true }),
    });
  }
}

/* ========================================================================
   10) RING CHART (donut) — parametrizovaný pro propojení s legendou
   ===================================================================== */
function drawRing(canvas, prog, val = 80, label = "vyřešeno agentem") {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, lw = 34, R = Math.min(W, H) / 2 - lw / 2 - 6;
  ctx.clearRect(0, 0, W, H);
  // podkladová kolejnice
  ctx.lineWidth = lw; ctx.strokeStyle = "#f0f0f0";
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // segmenty
  const segs = [
    { value: val, color: "#3455fa" },
    { value: 100 - val, color: "#e6e6e6" },
  ];
  let start = -Math.PI / 2;
  const gap = 0.05;
  ctx.lineCap = "round";
  segs.forEach((seg) => {
    const frac = seg.value / 100;
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
  const pct = Math.round(val * prog);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "600 74px 'Instrument Serif', serif";
  ctx.fillText(pct + "%", cx, cy - 8);
  ctx.font = "500 22px 'Google Sans Flex', sans-serif";
  ctx.fillStyle = "#787878";
  ctx.fillText(label, cx, cy + 40);
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
/* hover na položku legendy překreslí prstenec na její hodnotu */
function legendRingLink() {
  const canvas = document.getElementById("ringChart");
  const list = document.querySelector(".viz-legend");
  if (!canvas || !list || STATIC || !finePointer) return;
  const cur = { v: 80 };
  const to = (val, label) => {
    animate(cur, {
      v: val, duration: 550, ease: "outExpo",
      onUpdate: () => drawRing(canvas, 1, cur.v, label),
    });
  };
  list.querySelectorAll(".lg-item").forEach((it) => {
    const val = parseInt(it.dataset.val || "0", 10);
    const name = (it.querySelector(".lg-label") || {}).textContent || "";
    it.addEventListener("pointerenter", () => to(val, name.toLowerCase()));
  });
  list.addEventListener("pointerleave", () => to(80, "vyřešeno agentem"));
}

/* ========================================================================
   11) LEGENDA S PROGRESS BARY (bklit LegendProgress)
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
   12) AREA / LINE CHART — křivka se kreslí podle scrollu (scrub)
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
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", padL); l.setAttribute("x2", VB_W - padR);
    l.setAttribute("y1", y); l.setAttribute("y2", y);
    l.setAttribute("class", "ac-gridline");
    grid.appendChild(l);
  }
  // body
  const dots = el.querySelector(".ac-dots");
  dots.innerHTML = "";
  pts.forEach(([x, y]) => {
    const c = document.createElementNS(NS, "circle");
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
  const wrap = el.closest(".area-wrap") || el;
  if (onScroll) {
    // kreslení křivky svázané přímo s pozicí scrollu
    animate(svg.createDrawable(".ac-line"), {
      draw: ["0 0", "0 1"], ease: "linear",
      autoplay: onScroll({ target: wrap, enter: "bottom top", leave: "center center", sync: true }),
    });
    once(el, () => {
      animate(".ac-area", { opacity: [0, 1], duration: 1200, delay: 150, ease: "outQuad" });
      animate(".ac-dot", {
        opacity: [0, 1], scale: [0, 1],
        duration: 460, delay: stagger(200, { start: 300 }), ease: "outBack(2)",
      });
    }, { threshold: 0.25 });
  } else {
    once(el, () => {
      animate(svg.createDrawable(".ac-line"), { draw: ["0 0", "0 1"], duration: 1800, ease: "inOut(3)" });
      animate(".ac-area", { opacity: [0, 1], duration: 1400, delay: 300, ease: "outQuad" });
      animate(".ac-dot", {
        opacity: [0, 1], scale: [0, 1],
        duration: 460, delay: stagger(230, { start: 500 }), ease: "outBack(2)",
      });
    }, { threshold: 0.3 });
  }
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
   13) KALENDÁŘ — dny naskočí gridem od středu (i po přepnutí měsíce)
   ===================================================================== */
function calendarStagger() {
  const cal = document.getElementById("calendar");
  if (!cal) return;
  const run = () => {
    const days = cal.querySelectorAll(".cal-day");
    if (!days.length) return;
    animate(days, {
      opacity: [0, 1], scale: [0.55, 1],
      duration: 420, ease: "outBack(1.7)",
      delay: stagger(13, { grid: [7, Math.ceil(days.length / 7)], from: "center" }),
    });
  };
  cal.addEventListener("branzly:cal", run);
  once(cal, run, { threshold: 0.3 });
}

/* ========================================================================
   14) FAQ — obsah odpovědi jemně naskočí při rozbalení
   ===================================================================== */
function faqPop() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      const p = item.querySelector(".faq-body p");
      if (p) animate(p, { opacity: [0, 1], translateY: [-8, 0], duration: 460, delay: 100, ease: "outQuad" });
    });
  });
}

/* ========================================================================
   15) KARTY PŘÍPADOVEK — 3D tilt za kurzorem
   ===================================================================== */
function caseTilt() {
  const cards = document.querySelectorAll(".case");
  if (!cards.length) return;
  cards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -3.5;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 4.5;
      animate(card, { rotateX: rx, rotateY: ry, duration: 300, ease: "outQuad" });
    });
    card.addEventListener("pointerleave", () => {
      animate(card, { rotateX: 0, rotateY: 0, duration: 650, ease: "outExpo" });
    });
  });
  const grid = document.querySelector(".case-grid");
  if (grid) grid.style.perspective = "900px";
}

/* ========================================================================
   16) STAT DLAŽDICE — glow sledující kurzor
   ===================================================================== */
function statGlow() {
  document.querySelectorAll(".stat-tile").forEach((tile) => {
    tile.addEventListener("pointermove", (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      tile.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  });
}

/* ========================================================================
   17) SCROLL-PROGRESS indikátor
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

  // JS orchestrace přebírá řízení: CSS load-in animace vypnout, aby
  // fill:forwards nepřebíjelo inline styly (kaskáda animací > inline)
  root.classList.add("anim-live");
  heroIntro();
  root.classList.remove("pre-anim");
  setTimeout(heroExitScrub, 1600); // až po dojetí intra, ať se animace neperou

  featureIcons();
  headingReveals();
  meetScrub();
  marqueeVelocity();
  orbitLive();
  tierEnhance();
  calendarStagger();
  faqPop();
  legendRingLink();

  if (finePointer) {
    document.querySelectorAll(".btn").forEach(magnetic);
    caseTilt();
    statGlow();
  }
}

try {
  main();
} catch (err) {
  console.error("[branzly enhance]", err);
  revealStatic();
}
