/* 대학촌 06-journey — F. One Bottle Journey
   One master progress P (0..1, from Lenis/native scroll) drives every 3D state through world.render(P, t)
   and every chapter overlay through updateDOM(P). ScrollTrigger is used only for the footer reveal.
   QA: window.__journey = { setP(p), P, morph, fps, calls }, window.__loader, ?p=0.35, ?noloader=1, ?nomotion=1 */
import { createWorld } from './world.js';
import { splitText, createDirectionalBlur } from '../shared/kinetic.js';
import { CHAPTERS, NODES, CERTS, PRODUCTS, chapterAt, smooth, snap, range, clamp01, damp, darkAt } from './chapters.js';

const { gsap, ScrollTrigger, Lenis } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const RM = false;   // OS '모션 줄이기'와 상관없이 모션을 보인다(10/15 결정) — 정적 확인은 ?nomotion=1
const MOTION = !(RM || params.get('nomotion') === '1');
const MOBILE = matchMedia('(max-width: 900px)').matches;
const PFIX = params.has('p') ? clamp01(parseFloat(params.get('p')) || 0) : null;
const NOLOADER = params.get('noloader') === '1' || PFIX !== null || !MOTION;
const S = MOTION ? smooth : snap;

gsap.registerPlugin(ScrollTrigger);
if (!MOTION) document.documentElement.classList.add('nomotion');

/* ───────── scroll → P ───────── */
const scrollEl = $('#scroll'), ft = $('#ft');
let rangePx = 1, ftH = 1, frozenP = PFIX;
const measure = () => { rangePx = Math.max(1, scrollEl.offsetHeight - innerHeight); ftH = ft.offsetHeight; };
measure();

let lenis = null;
if (MOTION && Lenis && innerWidth > 768) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollY_ = () => (lenis ? lenis.animatedScroll : window.scrollY);
const currentP = () => (frozenP !== null ? frozenP : clamp01(scrollY_() / rangePx));
function scrollToP(p, immediate = false) {
  const y = clamp01(p) * rangePx;
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.8, force: true });
  else window.scrollTo({ top: y, behavior: immediate || !MOTION ? 'auto' : 'smooth' });
}
if (!lenis && document.body.classList.contains('is-loading')) document.body.style.overflow = 'hidden';

/* ───────── i18n (KR / EN switch the whole page) ───────── */
let lang = 'ko';
const i18nEls = $$('[data-en]');
i18nEls.forEach((el) => { el.dataset.ko = el.innerHTML; });

/* ───────── world ───────── */
const world = createWorld({ canvas: $('#gl'), canvasFront: $('#glFront'), mobile: MOBILE, motion: MOTION });

/* labels that follow 3D objects (positions written by world.render) */
const tileWrap = $('#tileLabels'), nodeWrap = $('#nodeLabels');
const tileEls = CERTS.map((c, i) => {
  const el = document.createElement('div');
  const r = Math.floor(i / 4), col = i % 4;
  el.className = 'tlabel ' + ((r + col) % 2 === 0 ? 'is-light' : 'is-dark');
  tileWrap.appendChild(el);
  return el;
});
const nodeEls = NODES.map(() => { const el = document.createElement('div'); el.className = 'nlabel'; nodeWrap.appendChild(el); return el; });
const yearList = $('#yearList');
const yearItems = NODES.map(() => { const li = document.createElement('li'); yearList.appendChild(li); return li; });
world.bindLabels(tileEls, nodeEls, (i) => openPanel(i));

function renderDynamicText() {
  CERTS.forEach((c, i) => {
    const t = typeof c.t === 'string' ? c.t : c.t[lang];
    const sub = c[lang];
    tileEls[i].innerHTML = `<b>${t}</b>${sub ? `<small>${sub}</small>` : ''}`;
  });
  NODES.forEach((n, i) => {
    nodeEls[i].innerHTML = `<b>${n.y}</b><small>${lang === 'en' ? n.en : n.ko}</small>`;
    yearItems[i].innerHTML = `<b>${n.y}</b><span>${lang === 'en' ? n.den : n.dko}</span>`;
  });
  shownNode = -1;
  if (panelIndex >= 0) fillPanel(panelIndex);
}

/* ───────── hero kinetic type ───────── */
const heroLines = $$('#heroH1 .ln');
const blurs = heroLines.map(() => createDirectionalBlur());
let heroSplit = [];
function splitHero() { heroSplit = heroLines.map((el) => splitText(el, { by: 'char' }).chars); }
splitHero();
const heroState = { o: NOLOADER ? 1 : 0 };
function heroIntro() {
  if (!MOTION) { heroState.o = 1; return; }
  gsap.to(heroState, { o: 1, duration: 0.6, ease: 'power2.out' });
  heroLines.forEach((line, i) => {
    const chars = heroSplit[i], blur = blurs[i], st = { b: 46 };
    line.style.filter = blur.url;
    gsap.fromTo(chars, { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 1.25, ease: 'power4.out', stagger: 0.035, delay: 0.25 + i * 0.18 });
    gsap.to(st, { b: 0, duration: 1.4, ease: 'power3.out', delay: 0.25 + i * 0.18, onUpdate: () => blur.set(st.b, 0), onComplete: () => { line.style.filter = ''; } });
  });
  gsap.from('.hero .kicker, .hero__sub, .hero__cta, .hero-foot', { y: 24, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.75, clearProps: 'transform,opacity' });
}

function setLang(next) {
  lang = next;
  document.documentElement.lang = next === 'en' ? 'en' : 'ko';
  i18nEls.forEach((el) => { el.innerHTML = el.dataset[next] || el.dataset.ko; });
  heroLines.forEach((el) => { el.style.filter = ''; });
  splitHero();
  $$('.lang [data-lang]').forEach((b) => b.classList.toggle('is-on', b.dataset.lang === next));
  renderDynamicText();
  requestRender();
}
$$('.lang [data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

/* ───────── product panel ───────── */
const panel = $('#panel');
let panelIndex = -1;
function fillPanel(i) {
  const p = PRODUCTS[i];
  $('#pdCat').textContent = p.cat.en;
  $('#pdName').textContent = p.name[lang];
  $('#pdEn').textContent = lang === 'en' ? p.sub : p.name.en;
  $('#pdLine').textContent = p.line[lang];
  $('#pdSpec').textContent = p.spec[lang];
}
function openPanel(i) {
  panelIndex = i;
  fillPanel(i);
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
}
function closePanel() {
  panelIndex = -1;
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
}
$('#panelClose').addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

/* ───────── rail + in-page buttons ───────── */
const rail = $('#rail');
const RAIL_P = { hero: 0, pour: 0.15, morph: 0.25, factory: 0.52, cert: 0.68, years: 0.75, products: 0.89, contact: 1 };
const railBtns = CHAPTERS.map((c) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<i></i><span>${c.name}</span>`;
  b.setAttribute('aria-label', c.name);
  b.addEventListener('click', () => scrollToP(RAIL_P[c.id]));
  rail.appendChild(b);
  return b;
});
$$('.hero__cta, .hd .btn--sm, .products__btns .btn--fill, .panel__btns .btn--line').forEach((b) => b.addEventListener('click', () => { closePanel(); scrollToP(1); }));
$('#toTop').addEventListener('click', () => scrollToP(0));
$('#form').addEventListener('submit', (e) => e.preventDefault());

/* ───────── chapter overlays from P ───────── */
const chEls = {};
$$('.ch[data-ch]').forEach((el) => { (chEls[el.dataset.ch] = chEls[el.dataset.ch] || []).push(el); });
const WIN = {
  hero: [-1, -1, 0.05, 0.095],
  pour: [0.135, 0.16, 0.195, 0.215],
  morph: [0.232, 0.258, 0.438, 0.458],
  factory: [0.475, 0.5, 0.595, 0.615],
  cert: [0.632, 0.652, 0.705, 0.72],
  years: [0.735, 0.752, 0.828, 0.842],
  products: [0.858, 0.874, 0.936, 0.95],
  contact: [0.955, 0.978, 2, 3],
};
const mcards = $$('.mcard'), mbars = $$('.mcards__bar li');
const fnums = $$('#fnums li');
const originWord = $('#originWord');
const yearBig = $('#yearBig'), yearTitle = $('#yearTitle');
let shownNode = -1, lastVars = '', lastRail = -1;
const fxEls = [$('#bg'), ...$$('.fx')];
const hd = $('#hd');
let lastReveal = -1;
const C_INK = [26, 15, 8], C_IV = [255, 246, 233], C_AMBER = [176, 82, 22];
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// writes a style only when it changed — the overlay loop runs every frame
const styleCache = new WeakMap();
function css(el, prop, val) {
  let c = styleCache.get(el);
  if (!c) styleCache.set(el, (c = {}));
  if (c[prop] === val) return;
  c[prop] = val;
  if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
}
// ivory → amber → dark brown: the page "fills" like the liquid instead of passing through grey
const bgAt = (d) => (d < 0.5 ? mixc(C_IV, C_AMBER, d * 2) : mixc(C_AMBER, C_INK, d * 2 - 1));

function updateDOM(P) {
  // page colours follow the chapter darkness
  const dark = darkAt(P, S);
  const bg = bgAt(dark), fg = mixc(C_INK, C_IV, smooth(0.22, 0.42, dark));
  const vars = `${bg}|${fg}`;
  if (vars !== lastVars) {
    lastVars = vars;
    const r = document.documentElement.style;
    r.setProperty('--bg', `rgb(${bg})`);
    r.setProperty('--fg', `rgb(${fg})`);
    r.setProperty('--fg2', `rgba(${fg},.64)`);
    r.setProperty('--line', `rgba(${fg},.18)`);
  }

  for (const id in WIN) {
    const [a, b, c, d] = WIN[id];
    let o = (a < 0 ? 1 : S(a, b, P)) * (1 - S(c, d, P));
    if (id === 'hero') o *= heroState.o;
    const y = o >= 1 ? 0 : P < (b + c) / 2 ? (1 - o) * 40 : -(1 - o) * 40;
    for (const el of chEls[id]) {
      css(el, 'opacity', o.toFixed(3));
      css(el, 'visibility', o > 0.002 ? 'visible' : 'hidden');
      css(el, 'transform', MOTION && y ? `translate3d(0, ${y.toFixed(1)}px, 0)` : '');
    }
  }

  // ORIGIN — three cards follow the three bodies, outline word drifts
  const mi = P < 0.295 ? 0 : P < 0.395 ? 1 : 2;
  mcards.forEach((el, i) => el.classList.toggle('is-on', i === mi));
  const segs = [[0.24, 0.295], [0.295, 0.395], [0.395, 0.455]];
  mbars.forEach((li, i) => css(li.firstElementChild, '--f', range(segs[i][0], segs[i][1], P).toFixed(3)));
  const ow = S(0.23, 0.26, P) * (1 - S(0.44, 0.47, P));
  css(originWord, 'opacity', ow.toFixed(3));
  css(originWord, 'visibility', ow > 0.002 ? 'visible' : 'hidden');
  if (ow > 0.002) css(originWord, 'transform', `translate3d(${(-range(0.2, 0.48, P) * 60).toFixed(2)}vw, -50%, 0)`);

  // FACTORY numbers one by one
  [0.5, 0.53, 0.56].forEach((p, i) => fnums[i].classList.toggle('is-on', P >= p));

  // 30 YEARS — current node
  const node = world.state.node;
  if (node !== shownNode) {
    shownNode = node;
    const n = NODES[node];
    yearBig.textContent = String(n.y);
    yearTitle.textContent = lang === 'en' ? n.den : n.dko;
    yearItems.forEach((li, i) => li.classList.toggle('is-on', i === node));
    if (MOTION) gsap.fromTo([yearBig, yearTitle], { yPercent: 18, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true });
  }

  // products panel only lives in its chapter
  if (panelIndex >= 0 && (P < 0.85 || P > 0.95)) closePanel();

  // rail
  const ci = CHAPTERS.indexOf(chapterAt(P));
  if (ci !== lastRail) { lastRail = ci; railBtns.forEach((b, i) => b.classList.toggle('is-on', i === ci)); }

  // footer reveal: the fixed stack slides up with the last scroll px
  const reveal = frozenP !== null ? 0 : Math.max(0, Math.min(ftH, scrollY_() - rangePx));
  if (Math.abs(reveal - lastReveal) > 0.5) {
    lastReveal = reveal;
    const tr = reveal > 0 ? `translate3d(0, ${(-reveal).toFixed(1)}px, 0)` : '';
    fxEls.forEach((el) => { el.style.transform = tr; });
    // the header leaves with the page instead of colliding with the sliding content
    hd.style.transition = reveal > 0 ? 'none' : '';
    hd.style.transform = tr;
    hd.style.opacity = reveal > 0 ? String(Math.max(0, 1 - reveal / 140)) : '';
  }
}

/* ───────── custom cursor ───────── */
const cursor = $('#cursor'), cDot = $('.cursor__dot'), cRing = $('.cursor__ring'), cLabel = $('#cursorLabel');
const cur = { x: -100, y: -100, rx: -100, ry: -100, over: false, label: '' };
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (FINE) {
  document.body.classList.add('has-cursor');
  window.addEventListener('pointermove', (e) => {
    cur.x = e.clientX; cur.y = e.clientY;
    cur.over = !!e.target.closest('button, input, textarea, label, .panel, .hd');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
}
function updateCursor(dt) {
  if (!FINE) return;
  cur.rx = MOTION ? damp(cur.rx, cur.x, 12, dt) : cur.x;
  cur.ry = MOTION ? damp(cur.ry, cur.y, 12, dt) : cur.y;
  cDot.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
  cRing.style.transform = `translate3d(${cur.rx.toFixed(1)}px, ${cur.ry.toFixed(1)}px, 0)`;
  const label = cur.over ? '' : world.state.cursor;
  if (label !== cur.label) {
    cur.label = label;
    cLabel.textContent = label;
    cursor.classList.toggle('is-label', !!label);
  }
}

/* ───────── loop ───────── */
let last = performance.now(), fps = 60, loaderShown = 0, loaderTarget = 0, loading = !NOLOADER;
const loaderNum = $('#loaderNum'), loaderBar = $('#loaderBar');
function frame() {
  const now = performance.now();
  const raw = (now - last) / 1000, dt = Math.min(0.1, raw);
  last = now;
  if (document.hidden) return;                       // tab hidden → nothing renders
  if (raw > 0) fps = fps * 0.94 + Math.min(240, 1 / raw) * 0.06;
  if (loading) {
    loaderShown = damp(loaderShown, loaderTarget, 5, dt);
    world.state.fill = loaderShown;
    const pct = Math.min(100, Math.floor(loaderShown * 100 + 0.001));
    loaderNum.textContent = String(pct);
    loaderBar.style.transform = `scaleX(${loaderShown.toFixed(4)})`;
  }
  const P = currentP();
  world.render(P, now / 1000, dt);
  updateDOM(P);
  updateCursor(dt);
  adapt(dt);
}

/* adaptive quality: a GPU that cannot hold ~50fps for 2.5s steps down (DPR, then particle subset).
   Never steps back up (no oscillation); off under automation and with ?quality=full. */
let qLevel = 0, slowT = 0;
const ADAPT = MOTION && !navigator.webdriver && params.get('quality') !== 'full';
function adapt(dt) {
  if (!ADAPT || loading || world.state.intro < 1 || qLevel >= 2) return;
  slowT = fps < 50 ? slowT + dt : Math.max(0, slowT - dt * 0.5);
  if (slowT > 2.5) { qLevel = world.setQuality(qLevel + 1); slowT = 0; fps = 60; }
}
let rq = 0;
function requestRender() {
  if (MOTION || rq) return;
  rq = requestAnimationFrame(() => { rq = 0; frame(); });
}
if (MOTION) gsap.ticker.add(frame);
else {
  ['scroll', 'resize', 'pointermove'].forEach((ev) => window.addEventListener(ev, requestRender, { passive: true }));
}

/* ───────── resize ───────── */
let rz = 0;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { world.layout(); measure(); ScrollTrigger.refresh(); if (frozenP !== null) scrollToP(frozenP, true); requestRender(); }, 120);
});

/* ───────── footer reveal content (ScrollTrigger, DOM only) ───────── */
if (MOTION) {
  gsap.from('.ft__top > *, .ft__info, .ft__bot', {
    y: 36, opacity: 0, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: scrollEl, start: 'bottom bottom', end: () => '+=' + ftH, scrub: true },
  });
}

/* ───────── QA hooks ───────── */
window.__loader = { progress: 0, done: false, skipped: NOLOADER };
window.__journey = {
  setP(p) {
    frozenP = clamp01(+p || 0);
    scrollToP(frozenP, true);
    const now = performance.now();
    world.render(frozenP, now / 1000, 1 / 60);
    updateDOM(frozenP);
    return frozenP;
  },
  unfreeze() { frozenP = null; },
  get P() { return currentP(); },
  get morph() { return world.morph; },
  get fps() { return Math.round(fps); },
  get calls() { return world.state.calls; },
  get ready() { return world.state.ready; },
  get world() { return world; },
  get quality() { return qLevel; },
  setQuality(q) { qLevel = world.setQuality(q); return qLevel; },
  setLang,
};

/* ───────── boot ───────── */
renderDynamicText();
(async () => {
  if (NOLOADER) { world.state.intro = 1; world.state.fill = 1; $('#loader').classList.add('is-done'); }
  else {
    const copy = $('.loader__copy');
    const { chars } = splitText(copy, { by: 'char' });
    if (MOTION) gsap.from(chars, { y: 14, opacity: 0, duration: 0.8, stagger: 0.03, ease: 'power3.out', delay: 0.2 });
  }
  await world.boot();
  requestRender();
  try {
    await world.load((p) => { loaderTarget = p; window.__loader.progress = +p.toFixed(3); });
  } catch (err) {
    console.warn('[06-journey] some assets failed to load', err);
  }
  window.__loader.progress = 1;
  window.__loader.done = true;
  loaderTarget = 1;
  measure();
  ScrollTrigger.refresh();

  const lift = () => {
    loading = false;
    world.state.fill = 1;
    $('#loader').classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.style.overflow = '';
    if (frozenP !== null) scrollToP(frozenP, true);
    if (NOLOADER) { world.state.intro = 1; heroState.o = 1; if (lenis && frozenP === null) lenis.start(); requestRender(); return; }
    // particles leave the CI and swirl into the hero ring; the bottle rises; type lands
    gsap.to(world.state, { intro: 1, duration: 2.4, ease: 'power2.inOut' });
    heroIntro();
    setTimeout(() => { if (lenis) lenis.start(); }, 900);
  };
  if (NOLOADER) lift();
  else {
    // let the counter reach 100 before the particles scatter
    const wait = () => (loaderShown > 0.995 ? setTimeout(lift, 380) : requestAnimationFrame(wait));
    wait();
  }
})();
