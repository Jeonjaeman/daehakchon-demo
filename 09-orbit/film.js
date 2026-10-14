/* 대학촌 I안 — 03 C안 브랜드 필름 엔진. 03-film/main.js 앞부분(필름 엔진)을 그대로 옮긴 생성물(_compose/compose.py) — 직접 고치지 말 것.
   바꾼 곳은 [조합] 주석: id, 프리로더·헤더 색 없음, 보일 때부터 재생. */
/* 대학촌 demo 03 — brand film (text-free footage + live DOM type, KR/EN) + corporate sections */
import { splitText, hangulTypingSteps, createDirectionalBlur } from '../shared/kinetic.js';

const { gsap, ScrollTrigger } = window;
const HAS_GSAP = !!(gsap && ScrollTrigger);
const root = document.documentElement;

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pad2 = (n) => String(n).padStart(2, '0');

const qs = new URLSearchParams(location.search);
const QA_T = qs.has('t') ? Math.max(0, parseFloat(qs.get('t')) || 0) : null;   // ?t=12.5 → film frozen at 12.5s, no leader
const REDUCED = false;   // OS '모션 줄이기'와 상관없이 모션을 보인다(10/15 결정) — 정적 확인은 ?nomotion=1
const NOMOTION = REDUCED || qs.get('nomotion') === '1' || !HAS_GSAP;          // no pins, no Lenis, no scroll motion
const STATIC_FILM = !HAS_GSAP || (NOMOTION && QA_T === null);                  // film = one still frame (scenes 11–13)
const mqMobile = matchMedia('(max-width: 900px)');

if (NOMOTION) root.classList.remove('mo');
if (HAS_GSAP) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/* ════════════════════════════════════════════════════════════════ FILM ENGINE */

const DUR = 27.6;
/* one row per scene: start time, act, header tone, background plates (video offsets in `off`), shared type stage in `el` */
const SC = [
  { n: 1, t: 0.0, act: 1, tone: 'dark', bg: ['f1'] },
  { n: 2, t: 1.6, act: 1, tone: 'dark', bg: ['f2'] },
  { n: 3, t: 3.2, act: 1, tone: 'dark', bg: ['f3'] },
  { n: 4, t: 5.0, act: 2, tone: 'dark', bg: ['f4'] },
  { n: 5, t: 7.2, act: 2, tone: 'dark', bg: ['p5'] },
  { n: 6, t: 9.0, act: 3, tone: 'dark', bg: ['h1'], off: { h1: 0.6 } },
  { n: 7, t: 10.8, act: 3, tone: 'dark', bg: ['h1'], el: 6 },
  { n: 8, t: 12.8, act: 3, tone: 'dark', bg: ['y2'] },
  { n: 9, t: 15.0, act: 4, tone: 'dark', bg: ['f5'] },
  { n: 10, t: 17.2, act: 4, tone: 'dark', bg: ['f6'] },
  { n: 11, t: 19.6, act: 5, tone: 'dark', bg: ['f7'] },
  { n: 12, t: 21.4, act: 5, tone: 'dark', bg: ['f7'], el: 11 },
  { n: 13, t: 24.0, act: 5, tone: 'light', bg: ['light'], tones: [[DUR - 0.2 - 24.0, 'dark']] },    // the orange iris takes the header back to white
];
SC.forEach((s, i) => {
  s.t1 = SC[i + 1] ? SC[i + 1].t : DUR;
  s.el = s.el || s.n;
  s.ref = {};                                   // where each plate's video should be at scene start (continues across scenes that share it)
  s.bg.forEach((k) => {
    const p = SC[i - 1];
    s.ref[k] = p && p.bg.includes(k) ? p.ref[k] : { t: s.t, off: (s.off && s.off[k]) || 0, rate: (s.rate && s.rate[k]) || 1 };
  });
});
const ACTS = [1, 2, 3, 4, 5].map((a) => {
  const mine = SC.filter((s) => s.act === a);
  return { t0: mine[0].t, t1: mine[mine.length - 1].t1, p: -1 };
});

const film = $('#bfilm');                         // [조합] 01 제품 필름(#film)과 겹치지 않게
const typeLayer = $('#filmType');
const stillEl = $('#filmStill');
const TEMPLATE = typeLayer.innerHTML;
const STILL_TEMPLATE = stillEl.innerHTML;
const hd = $('#hd');
const pre = $('#pre') || document.createElement('div');   // [조합] 박스에는 프리로더(필름 리더)가 없다
const BG = {};
$$('[data-bg]', film).forEach((el) => {
  BG[el.dataset.bg] = { el, vids: el.tagName === 'VIDEO' ? [el] : [], on: false };
});
const actBtns = $$('.act', film);
const actFills = actBtns.map((b) => $('b', b));
const tcEl = $('#tc');
const pp = $('#pp');

let lang = qs.get('lang') === 'en' ? 'en' : 'ko';
let tl = null, ctx = null, scEls = [], cur = -1, lastT = -1, lastSec = -1;
let blurTracks = [], typeTrack = null, countTrack = null;
const blurPool = [];
let blurN = 0;
const marks = [];                                // times at which each scene's type has fully landed (QA captures use these)
let started = false, playing = false, userPaused = false, inView = false, locked = QA_T !== null || NOMOTION;   // [조합] 페이지 끝 박스 — 보일 때부터 재생

const S = (n) => $(`[data-sc="${n}"]`, typeLayer);
const T = (n) => SC[n - 1].t;
const E = (n) => SC[n - 1].t1;
const bgEl = (k) => BG[k].el;
const mark = (t) => marks.push(+t.toFixed(2));

/* ---------- a plate whose clip is missing becomes its still (data-missing) — the engine never depends on a file ---------- */
function plateMissing(k) {
  const b = BG[k], v = b.el;
  if (v.tagName !== 'VIDEO') return;
  const s = document.createElement('div');
  s.className = v.className + ' bg--still';
  s.dataset.bg = k;
  s.dataset.missing = v.getAttribute('src') || '';
  s.style.cssText = v.style.cssText;
  s.style.setProperty('--img', `url("${v.dataset.still || v.getAttribute('poster')}")`);
  v.pause();
  v.removeAttribute('src');
  v.replaceWith(s);
  b.el = s; b.vids = [];
  if (tl) rebuild();
}
$$('video[data-bg]', film).forEach((v) => {
  const k = v.dataset.bg;
  if (v.error) plateMissing(k);
  else v.addEventListener('error', () => plateMissing(k));
});

/* ---------- copy + auto-fit ---------- */
/* data-en uses a tiny markup: *bold* and {count} */
const md = (s) => s.replace(/\{([^}]+)\}/g, '<b class="cnt">$1</b>').replace(/\*([^*]+)\*/g, '<b>$1</b>');
function applyCopy() {
  stillEl.innerHTML = STILL_TEMPLATE;
  if (lang === 'en') {
    $$('[data-en]', typeLayer).forEach((el) => { el.innerHTML = md(el.dataset.en); });
    $$('[data-en]', stillEl).forEach((el) => { el.innerHTML = md(el.dataset.en); });
  }
  $$('[data-ko]', film).forEach((el) => { el.textContent = el.dataset[lang]; });
  film.setAttribute('lang', lang);
}

/* longer (English) lines shrink until they fit the stage: font-size = --fs × --fit */
function fitAll() {
  const W = film.clientWidth, mob = mqMobile.matches;
  $$('[data-fit]', typeLayer).forEach((el) => {
    el.style.setProperty('--fit', 1);
    const cs = getComputedStyle(el);
    const w = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const max = W * parseFloat((mob && el.dataset.fitM) || el.dataset.fit);
    if (w > max) el.style.setProperty('--fit', (max / w).toFixed(4));
  });
}
/* the typing line and the counter keep their final width, so nothing re-centres while they change */
function lockWidths() {
  $$('.type, .cnt', typeLayer).forEach((el) => {
    el.style.width = '';
    el.style.width = `${Math.ceil(el.getBoundingClientRect().width + 1)}px`;
  });
}

/* split every text node under `root` (keeps <b>/<br> markup intact); text inside `skip` is left whole */
function splitDeep(root, by = 'char', skip = null) {
  const out = { chars: [], words: [] };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeValue.trim() && !(skip && skip.contains(n))) nodes.push(n);
  }
  nodes.forEach((n) => {
    let host = n.parentNode;
    if (host.childNodes.length > 1) {
      const lead = /^\s/.test(n.nodeValue), trail = /\s$/.test(n.nodeValue);
      const s = document.createElement('span');
      n.replaceWith(s); s.appendChild(n);
      n.nodeValue = n.nodeValue.trim();
      if (lead) s.before(' ');
      if (trail) s.after(' ');
      host = s;
    }
    const r = splitText(host, { by });
    out.chars.push(...r.chars); out.words.push(...r.words);
  });
  return out;
}

/* ---------- motion primitives ---------- */

/* directional-blur landing: the transform is a GSAP tween, the SVG blur amount is a pure function of film time (see sync) */
function land(el, at, o = {}) {
  const { x = 0, y = 0, sx = 1, sy = 1, s = 1, bx = 0, by = 0, dur = 0.42, ease = 'power3.out' } = o;
  const b = blurPool[blurN] || (blurPool[blurN] = createDirectionalBlur());
  blurN++;
  blurTracks.push({ el, b, t0: at, dur, bx, by, on: -1 });
  tl.fromTo(el, { opacity: 0, xPercent: x, yPercent: y, scaleX: sx * s, scaleY: sy * s },
    { opacity: 1, xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, duration: dur, ease }, at);
  return at + dur;
}
/* per-character rack focus */
function focus(chars, at, { dur = 0.45, amount = 0.3, blur = 14, from = {}, to = {} } = {}) {
  tl.fromTo(chars, { opacity: 0, filter: `blur(${blur}px)`, ...from },
    { opacity: 1, filter: 'blur(0px)', ...to, duration: dur, ease: 'power2.out', stagger: { amount } }, at);
  const end = at + dur + amount;
  tl.set(chars, { filter: 'none' }, end);
  return end;
}

/* ---------- the 13 scenes (11 stages: 6+7 and 11+12 share one) ---------- */
const SCENES = [
  /* 1 — 감 한 알에서: orange flash out, glyphs (KR) / words (EN) land with a horizontal streak */
  () => {
    const sc = S(1), t = T(1), d = E(1) - t, p = $('.t-xl', sc);
    const parts = splitDeep(p, lang === 'ko' ? 'char' : 'word');
    const units = lang === 'ko' ? parts.chars : parts.words;
    const gap = Math.min(0.07, 0.4 / Math.max(1, units.length - 1));
    let end = t;
    units.forEach((u, i) => { end = Math.max(end, land(u, t + 0.14 + i * gap, { x: 70, sx: 1.9, bx: 46, dur: 0.48 })); });
    tl.fromTo($('.flash', sc), { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power2.out' }, t)
      .fromTo($('.lbl', sc), { opacity: 0, y: 10 }, { opacity: 0.9, y: 0, duration: 0.5, ease: 'power2.out' }, t + 0.35)
      .to(p, { scale: 1.035, duration: E(1) - end, ease: 'none' }, end)
      .fromTo(bgEl('f1'), { scale: 1.14 }, { scale: 1.03, duration: d, ease: 'none' }, t)
      .to(sc, { opacity: 0, duration: 0.14, ease: 'power1.in' }, E(1) - 0.14);
    mark(end + 0.03);
  },
  /* 2 — 30년의 발효: word by word, the number set heavy */
  () => {
    const sc = S(2), t = T(2), d = E(2) - t, p = $('.t-wd', sc);
    const { words } = splitDeep(p, 'word');
    const st = 0.13, end = t + 0.06 + 0.5 + st * (words.length - 1);
    tl.fromTo(words, { opacity: 0, yPercent: 60, filter: 'blur(8px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out', stagger: st }, t + 0.06)
      .set(words, { filter: 'none' }, end)
      .fromTo($$('b .k-word', p), { scale: 1.3 }, { scale: 1, duration: 0.7, ease: 'expo.out' }, t + 0.06)
      .to(p, { scale: 1.03, duration: E(2) - end, ease: 'none' }, end)
      .fromTo(bgEl('f2'), { scale: 1.1 }, { scale: 1.02, duration: d, ease: 'none' }, t)
      .to(sc, { opacity: 0, duration: 0.14, ease: 'power1.in' }, E(2) - 0.14);
    mark(end + 0.03);
  },
  /* 3 — 한 병의 신뢰로: the whole line rises out of a mask, an orange rule draws under it */
  () => {
    const sc = S(3), t = T(3), d = E(3) - t, ln = $('.ln', sc), rule = $('.rule', sc);
    tl.fromTo(ln, { yPercent: 112, skewY: 4 }, { yPercent: 0, skewY: 0, duration: 0.75, ease: 'expo.out' }, t + 0.06)
      .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, t + 0.35)
      .fromTo(bgEl('f3'), { scale: 1.1, xPercent: 2 }, { scale: 1.02, xPercent: 0, duration: d, ease: 'none' }, t)
      .to(ln, { yPercent: -112, duration: 0.3, ease: 'power2.in' }, E(3) - 0.3)
      .to(rule, { opacity: 0, duration: 0.24, ease: 'power1.in' }, E(3) - 0.28);
    mark(t + 1.08);
  },
  /* 4 — 대학 연구소가 만들고: IME-accurate Hangul typing (ㄷ → 대 → 대학 …), driven by film time */
  () => {
    const sc = S(4), t = T(4), d = E(4) - t, q = $('.type__txt', sc);
    const dur = lang === 'ko' ? 1.3 : 1.15;
    typeTrack = { el: q, steps: hangulTypingSteps(q.textContent), t0: t + 0.3, dur, i: -1 };
    tl.fromTo($('.lbl', sc), { opacity: 0, y: 10 }, { opacity: 0.9, y: 0, duration: 0.45, ease: 'power2.out' }, t + 0.05)
      .fromTo($('.type', sc), { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, t + 0.12)
      .fromTo(bgEl('f4'), { scale: 1.12 }, { scale: 1.02, duration: d, ease: 'none' }, t)
      .to(sc, { opacity: 0, duration: 0.16, ease: 'power1.in' }, E(4) - 0.16);
    mark(t + 0.3 + dur + 0.05);
  },
  /* 5 — 특허 5건 · 발효 균주 2종: two small labels switch on, one after the other (still plate, slow zoom) */
  () => {
    const sc = S(5), t = T(5), d = E(5) - t, lamps = $$('.lamp', sc);
    tl.fromTo(bgEl('p5'), { scale: 1.02 }, { scale: 1.12, duration: d, ease: 'none' }, t)
      .fromTo($('.lamps', sc), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t + 0.04);
    lamps.forEach((l, i) => {
      const at = t + 0.3 + i * 0.42;
      tl.fromTo(l, { '--on': 0 }, { '--on': 1, duration: 0.35, ease: 'power2.out' }, at)
        .fromTo($('.lamp__led', l), { opacity: 0.2, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, at)
        .fromTo($('span', l), { opacity: 0.32 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, at + 0.04);
    });
    tl.to(sc, { opacity: 0, duration: 0.16, ease: 'power1.in' }, E(5) - 0.16);
    mark(t + 0.3 + 0.42 * (lamps.length - 1) + 0.4);
  },
  /* 6 + 7 — a huge "1" scales in, 국내 액상 제품 1호 lands; then GMP 공장이 채웁니다 rises under it */
  () => {
    const sc = S(6), t = T(6), t2 = T(7), one = $('.one', sc), a = $('.gmp__a', sc), b = $('.gmp__b', sc);
    tl.fromTo(bgEl('h1'), { scale: 1.16 }, { scale: 1.02, duration: E(7) - t, ease: 'none' }, t);
    land(one, t + 0.02, { s: 2.4, by: 34, dur: 0.62, ease: 'expo.out' });
    const end = land(a, t + 0.42, { x: 16, sx: 1.6, bx: 48, dur: 0.46 });
    mark(end + 0.03);
    tl.to(one, { scale: 1.05, duration: t2 - (t + 0.64), ease: 'none' }, t + 0.64)
      .to(one, { opacity: 0.18, scale: 0.92, duration: 0.6, ease: 'power2.inOut' }, t2)
      .fromTo(b, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' }, t2 + 0.1)
      .to(a, { opacity: 0.78, duration: 0.5 }, t2 + 0.1)
      .to(sc, { opacity: 0, duration: 0.18, ease: 'power1.in' }, E(7) - 0.18);
    mark(t2 + 0.85);
  },
  /* 8 — HACCP · ISO 9001 · FDA: three words light up in turn, each underlined (still plate, slow zoom) */
  () => {
    const sc = S(8), t = T(8), d = E(8) - t, certs = $$('.cert', sc);
    tl.fromTo(bgEl('y2'), { scale: 1.0 }, { scale: 1.12, duration: d, ease: 'none' }, t)
      .fromTo($('.lbl', sc), { opacity: 0, y: 10 }, { opacity: 0.9, y: 0, duration: 0.4, ease: 'power2.out' }, t + 0.05)
      .fromTo($('.certs', sc), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, t + 0.05);
    certs.forEach((c, i) => {
      const at = t + 0.3 + i * 0.44;
      tl.fromTo(c, { opacity: 0.2, textShadow: '0 0 0px rgba(255,122,31,0)' }, { opacity: 1, textShadow: '0 0 28px rgba(255,122,31,.55)', duration: 0.32, ease: 'power2.out' }, at)
        .fromTo(c, { '--u': 0 }, { '--u': 1, duration: 0.5, ease: 'power3.inOut' }, at + 0.06);
    });
    tl.to(sc, { opacity: 0, duration: 0.16, ease: 'power1.in' }, E(8) - 0.16);
    mark(t + 0.3 + 0.44 * (certs.length - 1) + 0.6);
  },
  /* 9 — 6년근 홍삼의 깊이: plate and type rack from blur to sharp */
  () => {
    const sc = S(9), t = T(9), d = E(9) - t, p = $('.t-fc', sc), v = bgEl('f5');
    const end = focus(splitDeep(p).chars, t + 0.12, { dur: 0.6, amount: 0.5, blur: 20 });
    tl.fromTo(v, { scale: 1.12, filter: 'brightness(.72) blur(10px)' }, { scale: 1.03, filter: 'brightness(.72) blur(0px)', duration: 1, ease: 'power2.out' }, t)
      .to(v, { scale: 1.0, duration: d - 1, ease: 'none' }, t + 1)
      .to(sc, { opacity: 0, duration: 0.16, ease: 'power1.in' }, E(9) - 0.16);
    mark(end + 0.03);
  },
  /* 10 — 온 가족의 건강으로: warm fade — the room brightens, the line arrives warm and settles white */
  () => {
    const sc = S(10), t = T(10), d = E(10) - t, p = $('.t-wm', sc);
    tl.fromTo($('.warm', sc), { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'power1.out' }, t)
      .fromTo(bgEl('f6'), { scale: 1.08, filter: 'brightness(.34) saturate(.8)' }, { scale: 1.0, filter: 'brightness(.56) saturate(1.05)', duration: d, ease: 'power1.out' }, t)
      .fromTo(p, { opacity: 0, y: 26, color: '#ffb47e', letterSpacing: '0.02em' }, { opacity: 1, y: 0, color: '#fff7ee', letterSpacing: '-0.035em', duration: 1.15, ease: 'power2.out' }, t + 0.15)
      .to(sc, { opacity: 0, duration: 0.2, ease: 'power1.in' }, E(10) - 0.2);
    mark(t + 1.33);
  },
  /* 11 + 12 — 30년의 신뢰, lands big; it lifts and shrinks, 100년의 미래 arrives while 100 counts up from 0 */
  () => {
    const sc = S(11), t = T(11), t2 = T(12), fin = $('.fin', sc), aw = $('.fin__aw', sc), a = $('.fin__a', sc), b = $('.fin__b', sc), cnt = $('.cnt', b);
    const off = (b.offsetHeight + (parseFloat(getComputedStyle(fin).rowGap) || 0)) / 2;
    gsap.set(aw, { y: off });
    const end1 = land(a, t + 0.04, { s: 1.38, by: 34, dur: 0.52, ease: 'expo.out' });
    mark(end1 + 0.03);
    tl.fromTo(bgEl('f7'), { scale: 1.14 }, { scale: 1.0, duration: E(12) - t, ease: 'none' }, t)
      .to(a, { scale: 1.03, duration: t2 - end1, ease: 'none' }, end1)
      .to(aw, { y: 0, scale: 0.5, duration: 0.65, ease: 'power3.inOut' }, t2)
      .to(a, { color: 'rgba(255,255,255,.86)', duration: 0.4 }, t2)
      .fromTo(cnt, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, t2 + 0.12);
    const end2 = focus(splitDeep(b, 'char', cnt).chars, t2 + 0.3, { dur: 0.45, amount: 0.3 });
    countTrack = { el: cnt, t0: t2 + 0.12, dur: 1.5, to: 100, last: '' };
    tl.to(sc, { opacity: 0, duration: 0.24, ease: 'power1.in' }, E(12) - 0.24);
    mark(Math.max(end2, t2 + 1.62) + 0.03);
  },
  /* 13 — CI on ivory, wordmark rises; the hexagon then opens as an orange iris and the film loops to act 1 */
  () => {
    const sc = S(13), t = T(13), mk = $('.end__mark', sc), iris = $('.iris', sc), w = $('.end__w', sc), s = $('.end__s', sc), k = $('.end__k', sc);
    tl.fromTo(mk, { opacity: 0, scale: 1.7, rotate: -24 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: 'expo.out' }, t + 0.05)
      .fromTo(splitDeep(w).chars, { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: 0.55, ease: 'power3.out', stagger: 0.08 }, t + 0.35)
      .fromTo([s, k], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.12 }, t + 0.75)
      .to([w, s, k], { opacity: 0, duration: 0.25, ease: 'power1.in' }, DUR - 0.78)
      .fromTo(iris, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.01, ease: 'none' }, DUR - 0.62)
      .to(iris, { scale: 44, duration: 0.6, ease: 'expo.in' }, DUR - 0.6);
    mark(t + 1.4);
  },
];

function build() {
  blurN = 0; blurTracks = []; typeTrack = null; countTrack = null; marks.length = 0;
  typeLayer.innerHTML = TEMPLATE;
  applyCopy();
  fitAll();
  lockWidths();
  scEls = $$('.sc', typeLayer);
  ctx = gsap.context(() => {
    tl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power3.out', duration: 0.5 } });
    SCENES.forEach((fn) => fn());
    tl.set({}, {}, DUR);
  });
  marks.sort((a, b) => a - b);
}

/* ---------- everything that is a pure function of film time ---------- */
const sceneAt = (t) => { for (let i = SC.length - 1; i >= 0; i--) if (t >= SC[i].t) return i; return 0; };
function playVideo(v) { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }
function seekVideo(v, s, k, t) {
  const r = s.ref[k];
  let x = r.off + Math.max(0, t - r.t) * r.rate;
  if (v.playbackRate !== r.rate) v.playbackRate = r.rate;
  if (v.duration && isFinite(v.duration)) x = v.loop ? x % v.duration : Math.min(x, v.duration - 0.05);
  try { if (Math.abs(v.currentTime - x) > 0.08) v.currentTime = x; } catch (e) { /* not seekable yet */ }
}
function primeNext(i) {                          // decode the first frame of the next plate while it is still hidden
  const nx = SC[(i + 1) % SC.length];
  nx.bg.forEach((k) => {
    if (BG[k].on) return;
    BG[k].vids.forEach((v) => { if (v.preload !== 'auto') v.preload = 'auto'; seekVideo(v, nx, k, nx.t); });
  });
}

function sync(t, force) {
  const i = sceneAt(t), s = SC[i];
  if (i !== cur || force) {
    for (const el of scEls) el.classList.toggle('is-on', +el.dataset.sc === s.el);
    for (const k in BG) {
      const b = BG[k], on = s.bg.includes(k);
      if (on && (!b.on || force)) b.vids.forEach((v) => seekVideo(v, s, k, t));
      b.el.classList.toggle('is-on', on);
      b.vids.forEach((v) => { if (on && playing) playVideo(v); else if (!v.paused) v.pause(); });
      b.on = on;
    }
    actBtns.forEach((b, n) => b.classList.toggle('is-on', n + 1 === s.act));
    film.dataset.act = s.act;
    film.dataset.plate = s.bg[0];
    cur = i;
    primeNext(i);
  }
  let tone = s.tone;
  if (s.tones) for (const [dt, tn] of s.tones) if (t - s.t >= dt) tone = tn;
  if (film.dataset.tone !== tone) { film.dataset.tone = tone; headerTone(); }

  for (const k of blurTracks) {                  // SVG directional blur: strong while flying, exactly none once landed
    const p = (t - k.t0) / k.dur;
    const st = p > 0 && p < 1 ? 1 : 0;
    if (st) { const e = Math.pow(1 - p, 1.4); k.b.set(k.bx * e, k.by * e); }
    if (st !== k.on) { k.el.style.filter = st ? k.b.url : 'none'; k.on = st; }
  }
  if (typeTrack) {                               // IME typing: which composition step is on screen at time t
    const k = typeTrack, n = k.steps.length, idx = clamp(Math.floor(((t - k.t0) / k.dur) * n), 0, n);
    if (idx !== k.i) { k.el.textContent = idx ? k.steps[idx - 1] : ''; k.i = idx; }
  }
  if (countTrack) {                              // 0 → 100, ease-out
    const k = countTrack, p = clamp((t - k.t0) / k.dur), txt = String(Math.round(k.to * (1 - Math.pow(1 - p, 3))));
    if (txt !== k.last) { k.el.textContent = txt; k.last = txt; }
  }
  ACTS.forEach((a, n) => {
    const p = clamp((t - a.t0) / (a.t1 - a.t0));
    if (Math.abs(p - a.p) > 0.002 || (p === 0 && a.p !== 0) || (p === 1 && a.p !== 1)) { actFills[n].style.setProperty('--p', p.toFixed(3)); a.p = p; }
  });
  const sec = Math.floor(t);
  if (sec !== lastSec) { tcEl.textContent = `00:${pad2(sec)}`; lastSec = sec; }
}

function applyRun() {
  const run = !!tl && started && !locked && !userPaused && inView && !document.hidden;
  playing = run;
  film.classList.toggle('is-run', run);
  if (tl) run ? tl.play() : tl.pause();
  if (run) { if (cur >= 0) SC[cur].bg.forEach((k) => BG[k].vids.forEach(playVideo)); }
  else for (const k in BG) BG[k].vids.forEach((v) => { if (!v.paused) v.pause(); });
  const shown = !(started && !locked && !userPaused);
  pp.classList.toggle('is-paused', shown);
  pp.setAttribute('aria-label', shown ? '필름 재생' : '필름 일시정지');
}

function leaveStatic() {
  if (!film.classList.contains('is-static')) return;
  film.classList.remove('is-static');
  started = true;
}

function seek(t, hold = true) {
  if (!tl) return;
  leaveStatic();
  t = clamp(+t || 0, 0, DUR - 0.001);
  if (hold) userPaused = true;
  tl.time(t, false);
  lastT = t;
  sync(t, true);
  applyRun();
}

function rebuild() {
  const t = tl ? tl.time() : 0;
  if (ctx) ctx.revert();
  build();
  if (t > 0) tl.time(t, false);
  cur = -1; lastT = t;
  sync(t, true);
  applyRun();
}

function setLang(l) {
  l = l === 'en' ? 'en' : 'ko';
  $$('.lang__b[data-lang]', film).forEach((b) => { const on = b.dataset.lang === l; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  if (l === lang) return;
  lang = l;
  if (tl) rebuild();                             // same clock position, same motion, new words
  else applyCopy();
}

/* ---------- header tone follows whatever is under it ---------- */
const toneSecs = $$('main [data-tone], footer[data-tone]');
function headerTone() {}   // [조합] 헤더 색은 01 A안 header01()이 맡는다(문의 단락 data-dark)

/* ---------- boot ---------- */
const mnav = $('#mnav');
if (STATIC_FILM) {
  film.classList.add('is-static');
  pre.classList.add('is-done');
}

window.__film = {
  get tl() { return tl; },
  marks,
  seek,
  setLang,
  get lang() { return lang; },
  scenes: SC,
  dur: DUR,
};

if (HAS_GSAP) {
  build();
  sync(0, true);
  gsap.ticker.add(() => {
    if (!tl) return;
    const t = tl.time();
    if (t !== lastT) { lastT = t; sync(t); }
  });

  const filmText = typeLayer.textContent + ' ' + $$('[data-en]', typeLayer).map((e) => e.dataset.en).join(' ');
  const fontsLoaded = Promise.race([
    Promise.all([
      ...[200, 300, 500, 800].map((w) => document.fonts.load(`${w} 40px "Pretendard Variable"`, filmText)),
      ...[600, 700, 800].map((w) => document.fonts.load(`${w} 40px "Montserrat"`, 'SINCE HACCP ISO 9001 FDA 0123456789')),
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2400)),
  ]);

  const startFilm = () => {
    if (started || STATIC_FILM) return;
    started = true;
    pre.classList.add('is-done');
    if (QA_T !== null) seek(QA_T);
    else { tl.time(0, false); sync(0, true); applyRun(); }
  };
  if (QA_T !== null) startFilm();                           // QA: show the requested frame at once, refine when fonts arrive
  fontsLoaded.then(() => { rebuild(); startFilm(); });
  document.fonts.ready.then(() => { if (started && (locked || userPaused)) rebuild(); });
} else {
  applyCopy();
}

pp.addEventListener('click', () => {
  if (!tl) return;
  leaveStatic();
  if (locked) { locked = false; userPaused = false; } else userPaused = !userPaused;
  applyRun();
});
actBtns.forEach((b, n) => b.addEventListener('click', () => { locked = false; userPaused = false; seek(ACTS[n].t0, false); }));
$$('.lang__b[data-lang]', film).forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
setLang(lang);

new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (started) applyRun(); }, { threshold: 0.35 }).observe(film);   // [조합] 박스가 충분히 보일 때 재생(원본 히어로는 0.04)
document.addEventListener('visibilitychange', () => { if (started) applyRun(); });

let rw = innerWidth, rh = innerHeight, rT = 0;
addEventListener('resize', () => {
  clearTimeout(rT);
  rT = setTimeout(() => {
    if (innerWidth === rw && Math.abs(innerHeight - rh) < 120) return;
    rw = innerWidth; rh = innerHeight;
    if (tl) rebuild();
  }, 180);
});

