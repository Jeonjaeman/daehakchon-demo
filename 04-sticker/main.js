/* 대학촌 — 04 sticker (D. Playful Orange)
   GSAP ScrollTrigger + Lenis(768px 초과에서만) + position:sticky
   연출 초기 상태는 JS 에서만 건다(html.js-anim). ?nomotion=1 · prefers-reduced-motion · GSAP 로드 실패 시
   연출은 전부 건너뛰고 정적 레이아웃(모든 스티커·레이어가 보이는 상태)으로 둔다. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var noMotion = /[?&]nomotion=1/.test(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var motion = !noMotion && !reduce && !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  if (!motion) {
    root.classList.add('no-motion');
    root.classList.remove('js-pre');
  }

  /* ───────── 항상 동작하는 것 ───────── */

  // MENU: hover 는 CSS(hover 가능한 기기만), 클릭·Esc·바깥 클릭은 여기서
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  var setMenu = function (open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!menu.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  // KR / EN / CN — 표시만 (헤더·메뉴 두 그룹을 함께 맞춘다)
  var langBtns = $$('.lang button');
  langBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var code = b.textContent.trim();
      langBtns.forEach(function (x) { x.setAttribute('aria-pressed', x.textContent.trim() === code ? 'true' : 'false'); });
    });
  });

  // 페이지 안 이동
  $$('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = $(btn.dataset.goto);
      if (!target) return;
      setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else target.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
    });
  });

  // 링크 없는 버튼: 데모 안내 토스트
  var toast = $('#toast'), toastTimer = 0;
  $$('[data-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!toast) return;
      toast.textContent = '데모 화면입니다 — 실제 링크는 연결되지 않습니다.';
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
    });
  });

  // 헤더 흰색 반전: [data-dark] 구간이 헤더 중앙선 아래에 있을 때
  (function () {
    var hd = $('#hd'), darks = $$('[data-dark]'), queued = false;
    if (!hd || !darks.length) return;
    var check = function () {
      queued = false;
      var line = hd.offsetHeight * 0.8, on = false;
      darks.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) on = true;
      });
      hd.classList.toggle('is-dark', on);
    };
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(check); }
    }, { passive: true });
    window.addEventListener('resize', check);
    check();
  })();

  if (!motion) return;

  /* ───────── 연출 시작 ───────── */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add('js-anim');

  if (window.Lenis && window.innerWidth > 768) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  var vw = function (n) { return window.innerWidth * n / 100; };
  var vh = function (n) { return window.innerHeight * n / 100; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var rOf = function (el) { return parseFloat(el.style.getPropertyValue('--r')) || 0; };

  /* 스티커 리빌 — crav: start 'top 70%' → fromTo(opacity 0, scale .8, rotate -15+30*random, y 50) */
  var stickerFrom = function () {
    return { autoAlpha: 0, scale: 0.8, rotate: -15 + 30 * Math.random(), y: 50 };
  };
  var stickerIn = function (el, delay) {
    return gsap.fromTo(el, stickerFrom(), {
      autoAlpha: 1, scale: 1, rotate: rOf(el), y: 0,
      duration: 0.9, ease: 'back.out(2.2)', delay: delay || 0, overwrite: 'auto'
    });
  };

  /* ───────── 01 HERO ───────── */
  (function () {
    var hero = $('.hero');
    if (!hero) return;

    // 등장: 글자 → 병 → 영문 → 원료 → 스티커 4개(랜덤 회전) → 하단 카피
    var tl = gsap.timeline({ delay: 0.15 });
    tl.from('.hero .ch', {
      yPercent: 70, scale: 0.7, autoAlpha: 0,
      rotate: function () { return rnd(-14, 14); },
      duration: 1.1, ease: 'back.out(1.8)', stagger: 0.09
    }, 0)
      .from('.hero__bottle', { yPercent: 45, rotate: -12, autoAlpha: 0, duration: 1.3, ease: 'power4.out' }, 0.25)
      .from('.hero__en', { yPercent: 70, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.55)
      .from('.hero__acc', { scale: 0.4, rotate: -40, autoAlpha: 0, duration: 1, ease: 'back.out(1.7)', stagger: 0.12 }, 0.5)
      .from('.hero__copy', { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 0.95);
    $$('.hero__stk').forEach(function (el, i) { tl.add(stickerIn(el), 0.75 + i * 0.13); });
    root.classList.remove('js-pre');

    // 스크롤: 층마다 다른 속도 (뒷글자 → 병 → 앞글자)
    var st = function (end) {
      return { trigger: hero, start: 'top top', end: end || 'bottom top', scrub: true, invalidateOnRefresh: true };
    };
    gsap.to('#heroProd', { y: function () { return -vh(18); }, rotate: 6, ease: 'none', scrollTrigger: st() });
    gsap.to('.hero .ch--1, .hero .ch--2', { y: function () { return vh(7); }, ease: 'none', scrollTrigger: st() });
    gsap.to('.hero .ch--3', { y: function () { return vh(3); }, ease: 'none', scrollTrigger: st() });
    gsap.to('.hero__en', { y: function () { return -vh(9); }, ease: 'none', scrollTrigger: st() });
    gsap.to('.hero__foot', { autoAlpha: 0, y: -40, ease: 'none', scrollTrigger: st('45% top') });
    // 스티커·원료는 translate(--py) 로 움직여 GSAP transform(등장 회전)과 겹치지 않게 한다
    $$('[data-speed]', hero).forEach(function (el) {
      var s = parseFloat(el.dataset.speed) || 0;
      gsap.fromTo(el, { '--py': '0px' }, {
        '--py': function () { return (-s * vh(1.8)).toFixed(1) + 'px'; },
        ease: 'none', scrollTrigger: st()
      });
    });

    // 마우스: 병·스티커·원료가 깊이별로 따라온다 (PC, hover 가능 기기만)
    if (isMobile || !window.matchMedia('(hover: hover)').matches) return;
    var items = [{ el: $('.hero__prod-in'), d: 14 }];
    $$('.hero__stk').forEach(function (el, i) { items.push({ el: el, d: i % 2 ? -24 : 30 }); });
    var back = $('.hero__acc--back'), front = $('.hero__acc--front');
    if (back) items.push({ el: back, d: -16 });
    if (front) items.push({ el: front, d: 40 });
    var tx = 0, ty = 0, cx = 0, cy = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 2 - 1;
      ty = (e.clientY - r.top) / r.height * 2 - 1;
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    gsap.ticker.add(function () {
      if (Math.abs(tx - cx) < 0.0005 && Math.abs(ty - cy) < 0.0005) return;
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      items.forEach(function (it) {
        it.el.style.setProperty('--mx', (cx * it.d).toFixed(2) + 'px');
        it.el.style.setProperty('--my', (cy * it.d).toFixed(2) + 'px');
      });
    });
  })();

  /* ───────── 스티커 리빌 (히어로·스티커 월 제외 전부) ───────── */
  var wallItems = $$('.wall [data-sticker]');
  $$('[data-sticker]').forEach(function (el) {
    if (wallItems.indexOf(el) > -1) return;
    gsap.set(el, { autoAlpha: 0 });
    ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: function () { stickerIn(el); } });
  });
  // 스티커 월: 같은 줄에 걸린 것끼리 묶어 차례로 붙인다
  gsap.set(wallItems, { autoAlpha: 0 });
  ScrollTrigger.batch(wallItems, {
    start: 'top 70%', once: true,
    onEnter: function (batch) { batch.forEach(function (el, i) { stickerIn(el, i * 0.07); }); }
  });

  /* ───────── 공통 등장 ───────── */
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 80 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 85%', once: true,
    onEnter: function (batch) {
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, clearProps: 'transform' });
    }
  });
  $$('[data-reveal-group]').forEach(function (group) {
    var items = Array.prototype.slice.call(group.children);
    gsap.set(items, { autoAlpha: 0, y: 60 });
    ScrollTrigger.create({
      trigger: group, start: 'top 85%', once: true,
      onEnter: function () { gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'back.out(1.5)', stagger: 0.1, clearProps: 'transform' }); }
    });
  });
  // 섹션 거대 제목: 줄마다 튀어 오른다
  ['.lineup__title', '.partners__title', '.cta__title'].forEach(function (sel) {
    var lines = $$(sel + ' .ln');
    if (!lines.length) return;
    gsap.from(lines, {
      yPercent: 60, autoAlpha: 0, scale: 0.85,
      rotate: function (i) { return i % 2 ? 5 : -5; },
      duration: 1, ease: 'back.out(1.7)', stagger: 0.12,
      scrollTrigger: { trigger: sel, start: 'top 82%', once: true }
    });
  });

  /* ───────── 웨이브: 지나갈 때 출렁 ───────── */
  $$('.wave').forEach(function (w) {
    gsap.fromTo(w, { scaleY: 0.55 }, {
      scaleY: 1.2, ease: 'none',
      scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ───────── 02 MARQUEE — 띠가 스크롤 방향으로 밀린다 ───────── */
  [['.mq__band--dark .mq__move', -1], ['.mq__band--orange .mq__move', 1]].forEach(function (b) {
    gsap.fromTo(b[0], { x: function () { return vw(7) * b[1]; } }, {
      x: function () { return -vw(7) * b[1]; }, ease: 'none',
      scrollTrigger: { trigger: '.mq', start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true }
    });
  });

  /* ───────── 03 EVERY LAYER — 300vh sticky 안 하나의 타임라인(scrub:1) ───────── */
  (function () {
    var track = $('.layer__track');
    if (!track) return;
    var lyrs = $$('.lyr', track).sort(function (a, b) { return a.dataset.step - b.dataset.step; });
    var steps = $$('.step', track);
    var now = $('#layerNow');
    var LEFT = [true, true, false, false, true];   // 01·02·05 왼쪽, 03·04 오른쪽
    var T0 = 0.6, GAP = 1.4;

    var tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 1 }
    });
    tl.fromTo('.layer__title', { scale: 1.16, yPercent: 10 }, { scale: 1, yPercent: 0, duration: 1 }, 0);

    lyrs.forEach(function (l, i) {
      var r = rOf(l), at = T0 + i * GAP;
      tl.fromTo(l, { y: 120, rotate: r + (i % 2 ? 8 : -8), autoAlpha: 0 },
        { y: 0, rotate: r, autoAlpha: 1, duration: 1.1 }, at);
      var s = steps[i];
      if (!s) return;
      if (isMobile) {
        // 모바일: 상단 한 줄 캡션이 단계마다 교체된다
        tl.fromTo(s, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.35);
        if (i < steps.length - 1) tl.to(s, { autoAlpha: 0, y: -24, duration: 0.4, ease: 'power2.in' }, at + GAP - 0.2);
      } else {
        tl.fromTo(s, { autoAlpha: 0, x: LEFT[i] ? -50 : 50, scale: 0.85 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'back.out(2)' }, at + 0.45);
      }
    });
    tl.to({}, { duration: 0.9 });

    tl.eventCallback('onUpdate', function () {
      var t = tl.time(), n = 0;
      for (var i = 0; i < lyrs.length; i++) if (t >= T0 + i * GAP + 0.4) n = i + 1;
      var txt = ('0' + Math.max(1, n)).slice(-2);
      if (now && now.textContent !== txt) now.textContent = txt;
    });
    if (now) now.textContent = '01';
  })();

  /* ───────── 05 QUALITY THAT TRAVELS — 점선 경로 + 비행기(getPointAtLength) ───────── */
  (function () {
    var svg = $$('[data-route]').filter(function (s) { return s.getBoundingClientRect().width > 0; })[0];
    if (!svg) return;
    var path = $('.route__path', svg), reveal = $('.route__reveal', svg), plane = $('.plane', svg);
    var L = path.getTotalLength();
    reveal.style.strokeDasharray = L + ' ' + L;
    reveal.style.strokeDashoffset = L;

    // 각 도시 스티커가 경로의 몇 % 지점에 있는지 미리 잰다
    var cities = $$('.city', svg).map(function (g, i) {
      var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform'));
      var x = +m[1], y = +m[2], best = 0, bd = Infinity;
      for (var l = 0; l <= L; l += 3) {
        var p = path.getPointAtLength(l), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d < bd) { bd = d; best = l; }
      }
      return { inner: $('.city__in', g), dot: $('.city__dot', g), f: best / L, r: i % 2 ? 4 : -4 };
    });

    var st = { p: 0 };
    var place = function () {
      var l = st.p * L;
      var c = path.getPointAtLength(l);
      var a = path.getPointAtLength(Math.max(0, l - 2)), b = path.getPointAtLength(Math.min(L, l + 2));
      var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      plane.setAttribute('transform', 'translate(' + c.x.toFixed(1) + ',' + c.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
      reveal.style.strokeDashoffset = (L * (1 - st.p)).toFixed(1);
    };

    var tl = gsap.timeline({
      scrollTrigger: isMobile
        ? { trigger: svg, start: 'top 80%', end: 'bottom 60%', scrub: 1 }
        : { trigger: '.travel__track', start: 'top top', end: 'bottom bottom', scrub: 1 }
    });
    tl.to(st, { p: 1, duration: 1, ease: 'none', onUpdate: place }, 0);
    cities.forEach(function (c) {
      var at = Math.max(0, c.f - 0.035);
      gsap.set(c.inner, { transformOrigin: '50% 100%' });
      tl.fromTo(c.dot, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.025, ease: 'back.out(3)' }, at)
        .fromTo(c.inner, stickerFrom(), { autoAlpha: 1, scale: 1, rotate: c.r, y: 0, duration: 0.06, ease: 'back.out(2.2)' }, at);
    });
    place();
  })();

  /* ───────── 08 FOOTER — 거대 문구가 양쪽으로 밀린다 ───────── */
  $$('.ft__giant .ln').forEach(function (ln, i) {
    gsap.fromTo(ln, { x: function () { return vw(i ? -8 : 8); } }, {
      x: 0, ease: 'none',
      scrollTrigger: { trigger: '.ft', start: 'top bottom', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
    });
  });

  /* ───────── 우측 고정 구매하기: 스크롤 속도만큼 늦게 따라온다 ───────── */
  (function () {
    var buy = $('#buy');
    if (!buy || isMobile) return;
    gsap.from(buy, { scale: 0, rotate: -120, autoAlpha: 0, duration: 1, ease: 'back.out(1.8)', delay: 1.4 });
    var yTo = gsap.quickTo(buy, 'y', { duration: 0.7, ease: 'power3.out' });
    var rTo = gsap.quickTo(buy, 'rotation', { duration: 0.7, ease: 'power3.out' });
    var settle = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-1, 1, self.getVelocity() / 3000);
        yTo(-v * 70);
        rTo(v * 16);
        clearTimeout(settle);
        settle = setTimeout(function () { yTo(0); rTo(0); }, 140);
      }
    });
  })();

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
