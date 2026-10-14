/* 대학촌 — 08 options (H. 선택지안)
   01 HERO → 03 BEYOND FACTORY(카드 확장) → 06 30 YEARS 궤도(캔버스 2D) → 01 PRODUCT(실제 제품) → 05 PARTNERS · NEWS · CTA
   연출 초기 상태는 전부 JS에서만 건다(html.mo). JS 실패·모션 축소·?nomotion=1 이면 정적 레이아웃이 그대로 보인다.
   QA: ?nomotion=1 · window.__g = { lenis, ScrollTrigger } · window.__ring(궤도 상태) */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const NOMOTION = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('nomotion') === '1';
  const mqMobile = matchMedia('(max-width: 900px)');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let lenis = null;

  if (NOMOTION) root.classList.add('is-static');

  /* ───────── 항상 동작하는 것 ───────── */

  // 데모 안내 토스트
  const toast = $('#toast');
  let toastTimer = 0;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2800);
  };
  $$('[data-toast]').forEach((b) => b.addEventListener('click', () => say(b.dataset.toast)));

  // 언어 토글: 표시만
  $$('.hd__lang button').forEach((b, i) => b.addEventListener('click', () => {
    if (i === 0) return;
    say('데모에서는 국문만 표시됩니다. 실제 사이트는 국문·영문·중문 페이지로 나뉩니다.');
  }));

  // 페이지 내 이동
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    const t = $(b.dataset.goto);
    if (!t) return;
    if (lenis) lenis.scrollTo(t, { duration: 1.8 });
    else t.scrollIntoView({ behavior: NOMOTION ? 'auto' : 'smooth' });
  }));

  // 무한 마키 (05): 그룹을 화면 폭만큼 복제하고 한 그룹 폭만큼 흐른다
  const marquees = $$('.mq');
  function setupMarquee(mq) {
    const track = $('.mq__track', mq), group = $('.mq__group', track);
    $$('.mq__group[data-clone]', track).forEach((n) => n.remove());
    const w = group.getBoundingClientRect().width;
    if (!w) return;
    const copies = Math.ceil(innerWidth / w) + 1;
    for (let i = 0; i < copies; i++) {
      const c = group.cloneNode(true);
      c.dataset.clone = '';
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    }
    const speed = parseFloat(mq.dataset.speed) || 50;
    track.style.setProperty('--mq-shift', `${-w}px`);
    track.style.setProperty('--mq-dur', `${(w / speed).toFixed(2)}s`);
    mq.classList.add('is-run');
  }
  if (!NOMOTION) {
    marquees.forEach(setupMarquee);
    if (document.fonts) document.fonts.ready.then(() => marquees.forEach(setupMarquee));
    let mqW = innerWidth, mqTimer = 0;
    addEventListener('resize', () => {
      if (innerWidth === mqW) return;
      mqW = innerWidth;
      clearTimeout(mqTimer);
      mqTimer = setTimeout(() => marquees.forEach(setupMarquee), 200);
    });
  }

  // 헤더: 아래 섹션 톤에 맞춰 로고(컬러/흰색)·글자색 전환, 히어로를 벗어나면 반투명 바, 내려갈 때 메뉴 접기
  const hd = $('#hd'), qm = $('#qm');
  const toneSecs = $$('main [data-tone], footer[data-tone]');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY, mid = hd.offsetHeight / 2;
    let tone = 'dark', over = null;
    for (const s of toneSecs) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { tone = s.dataset.tone; over = s; }
    }
    if (hd.dataset.tone !== tone) hd.dataset.tone = tone;
    hd.classList.toggle('is-solid', !!over && over.id !== 'top');
    if (Math.abs(y - lastY) > 4) {
      hd.classList.toggle('nav-hide', y > lastY && y > innerHeight * 0.6);
      lastY = y;
    }
    qm.classList.toggle('show-top', y > innerHeight * 0.6);
    qm.classList.toggle('is-away', y < innerHeight * 0.45);
  }
  if (!NOMOTION) {
    addEventListener('scroll', onScroll, { passive: true });
  }

  const video = $('.hero__video');
  if (video) {
    if (NOMOTION) { video.removeAttribute('autoplay'); video.pause(); }
    else { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
  }

  if (NOMOTION || !window.gsap || !window.ScrollTrigger) return;

  /* ───────── 연출 시작 ───────── */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('mo');
  onScroll();

  if (window.Lenis && innerWidth > 768) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.__g = { lenis, ScrollTrigger };
  const vw = (n) => (innerWidth * n) / 100;
  const vh = (n) => (innerHeight * n) / 100;

  /* 공통 fade-up */
  const revealIn = (els, stagger) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger, overwrite: true, clearProps: 'transform' });
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 50 });
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: (b) => revealIn(b, 0.12) });
  $$('[data-reveal-group]').forEach((g) => {
    const items = Array.from(g.children);
    gsap.set(items, { autoAlpha: 0, y: 60 });
    ScrollTrigger.create({ trigger: g, start: 'top 86%', once: true, onEnter: () => revealIn(items, 0.14) });
  });

  hero();
  solution();
  ring();
  products();

  gsap.fromTo('.cta__ghost', { xPercent: 8 }, {
    xPercent: -6, ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom bottom', scrub: 0.4 },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ═════════ 1. HERO — 글자 리빌, 스크롤 시차, 커서 반응 육각 라인 ═════════ */
  function hero() {
    const sec = $('#top');
    gsap.from('.hero__label span, .hero__title .ln > span, .hero__sub span', { yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.12, delay: 0.25 });
    gsap.from('.hero__foot', { autoAlpha: 0, duration: 1.2, delay: 1.2 });
    gsap.from('.hero__hex svg', { scale: 0.55, rotate: -40, autoAlpha: 0, duration: 2, ease: 'power3.out', stagger: 0.14, delay: 0.1 });
    gsap.to('.hero__foot', {
      autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: '20% top', scrub: true },
    });
    gsap.to('.hero__body', {
      yPercent: -14, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom 35%', scrub: true },
    });
    gsap.to('.hero__media', {
      scale: 1.14, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.hero__hex', {
      scale: 1.7, rotate: 24, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom 20%', scrub: true },
    });
    if (!canHover) return;
    sec.addEventListener('pointermove', (e) => {
      sec.style.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      sec.style.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
    sec.addEventListener('pointerleave', () => { sec.style.setProperty('--mx', 0); sec.style.setProperty('--my', 0); });
  }

  /* ═════════ 2. BEYOND FACTORY (03) — 카드가 올라와 456×600 카드 크기의 clip-path에서 화면 전체로 확장 → 다음 카드 ═════════ */
  function solution() {
    const sec = $('#sol');
    const cards = $$('.sol__card', sec), imgs = cards.map((c) => $('img', c));
    const tags = cards.map((c) => $('.sol__tag', c)), ovs = cards.map((c) => $('.sol__ov', c));
    const says = $$('.sol__say p', sec), nums = $$('.sol__num b', sec), bar = $('.sol__bar i', sec), head = $('.sol__hd', sec);
    const H = () => innerHeight;
    const dist = () => Math.round(H() * (mqMobile.matches ? 3.6 : 5.4));

    const t = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: lenis ? true : 0.5, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    t.fromTo(cards[0], { y: () => H() * 0.5 }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
      .fromTo(head, { y: () => H() * 0.06 }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
      .fromTo(says[0], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1);

    const STEP = 4.1;                                           // 카드마다: 올라옴 1.15 · 확장 1.3 · 오버레이 유지 ≈ 1.2
    cards.forEach((c, i) => {
      const at = 1.1 + i * STEP;
      if (i > 0) {
        const r = at - 1.25;
        t.fromTo(c, { y: () => H() }, { y: 0, duration: 1.15, ease: 'power2.out' }, r)
          .to(cards[i - 1], { '--dim': 0.72, duration: 1 }, r)
          .to(ovs[i - 1], { opacity: 0, y: -30, duration: 0.45 }, r + 0.3)
          .to(says[i - 1], { opacity: 0, y: -26, duration: 0.4 }, r + 0.1)
          .fromTo(says[i], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, r + 0.45)
          .to(nums, { yPercent: -100 * i, duration: 0.5, ease: 'power2.inOut' }, r + 0.2)
          .to(bar, { scaleX: (i + 1) / 3, duration: 0.6, ease: 'power2.inOut' }, r + 0.2);
      }
      t.fromTo(c, { '--e': 0 }, { '--e': 1, duration: 1.3, ease: 'power2.inOut' }, at)
        .fromTo(imgs[i], { scale: 1.3 }, { scale: 1, duration: 1.3, ease: 'power2.inOut' }, at)
        .to(tags[i], { opacity: 0, duration: 0.3 }, at)
        .fromTo(c, { '--dim': 0 }, { '--dim': 0.42, duration: 0.8 }, at + 0.7)
        .fromTo(ovs[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + 1.0);
    });
    t.to({}, { duration: 0.8 });
  }

  /* ═════════ 3. 30 YEARS 궤도 (06 링 → 캔버스 2D 원근 투영)
     스크롤 진행도 → 1996 + 30p년이 링 정면(아래쪽)에 오도록 회전. 드래그로 더 돌리고(관성), 가장 가까운 노드가 현재 연도. ═════════ */
  function ring() {
    const sec = $('#ring'), stage = $('#ringStage'), cv = $('#ringCv'), ctx = cv.getContext('2d');
    const labelWrap = $('#ringLabels'), yearEl = $('#ringYear'), descEl = $('#ringDesc'), bar = $('#ringBar');
    const lis = $$('#ringList li');
    const NODES = lis.map((li) => ({ y: +li.dataset.y, s: li.dataset.s, d: $('span', li).textContent }));
    const setYear = odometer(yearEl, NODES[0].y);
    const labels = NODES.map((n) => {
      const el = document.createElement('div');
      el.className = 'nl';
      el.innerHTML = `<b>${n.y}</b><small>${n.s}</small>`;
      labelWrap.appendChild(el);
      return el;
    });
    const SPAN = 31;                                            // 1996–2026 눈금 31개가 한 바퀴
    const TAU = Math.PI * 2;
    const ang = (yr) => ((yr - 1996) / SPAN) * TAU;

    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const dust = Array.from({ length: mqMobile.matches ? 120 : 220 }, () => ({ x: rnd(), y: rnd(), z: rnd(), r: 0.4 + rnd() * 1.5, a: 0.12 + rnd() * 0.5, tw: rnd() * TAU }));

    const st = { scroll: 0, off: 0, vel: 0, cur: 0, k: 0, mx: 0, my: 0, smx: 0, smy: 0, node: 0, drag: null, on: false, last: 0 };
    let W = 0, H = 0, dpr = 1, raf = 0;
    const avoid = [];                                           // 라벨이 피해야 할 DOM 영역(스테이지 좌표)

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      labels.forEach((el) => { el._w = 0; });
      measureAvoid();
      draw(performance.now());
    }
    function measureAvoid() {
      avoid.length = 0;
      const sr = stage.getBoundingClientRect();
      [$('#ringList'), $('.ring__head')].forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.width && getComputedStyle(n).display !== 'none') avoid.push({ x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top });
      });
    }
    const layout = () => (mqMobile.matches
      ? { cx: W * 0.5, cy: H * 0.6, R: Math.min(W * 0.4, H * 0.32), e: 0.5 }
      : { cx: W * 0.37, cy: H * 0.6, R: Math.min(W * 0.235, H * 0.42), e: 0.42 });

    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => { st.scroll = s.progress * 30; bar.style.transform = `scaleX(${s.progress.toFixed(4)})`; },
      onRefresh: (s) => { st.scroll = s.progress * 30; },
    });
    ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top top', onUpdate: (s) => { st.k = s.progress; }, onRefresh: (s) => { st.k = s.progress; }, onLeave: () => setTimeout(measureAvoid, 400) });
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { st.on = s.isActive; if (st.on && !raf) { st.last = performance.now(); raf = requestAnimationFrame(loop); } },
    });
    gsap.from('.ring__head > *, .ring__list', {
      y: 50, autoAlpha: 0, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: sec, start: 'top 70%', end: 'top 5%', scrub: 0.6 },
    });

    function loop(now) {
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (!st.drag) { st.off += st.vel * dt; st.vel *= Math.exp(-dt * 3.2); }
      const target = st.scroll + st.off;
      st.cur += (target - st.cur) * (1 - Math.exp(-dt * 6));
      st.smx += (st.mx - st.smx) * (1 - Math.exp(-dt * 4));
      st.smy += (st.my - st.smy) * (1 - Math.exp(-dt * 4));
      draw(now);
      raf = st.on ? requestAnimationFrame(loop) : 0;
    }

    function draw(now) {
      if (!W) return;
      const { cx: cx0, cy, R: R0, e: e0 } = layout();
      const ek = 1 - Math.pow(1 - st.k, 3);
      const R = R0 * (0.82 + 0.18 * ek), cx = cx0 + st.smx * 14, e = e0 + st.smy * 0.05;
      const se = Math.sin(e), ce = Math.cos(e), F = R * 4;
      const rot = -ang(1996 + st.cur);
      const P = (a, rr) => {
        const x = rr * Math.sin(a + rot), z = rr * Math.cos(a + rot);
        const s = F / (F - z * ce);
        return { x: cx + x * s, y: cy + z * se * s, z: z / rr, s };
      };
      ctx.clearRect(0, 0, W, H);

      // 먼지 입자
      for (const d of dust) {
        const px = (d.x + st.smx * 0.012 * (0.4 + d.z)) * W, py = (d.y + st.smy * 0.012 * (0.4 + d.z)) * H;
        const a = d.a * (0.6 + 0.4 * Math.sin(now * 0.0012 + d.tw));
        ctx.fillStyle = `rgba(255, 196, 140, ${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(px, py, d.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = ek;

      // 링: 격자 띠 + 오렌지 메인 라인 (뒤쪽은 옅게)
      const N = 160, bw = R * 0.028;
      const inner = [], outer = [], mid = [];
      for (let i = 0; i <= N; i++) { const a = (i / N) * TAU; inner.push(P(a, R - bw)); outer.push(P(a, R + bw)); mid.push(P(a, R)); }
      for (let i = 0; i < N; i++) {
        const dz = (mid[i].z + 1) / 2;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255, 246, 233, ${(0.08 + 0.22 * dz).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(outer[i + 1].x, outer[i + 1].y);
        ctx.moveTo(outer[i].x, outer[i].y); ctx.lineTo(inner[i + 1].x, inner[i + 1].y);
        ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(inner[i + 1].x, inner[i + 1].y);
        ctx.moveTo(outer[i].x, outer[i].y); ctx.lineTo(outer[i + 1].x, outer[i + 1].y);
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(242, 138, 22, ${(0.3 + 0.6 * dz).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(mid[i].x, mid[i].y); ctx.lineTo(mid[i + 1].x, mid[i + 1].y); ctx.stroke();
      }
      // 연도 눈금 31개 (노드 연도는 길게)
      ctx.lineWidth = 1;
      for (let yr = 1996; yr <= 2026; yr++) {
        const big = NODES.some((n) => n.y === yr), a = ang(yr);
        const p0 = P(a, R * (big ? 0.9 : 0.955)), p1 = P(a, R * (big ? 1.1 : 1.045));
        ctx.strokeStyle = `rgba(255, 246, 233, ${(0.12 + 0.45 * (p0.z + 1) / 2).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }

      // 현재 노드: 원형 연도 거리로 가장 가까운 노드
      const yp = ((st.cur % SPAN) + SPAN) % SPAN;
      let best = 0, bd = 1e9;
      NODES.forEach((n, i) => { let dd = Math.abs(n.y - 1996 - yp); dd = Math.min(dd, SPAN - dd); if (dd < bd) { bd = dd; best = i; } });
      if (best !== st.node) {
        st.node = best;
        setYear(NODES[best].y);
        descEl.textContent = NODES[best].d;
        lis.forEach((li, i) => li.classList.toggle('is-on', i === best));
      }

      // 노드 (뒤쪽부터 그린다)
      const pts = NODES.map((n, i) => ({ i, p: P(ang(n.y), R) })).sort((a, b) => a.p.z - b.p.z);
      for (const { i, p } of pts) {
        const on = i === st.node, dz = (p.z + 1) / 2, gr = (on ? 34 : 14) * p.s;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
        g.addColorStop(0, on ? 'rgba(255, 140, 40, .75)' : `rgba(255, 220, 180, ${(0.25 + 0.3 * dz).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, gr, 0, TAU); ctx.fill();
        ctx.fillStyle = on ? '#f28a16' : `rgba(255, 241, 220, ${(0.45 + 0.55 * dz).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, (on ? 12 : 4.6) * p.s, 0, TAU); ctx.fill();
      }

      // 라벨: 현재 노드 → 앞쪽 노드 순으로 놓고, 이미 놓인 라벨·우측 연혁 리스트와 겹치면 숨긴다
      const placed = avoid.slice();
      const order = pts.slice().sort((a, b) => (b.i === st.node) - (a.i === st.node) || b.p.z - a.p.z);
      for (const { i, p } of order) {
        const on = i === st.node, el = labels[i], left = p.x > W * 0.6, gap = (on ? 14 : 6) * p.s;
        if (left !== el._l || on !== el._on) { el._l = left; el._on = on; el.classList.toggle('is-l', left); el.classList.toggle('is-on', on); el._w = 0; }
        if (!el._w) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
        const lx = left ? p.x - gap - el._w : p.x + gap, ly = p.y - 10;
        const box = { x0: lx - 4, y0: ly - 4, x1: lx + el._w + 4, y1: ly + el._h + 4 };
        const hit = placed.some((r) => box.x0 < r.x1 && box.x1 > r.x0 && box.y0 < r.y1 && box.y1 > r.y0);
        const show = ek > 0.5 && (on || (p.z > -0.25 && !hit));
        if (show) placed.push(box);
        el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
        el.style.opacity = show ? '1' : '0';
      }
      ctx.globalAlpha = 1;
    }

    // 드래그(관성) · 커서 시차
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      st.drag = { x: e.clientX, t: performance.now() };
      st.vel = 0;
      stage.classList.add('is-drag');
    });
    addEventListener('pointermove', (e) => {
      if (canHover && st.on) { st.mx = (e.clientX / innerWidth) * 2 - 1; st.my = (e.clientY / innerHeight) * 2 - 1; }
      const d = st.drag;
      if (!d) return;
      const dx = e.clientX - d.x, now = performance.now(), kk = 24 / innerWidth;
      st.off -= dx * kk;
      st.vel = (-dx * kk) / Math.max(0.008, (now - d.t) / 1000);
      d.x = e.clientX; d.t = now;
    }, { passive: true });
    const up = () => { if (!st.drag) return; st.drag = null; stage.classList.remove('is-drag'); };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);

    resize();
    addEventListener('resize', resize);
    ScrollTrigger.addEventListener('refresh', resize);
    window.__ring = st;
  }

  // 자리마다 0–9 띠를 두고 해당 숫자로 굴린다
  function odometer(el, year) {
    const digits = String(year).length;
    el.setAttribute('aria-label', String(year));
    el.textContent = '';
    const wrap = document.createElement('span');
    wrap.className = 'odo';
    wrap.setAttribute('aria-hidden', 'true');
    const strips = [];
    for (let i = 0; i < digits; i++) {
      const d = document.createElement('span');
      d.className = 'odo__d';
      const s = document.createElement('span');
      s.className = 'odo__s';
      s.innerHTML = '<b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b>';
      d.appendChild(s);
      wrap.appendChild(d);
      strips.push(s);
    }
    el.appendChild(wrap);
    const set = (y) => {
      const t = String(y);
      strips.forEach((s, i) => { s.style.transform = `translateY(${-Number(t[i]) * 10}%)`; });
      el.setAttribute('aria-label', t);
    };
    set(year);
    return set;
  }

  /* ═════════ 4. PRODUCT — 실제 제품 사진이 스크롤 방향으로 들어오고 나간다(피그마 브리프: weonus 방향 이동)
     설명은 좌·우 번갈아, 제품은 반대편으로 비켜 선다. 배경 영문 아웃라인과 원료 컷이 함께 흐른다. ═════════ */
  function products() {
    const sec = $('#products'), stage = $('#pfStage');
    const items = $$('.pf__item', sec), callouts = $$('.callout', sec), words = $$('.pf__word span', sec), ings = $$('.pf__ing', sec);
    const nowEl = $('#pfNow');
    const N = items.length, T0 = 0.1, GAP = 0.215, OUT = 0.06;
    const mob = () => mqMobile.matches;
    const sideOf = (i) => (callouts[i].classList.contains('callout--l') ? 1 : -1);
    const offX = (i) => (mob() ? 0 : sideOf(i) * vw(10));

    gsap.set(items, { xPercent: -50, yPercent: -50 });
    gsap.set(ings, { xPercent: -50, yPercent: -50 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.max(0, Math.min(N - 1, Math.floor((self.progress - T0) / GAP)));
          const t = `0${i + 1}`;
          if (nowEl.textContent !== t) nowEl.textContent = t;
        },
      },
    });
    tl.to('#pfBar', { scaleX: 1, duration: 1, ease: 'none' }, 0);
    tl.fromTo('.pf__sun', { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.08, ease: 'power2.out' }, 0);
    tl.to('.pf__intro', { autoAlpha: 0, y: -50, duration: 0.05, ease: 'power1.in' }, 0.05);

    items.forEach((it, i) => {
      const s = T0 + i * GAP, last = i === N - 1;
      tl.fromTo(it, { x: () => offX(i) + vw(46), rotate: 12, scale: 0.8, autoAlpha: 0, filter: 'blur(14px)' },
        { x: () => offX(i), rotate: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.075, ease: 'power3.out' }, s);
      tl.to(it, { y: () => -vh(2.5), duration: GAP - 0.075 - OUT, ease: 'none' }, s + 0.075);
      if (!last) tl.to(it, { x: () => offX(i) - vw(46), rotate: -12, scale: 0.8, autoAlpha: 0, filter: 'blur(14px)', duration: OUT, ease: 'power2.in' }, s + GAP - OUT);

      tl.fromTo(callouts[i], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' }, s + 0.02);
      if (!last) tl.to(callouts[i], { autoAlpha: 0, y: -60, duration: 0.045, ease: 'power2.in' }, s + GAP - OUT);

      tl.fromTo(words[i], { autoAlpha: 0, x: () => vw(28) }, { autoAlpha: 1, x: 0, duration: 0.07, ease: 'power2.out' }, s);
      tl.to(words[i], { x: () => -vw(8), duration: GAP - 0.07 - OUT, ease: 'none' }, s + 0.07);
      if (!last) tl.to(words[i], { autoAlpha: 0, x: () => -vw(30), duration: OUT, ease: 'power2.in' }, s + GAP - OUT);

      ings.filter((g) => +g.dataset.for === i).forEach((g, k) => {
        const [px, py, rot] = g.dataset.pos.split(',').map(Number);
        const X = () => offX(i) + vw(px) * (mob() ? 1.25 : 1), Y = () => vh(py) * (mob() ? 0.5 : 1);
        tl.fromTo(g, { x: () => X() + vw(30), y: () => Y() * 1.5, rotate: rot + 40, scale: 0.6, autoAlpha: 0 },
          { x: X, y: Y, rotate: rot, scale: 1, autoAlpha: 1, duration: 0.08, ease: 'power3.out' }, s + 0.01 + k * 0.012);
        tl.to(g, { y: () => Y() - vh(6) * (k ? 1 : -1), rotate: rot + (k ? 10 : -10), duration: GAP - 0.09 - OUT, ease: 'none' }, s + 0.09 + k * 0.012);
        if (!last) tl.to(g, { x: () => X() - vw(34), autoAlpha: 0, rotate: rot - 30, duration: OUT, ease: 'power2.in' }, s + GAP - OUT);
      });
    });
    tl.to({}, { duration: 0.02 });

    if (!canHover) return;
    stage.addEventListener('pointermove', (e) => {
      stage.style.setProperty('--mx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      stage.style.setProperty('--my', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
  }
})();
