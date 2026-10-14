/* 대학촌 — 07 structure (G. 고객 구조안)
   01 HERO → 01 RESEARCH → 03 30 YEARS(모션 보강) → 01 PRODUCT(실제 제품) → 05 PARTNERS · NEWS · CTA
   연출 초기 상태는 전부 JS에서만 건다(html.mo). JS 실패·모션 축소·?nomotion=1 이면 정적 레이아웃이 그대로 보인다.
   QA: ?nomotion=1 · window.__g = { lenis, ScrollTrigger } */
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
  research();
  history();
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

  /* ═════════ 2. RESEARCH — clip 리빌 + 사진별 시차 + 배경 글자 ═════════ */
  function research() {
    const ch = $('#research');
    $$('.fig', ch).forEach((fig) => {
      const clip = $('.fig__clip', fig), img = $('img', fig);
      const speed = parseFloat(fig.dataset.speed || 0) * (mqMobile.matches ? 1.6 : 1);
      gsap.fromTo(clip, { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power3.inOut',
        scrollTrigger: { trigger: fig, start: 'top 82%', once: true },
        onComplete: () => gsap.set(clip, { clearProps: 'clipPath' }),
      });
      gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 82%', once: true } });
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (speed) {
        gsap.fromTo(fig, { y: () => vw(-speed) }, {
          y: () => vw(speed), ease: 'none',
          scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      }
    });
    gsap.fromTo('.bigword', { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
    gsap.from('.badge', { scale: 0, rotate: -90, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.badge', start: 'top 88%', once: true } });
  }

  /* ═════════ 3. 30 YEARS — 시대별 핀 스택(03) + 모션 보강
     · 연도는 스크롤 진행도로 정하고 자리별 오도미터로 굴린다
     · 절반을 지나면 카드 A→B, 사진 A→B 와이프
     · 다음 시대가 덮는 동안 앞 시대는 축소·암전, 들어오는 시대는 제목 글자·사진·카드가 스크럽으로 리빌
     · 덮기 구간에 들어서면 Lenis로 다음 시대에 맞춰 붙는다(03과 같음) ═════════ */
  function history() {
    gsap.fromTo('.hist__big', { xPercent: 4 }, {
      xPercent: -10, ease: 'none',
      scrollTrigger: { trigger: '.hist__intro', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    let snapping = false, snapReady = false;
    setTimeout(() => { snapReady = true; }, 900);
    const snapTo = (y) => {
      if (!lenis || snapping || !snapReady || params.get('nosnap') === '1') return;
      snapping = true;
      lenis.scrollTo(y, { duration: 1.05, easing: (x) => 1 - Math.pow(1 - x, 3), lock: true, force: true, onComplete: () => { snapping = false; } });
      setTimeout(() => { snapping = false; }, 1500);
    };

    $$('.era').forEach((era) => {
      const pin = $('.era__pin', era), inner = $('.era__in', era);
      const yEl = $('.era__y', era), fill = $('.era__line b', era), line = $('.era__line', era);
      const imgs = $$('.era__ph img', era), ph = $('.era__ph', era), hex = $('.era__hex', era);
      const title = $('.era__t', era);
      const from = +era.dataset.from, to = +era.dataset.to;
      const setYear = odometer(yEl, from);

      // 제목 글자 나누기
      const txt = title.textContent;
      title.setAttribute('aria-label', txt);
      title.innerHTML = Array.from(txt).map((c) => (c === ' ' ? ' ' : `<span class="ch-i" aria-hidden="true">${c}</span>`)).join('');

      let lastYear = from, half = null;
      const put = (p) => {
        const y = Math.round(from + (to - from) * p);
        if (y !== lastYear) { setYear(y); lastYear = y; }
        const h = p >= 0.5;
        if (h !== half) { era.classList.toggle('is-b', h); half = h; }
        fill.style.transform = `scaleY(${p.toFixed(4)})`;
        line.style.setProperty('--lp', `${(p * 100).toFixed(2)}%`);
        const s = (1.12 - 0.12 * p).toFixed(4);
        imgs.forEach((im) => { im.style.transform = `scale(${s})`; });
      };
      put(0);

      ScrollTrigger.create({ trigger: era, start: 'top top', end: 'bottom top', pin, pinSpacing: false });
      ScrollTrigger.create({ trigger: era, start: 'top top', end: 'bottom bottom', onUpdate: (s) => put(s.progress), onRefresh: (s) => put(s.progress) });
      const c = ScrollTrigger.create({
        trigger: era, start: 'bottom bottom', end: 'bottom top',
        onEnter: () => snapTo(c.end),
        onEnterBack: () => snapTo(c.start),
      });

      // 덮이는 동안: 앞 시대 축소·암전
      gsap.fromTo(inner, { scale: 1, yPercent: 0 }, { scale: 0.9, yPercent: -3, ease: 'none', scrollTrigger: { trigger: era, start: 'bottom bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(pin, { '--dim': 0 }, { '--dim': 0.5, ease: 'none', scrollTrigger: { trigger: era, start: 'bottom bottom', end: 'bottom top', scrub: true } });

      // 들어오는 동안: 글자·사진·카드 리빌
      const enter = { trigger: era, start: 'top 80%', end: 'top 5%', scrub: 0.6 };
      gsap.fromTo($$('.ch-i', title), { yPercent: 110, rotate: 8, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, stagger: 0.04, ease: 'power3.out', scrollTrigger: enter });
      gsap.fromTo(ph, { clipPath: 'inset(16% 12% 16% 12% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'power2.out', scrollTrigger: enter });
      gsap.fromTo($('.era__cards', era), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: enter });
      gsap.fromTo($$('.era__k, .era__e, .era__nav', era), { x: -40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, stagger: 0.08, ease: 'power2.out', scrollTrigger: enter });

      // CI 육각 라인이 시대 내내 천천히 돈다
      gsap.fromTo(hex, { rotate: -24, scale: 0.9 }, { rotate: 36, scale: 1.08, ease: 'none', scrollTrigger: { trigger: era, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
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
