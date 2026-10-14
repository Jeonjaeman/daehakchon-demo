/* 대학촌 G·H 조합안 — 고객이 고른 기존 시안 단락의 원본 스크립트를 한 페이지에서 그대로 돌린다.
   01 A안: 헤더 · HERO · CHAPTER 01 RESEARCH · PRODUCT FILM      (01-editorial/main.js)
   03 C안: SOLUTION(Beyond Factory) · 30 YEARS                   (03-film/main.js)
   05 E안: 퀵메뉴 · 마키 · 소식 · CTA · 토스트                     (05-clean/main.js)
   06 F안: 30 YEARS 링 — three.js 전체 화면 장면 대신 캔버스 2D로 같은 링을 그린다
   Lenis·GSAP 인스턴스는 하나. 함수 본문은 원본에서 옮겼고, 바꾼 곳은 [조합] / [모션 보강] 주석으로 표시했다.
   자동 생성 파일이 아니라 _compose/main.src.js 가 원본이다(compose.py 가 07·08 폴더로 복사).
   QA: ?nomotion=1 (정적) · ?nosnap=1 (03 연혁 스냅 끔) · window.__g */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var qs = new URLSearchParams(location.search);
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NOMOTION = reduce || qs.get('nomotion') === '1' || !HAS_GSAP;
  var isMobile = window.matchMedia('(max-width: 900px)').matches;     // 01
  var mqMobile = window.matchMedia('(max-width: 900px)');             // 03
  var lenis = null;
  var jumping = false;     // [조합] 버튼으로 페이지 안 이동 중에는 03 연혁 스냅이 끼어들지 않게

  if (NOMOTION) { root.classList.add('is-static'); root.classList.remove('mo'); }

  /* ───────── 항상 동작하는 것 ───────── */

  // 05: 외부 연결 자리(스마트스토어·카탈로그·뉴스) 데모 안내 토스트
  var toast = $('#toast');
  var toastTimer = 0;
  $$('[data-toast]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      toast.textContent = btn.dataset.toast;
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
    });
  });

  // 01·05: 페이지 안 이동 — 01 헤더 버튼은 01 원본(보정 없음, 1.8s), 05 퀵메뉴는 05 원본(고정 헤더 높이만큼 띄움, 1.4s)
  $$('[data-goto]').forEach(function (btn) {
    var from05 = !!btn.closest('.s05');
    btn.addEventListener('click', function () {
      var sel = btn.dataset.goto;
      var target = sel === 'top' ? 0 : $(sel);
      if (target === null) return;
      var offset = from05 && target !== 0 ? -$('#hd').offsetHeight : 0;
      if (lenis) {
        jumping = true;
        clearTimeout(btn._jt);
        btn._jt = setTimeout(function () { jumping = false; }, 2600);
        lenis.scrollTo(target, { offset: offset, duration: from05 ? 1.4 : 1.8, force: true, onComplete: function () { jumping = false; } });
        return;
      }
      var y = target === 0 ? 0 : target.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: NOMOTION ? 'auto' : 'smooth' });
    });
  });

  // 05: 퀵메뉴 TOP 노출
  var qm = $('#qm');
  var ticking = false;
  function onScroll() {
    ticking = false;
    qm.classList.toggle('show-top', (window.pageYOffset || root.scrollTop) > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // 05: 마키 — 화면 폭을 덮을 만큼 그룹을 복제하고, 그룹 한 개 폭만큼 CSS keyframes로 흘린다
  var marquees = $$('.s05 .mq');
  function setupMarquee(mq) {
    var track = $('.mq__track', mq);
    var group = $('.mq__group', track);
    $$('[data-clone]', track).forEach(function (c) { track.removeChild(c); });
    var w = group.getBoundingClientRect().width;
    if (!w) return;
    var copies = Math.max(1, Math.ceil(window.innerWidth / w));
    for (var k = 0; k < copies; k++) {
      var clone = group.cloneNode(true);
      clone.setAttribute('data-clone', '');
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    var speed = parseFloat(mq.dataset.speed) || 50;   // px/s
    track.style.setProperty('--mq-shift', (-w) + 'px');
    track.style.setProperty('--mq-dur', (w / speed).toFixed(2) + 's');
    mq.classList.add('is-run');
  }
  if (!NOMOTION) {
    marquees.forEach(setupMarquee);
    var mqW = window.innerWidth;
    var mqTimer = 0;
    window.addEventListener('resize', function () {
      if (window.innerWidth === mqW) return;
      mqW = window.innerWidth;
      clearTimeout(mqTimer);
      mqTimer = setTimeout(function () { marquees.forEach(setupMarquee); }, 200);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { marquees.forEach(setupMarquee); });
  }

  // 01: 히어로 공장 영상
  var video = $('.hero__video');
  if (video) {
    if (NOMOTION) { video.removeAttribute('autoplay'); video.pause(); }
    else { var vp = video.play(); if (vp && vp.catch) vp.catch(function () {}); }
  }

  if (NOMOTION) return;

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
  window.__g = { lenis: lenis, ScrollTrigger: ScrollTrigger };

  var vw = function (n) { return window.innerWidth * n / 100; };

  // [조합] ScrollTrigger는 페이지 순서대로 만든다 — 03 SOLUTION 핀 여백이 아래 단락 위치 계산에 먼저 들어가야 한다.
  //        헤더 색 반전은 모든 단락(어두운 구간)을 보므로 맨 마지막.
  hero01();
  reveal01();
  reveal03();
  chapters01();
  if ($('#sol')) solution03();
  if ($('#hist')) history03();
  if ($('#ring')) ring06();
  film01();
  reveal05();
  header01();

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  /* ═════════ 01 A안 — 헤더 색 반전 (어두운 구간 위에서 흰색) ═════════ */
  function header01() {
    var hd = $('#hd');
    var on = { logo: [], nav: [] };
    var set = function (key, el, active) {
      var i = on[key].indexOf(el);
      if (active && i < 0) on[key].push(el);
      if (!active && i >= 0) on[key].splice(i, 1);
      hd.classList.toggle('logo-light', on.logo.length > 0);
      hd.classList.toggle('nav-light', on.nav.length > 0);
    };
    $$('[data-dark]').forEach(function (sec) {
      var full = sec.dataset.dark === 'full';
      if (!full && isMobile) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 44px', end: 'bottom 44px',
        onToggle: function (s) { set('logo', sec, s.isActive); if (full) set('nav', sec, s.isActive); }
      });
    });
    ScrollTrigger.create({
      start: 120, end: 'max',
      onUpdate: function (s) { hd.classList.toggle('nav-hide', s.direction > 0 && s.scroll() > window.innerHeight * 0.6); },
      onLeaveBack: function () { hd.classList.remove('nav-hide'); }
    });
  }

  /* ═════════ 01 A안 — HERO ═════════ */
  function hero01() {
    gsap.from('.hero__label span, .hero__title .ln > span, .hero__sub span', {
      yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.12, delay: 0.25
    });
    gsap.from('.hero__foot', { autoAlpha: 0, duration: 1.2, delay: 1.2 });
    gsap.to('.hero__body', {
      yPercent: -14, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: true }
    });
    gsap.to('.hero__media', {
      scale: 1.14, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ═════════ 공통 fade-up — 01·05 원본 값 그대로 (시안 범위별로 따로) ═════════ */
  function reveal01() {
    var revealIn = function (els, stagger) {
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: stagger, overwrite: true, clearProps: 'transform' });
    };
    gsap.set('.s01 [data-reveal]', { autoAlpha: 0, y: 50 });
    ScrollTrigger.batch('.s01 [data-reveal]', { start: 'top 90%', once: true, onEnter: function (batch) { revealIn(batch, 0.12); } });
    $$('.s01 [data-reveal-group]').forEach(function (group) {
      var items = Array.prototype.slice.call(group.children);
      gsap.set(items, { autoAlpha: 0, y: 70 });
      ScrollTrigger.create({ trigger: group, start: 'top 85%', once: true, onEnter: function () { revealIn(items, 0.16); } });
    });
  }
  function reveal05() {
    var revealIn = function (els, stagger) {
      gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: stagger, overwrite: true, clearProps: 'transform' });
    };
    gsap.set('.s05 [data-reveal]', { autoAlpha: 0, y: 50 });
    ScrollTrigger.batch('.s05 [data-reveal]', { start: 'top 88%', once: true, onEnter: function (batch) { revealIn(batch, 0.1); } });
    $$('.s05 [data-reveal-group]').forEach(function (group) {
      var items = Array.prototype.slice.call(group.children);
      gsap.set(items, { autoAlpha: 0, y: 60 });
      ScrollTrigger.create({ trigger: group, start: 'top 86%', once: true, onEnter: function () { revealIn(items, 0.12); } });
    });
  }

  /* ═════════ 01 A안 — CHAPTER 화보: clip 리빌 + 사진별 패럴랙스 + 배경 글자 ═════════ */
  function chapters01() {
    $$('.s01 .ch').forEach(function (ch) {
      $$('.fig', ch).forEach(function (fig) {
        var clip = $('.fig__clip', fig), img = $('img', fig);
        var speed = parseFloat(fig.dataset.speed || 0) * (isMobile ? 1.6 : 1);
        gsap.fromTo(clip, { clipPath: 'inset(0% 0% 100% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power3.inOut',
          scrollTrigger: { trigger: fig, start: 'top 82%', once: true },
          onComplete: function () { gsap.set(clip, { clearProps: 'clipPath' }); }
        });
        gsap.fromTo(img, { scale: 1.18 }, {
          scale: 1, duration: 1.8, ease: 'power3.out',
          scrollTrigger: { trigger: fig, start: 'top 82%', once: true }
        });
        gsap.fromTo(img, { yPercent: -5 }, {
          yPercent: 5, ease: 'none',
          scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true }
        });
        if (speed) {
          gsap.fromTo(fig, { y: function () { return vw(-speed); } }, {
            y: function () { return vw(speed); }, ease: 'none',
            scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
          });
        }
      });
      var word = $('.bigword', ch);
      if (word) {
        gsap.fromTo(word, { xPercent: 8 }, {
          xPercent: -8, ease: 'none',
          scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.4 }
        });
      }
      var badge = $('.badge', ch);
      if (badge) {
        gsap.from(badge, {
          scale: 0, rotate: -90, duration: 1, ease: 'back.out(1.6)',
          scrollTrigger: { trigger: badge, start: 'top 88%', once: true }
        });
      }
    });
  }

  /* ═════════ 01 A안 — PRODUCT FILM: 턴테이블 프레임 시퀀스 스크럽 (아이보리 스테이지, contain) ═════════ */
  function film01() {
    var film = $('#film'), stage = $('.film__stage'), canvas = $('#filmCanvas');
    if (!film || !canvas) return;
    var ctx = canvas.getContext('2d');
    var FRAME_DIR = '../assets/seq/turntable/';
    var STILL_SRC = '../assets/img/pr1_fiber_bottle.webp';
    var IVORY = '#fff6e9';
    var STEP = isMobile ? 2 : 1;
    var TOTAL = Math.floor(120 / STEP);
    var frames = new Array(TOTAL);
    var mode = 'pending';
    var still = null;
    var st = { p: 0 };
    var lastKey = '';
    var started = false;

    var pad = function (n) { return ('000' + n).slice(-4); };
    var srcOf = function (i) { return FRAME_DIR + pad(i * STEP + 1) + '.webp'; };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.round(stage.clientWidth * dpr), h = Math.round(stage.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; lastKey = ''; }
      render();
    }

    function pick() {
      if (mode === 'frames') {
        var want = Math.round(st.p * (TOTAL - 1)), i;
        for (i = want; i >= 0; i--) if (frames[i]) return { img: frames[i], key: 'f' + i, zoom: 1, pan: 0 };
        for (i = want + 1; i < TOTAL; i++) if (frames[i]) return { img: frames[i], key: 'f' + i, zoom: 1, pan: 0 };
      }
      if (still) return { img: still, key: 's' + st.p.toFixed(4), zoom: 1 + 0.26 * st.p, pan: (0.5 - st.p) * 0.05 };
      return null;
    }

    function render() {
      var f = pick();
      if (!f) return;
      var cw = canvas.width, ch = canvas.height;
      var key = f.key + '|' + cw + 'x' + ch;
      if (key === lastKey) return;
      lastKey = key;
      var img = f.img, iw = img.naturalWidth, ih = img.naturalHeight;
      var ir = iw / ih, cr = cw / ch;
      var portrait = cr < 0.8;
      var w, h, cy = 0.5;
      if (portrait) { w = cw * 1.2; h = w / ir; cy = 0.36; }
      else if (ir > cr) { w = cw; h = w / ir; }
      else { h = ch; w = h * ir; }
      w *= f.zoom; h *= f.zoom;
      var x = (cw - w) / 2 + f.pan * cw, y = ch * cy - h / 2;
      var r = Math.floor(x + w), b = Math.floor(y + h);
      ctx.fillStyle = IVORY;
      ctx.fillRect(0, 0, cw, ch);
      if (x > 0) ctx.drawImage(img, 0, 0, 2, ih, 0, y, Math.ceil(x) + 1, h);
      if (r < cw) ctx.drawImage(img, iw - 2, 0, 2, ih, r - 1, y, cw - r + 1, h);
      if (y > 0) ctx.drawImage(img, 0, 0, iw, 2, x, 0, w, Math.ceil(y) + 1);
      if (b < ch) ctx.drawImage(img, 0, ih - 2, iw, 2, x, b - 1, w, ch - b + 1);
      ctx.drawImage(img, x, y, w, h);
    }

    function loadStill() {
      mode = 'still';
      var img = new Image();
      img.onload = function () { still = img; lastKey = ''; render(); };
      img.src = STILL_SRC;
    }

    function loadRest() {
      var next = 1, active = 0, MAX = 6;
      (function pump() {
        while (active < MAX && next < TOTAL) {
          (function (i) {
            active++;
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () { frames[i] = img; active--; lastKey = ''; render(); pump(); };
            img.onerror = function () { active--; pump(); };
            img.src = srcOf(i);
          })(next++);
        }
      })();
    }

    function start() {
      if (started) return;
      started = true;
      var first = new Image();
      first.onload = function () { frames[0] = first; mode = 'frames'; lastKey = ''; render(); loadRest(); };
      first.onerror = loadStill;
      first.src = srcOf(0);
    }
    ScrollTrigger.create({ trigger: film, start: 'top bottom+=150%', end: 'max', once: true, onEnter: start });

    resize();
    window.addEventListener('resize', resize);
    ScrollTrigger.addEventListener('refresh', resize);

    var callouts = $$('.callout', film);
    var nowEl = $('#filmNow');
    var T0 = 0.13, GAP = 0.215;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: film, start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate: function (self) {
          var i = Math.max(0, Math.min(callouts.length - 1, Math.floor((self.progress - T0) / GAP)));
          var txt = ('0' + (i + 1)).slice(-2);
          if (nowEl.textContent !== txt) nowEl.textContent = txt;
        }
      }
    });
    tl.to(st, { p: 1, duration: 1, ease: 'none', onUpdate: render }, 0);
    tl.to('#filmBar', { scaleX: 1, duration: 1, ease: 'none' }, 0);
    tl.to('.film__intro', { autoAlpha: 0, y: -50, duration: 0.06, ease: 'power1.in' }, 0.05);
    callouts.forEach(function (c, i) {
      var s = T0 + i * GAP;
      tl.fromTo(c, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.055, ease: 'power2.out' }, s);
      if (i < callouts.length - 1) tl.to(c, { autoAlpha: 0, y: -60, duration: 0.055, ease: 'power2.in' }, s + 0.155);
    });
  }

  /* ═════════ 03 C안 — reveal (data-rv) ═════════ */
  function reveal03() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.s03 [data-rv]').forEach(function (el) { io.observe(el); });
  }

  /* ═════════ 03 C안 — SOLUTION: 카드가 올라와 456×600 카드 크기 clip-path에서 화면 전체로 확장 → 다음 카드 ═════════ */
  function solution03() {
    var sec = $('#sol');
    var cards = $$('.sol__card', sec), imgs = cards.map(function (c) { return $('img', c); });
    var tags = cards.map(function (c) { return $('.sol__tag', c); }), ovs = cards.map(function (c) { return $('.sol__ov', c); });
    var says = $$('.sol__say p', sec), nums = $$('.sol__num b', sec), bar = $('.sol__bar i', sec), head = $('.sol__hd', sec);
    var H = function () { return innerHeight; };
    var dist = function () { return Math.round(H() * (mqMobile.matches ? 3.6 : 5.4)); };

    var t = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: lenis ? true : 0.5, invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: 1 }   // [조합] refreshPriority
    });
    t.fromTo(cards[0], { y: function () { return H() * 0.5; } }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
      .fromTo(head, { y: function () { return H() * 0.06; } }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
      .fromTo(says[0], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1);

    var STEP = 4.1;
    cards.forEach(function (c, i) {
      var at = 1.1 + i * STEP;
      if (i > 0) {
        var r = at - 1.25;
        t.fromTo(c, { y: function () { return H(); } }, { y: 0, duration: 1.15, ease: 'power2.out' }, r)
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

  /* ═════════ 03 C안 — 30 YEARS: 시대마다 pinSpacing:false 로 고정, 다음 시대가 위로 덮는다.
     연도는 스크롤 진행도로 정하고, 덮기 구간에 들어서면 Lenis로 다음 시대에 붙는다(원본 그대로).
     [모션 보강] 고객 메모 "조금 더 모션이 있으면 좋겠습니다":
       연도 오도미터 · 카드 A→B 때 사진 와이프(책자 사진) · 카드 줄 순차 등장 · 제목 글자 리빌 · 덮이는 시대 축소·암전 ═════════ */
  function history03() {
    gsap.fromTo('.hist__big', { xPercent: 4 }, {
      xPercent: -10, ease: 'none',
      scrollTrigger: { trigger: '.hist__intro', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    var snapping = false, snapReady = false;
    setTimeout(function () { snapReady = true; }, 900);
    var snapTo = function (y) {
      if (!lenis || snapping || !snapReady || jumping || qs.get('nosnap') === '1') return;
      snapping = true;
      lenis.scrollTo(y, { duration: 1.05, easing: function (x) { return 1 - Math.pow(1 - x, 3); }, lock: true, force: true, onComplete: function () { snapping = false; } });
      setTimeout(function () { snapping = false; }, 1500);
    };

    $$('.era').forEach(function (era) {
      var pin = $('.era__pin', era), yEl = $('.era__y', era), fill = $('.era__line b', era), line = $('.era__line', era);
      var imgs = $$('.era__ph img', era);                                   // [모션 보강] 두 장 모두 천천히 당긴다
      var from = +era.dataset.from, to = +era.dataset.to;
      var setYear = odometer(yEl, from);                                    // [모션 보강] textContent → 오도미터
      var lastYear = -1, half = null;
      var put = function (p) {
        var y = Math.round(from + (to - from) * p);
        if (y !== lastYear) { setYear(y); lastYear = y; }
        var h = p >= 0.5;
        if (h !== half) { era.classList.toggle('is-b', h); half = h; }
        fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
        line.style.setProperty('--lp', (p * 100).toFixed(2) + '%');
        var s = 'scale(' + (1.12 - 0.12 * p).toFixed(4) + ')';
        imgs.forEach(function (im) { im.style.transform = s; });
      };
      put(0);
      ScrollTrigger.create({ trigger: era, start: 'top top', end: 'bottom top', pin: pin, pinSpacing: false });
      ScrollTrigger.create({ trigger: era, start: 'top top', end: 'bottom bottom', onUpdate: function (s) { put(s.progress); }, onRefresh: function (s) { put(s.progress); } });
      var c = ScrollTrigger.create({
        trigger: era, start: 'bottom bottom', end: 'bottom top',
        onEnter: function () { snapTo(c.end); },
        onEnterBack: function () { snapTo(c.start); }
      });

      // [모션 보강] 덮이는 동안 앞 시대가 살짝 작아지며 어두워진다
      var cover = { trigger: era, start: 'bottom bottom', end: 'bottom top', scrub: true };
      gsap.fromTo($$('.era__l, .era__r', era), { scale: 1, yPercent: 0 }, { scale: 0.93, yPercent: -3, ease: 'none', scrollTrigger: cover });
      gsap.fromTo(pin, { '--dim': 0 }, { '--dim': 0.45, ease: 'none', scrollTrigger: cover });

      // [모션 보강] 들어오는 동안 제목 글자·사진·카드가 스크럽으로 올라온다
      var title = $('.era__t', era), txt = title.textContent;
      title.setAttribute('aria-label', txt);
      title.innerHTML = Array.prototype.map.call(txt, function (ch) { return ch === ' ' ? ' ' : '<span class="ch-i" aria-hidden="true">' + ch + '</span>'; }).join('');
      var enter = { trigger: era, start: 'top 80%', end: 'top 5%', scrub: 0.6 };
      gsap.fromTo($$('.ch-i', title), { yPercent: 110, rotate: 8, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, stagger: 0.04, ease: 'power3.out', scrollTrigger: enter });
      gsap.fromTo($('.era__ph', era), { clipPath: 'inset(14% 10% 14% 10% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'power2.out', scrollTrigger: enter });
      gsap.fromTo($('.era__cards', era), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: enter });
    });
  }

  // [모션 보강] 자리마다 0–9 띠를 두고 해당 숫자로 굴린다
  function odometer(el, year) {
    var digits = String(year).length;
    el.textContent = '';
    var wrap = document.createElement('span');
    wrap.className = 'odo';
    wrap.setAttribute('aria-hidden', 'true');
    var strips = [];
    for (var i = 0; i < digits; i++) {
      var d = document.createElement('span');
      d.className = 'odo__d';
      var s = document.createElement('span');
      s.className = 'odo__s';
      s.innerHTML = '<b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b>';
      d.appendChild(s);
      wrap.appendChild(d);
      strips.push(s);
    }
    el.appendChild(wrap);
    var set = function (y) {
      var t = String(y);
      strips.forEach(function (s, i) { s.style.transform = 'translateY(' + (-Number(t[i]) * 10) + '%)'; });
      el.setAttribute('aria-label', t);
    };
    set(year);
    return set;
  }

  /* ═════════ 06 F안 — 30 YEARS 링
     원본은 three.js 전체 화면 장면의 일부(링 반지름 1.4, 그룹 x축 0.38rad 기울기 + 카메라 원근, 토러스 와이어 + 오렌지 선 + 연도 눈금 31개 + 노드 8개).
     여기서는 같은 링을 캔버스 2D 원근 투영으로 그린다. 2D 시선 고도 e(0.43 / 모바일 0.5)와 중심·반지름은 3D 기울기를 그대로 옮긴 값이 아니라
     06 원본 캡처(_qa/06-journey/p_78.png: 타원 세로/가로 ≈ 0.42)에 맞춰 잡은 값이다. 스크롤로 1996→2026 한 바퀴, 드래그(관성)로 더 돌리고,
     정면에 가장 가까운 노드가 현재 연도(큰 연도·설명·리스트 갱신은 06 원본 방식). ═════════ */
  function ring06() {
    var sec = $('#ring'), stage = $('#ringStage'), cv = $('#ringCv'), ctx = cv.getContext('2d');
    var labelWrap = $('#nodeLabels'), yearBig = $('#yearBig'), yearTitle = $('#yearTitle');
    var lis = $$('#yearList li');
    var NODES = lis.map(function (li) { return { y: +$('b', li).textContent, s: li.dataset.s, d: $('span', li).textContent }; });
    var labels = NODES.map(function (n) {
      var el = document.createElement('div');
      el.className = 'nlabel';
      el.innerHTML = '<b>' + n.y + '</b><small>' + n.s + '</small>';
      labelWrap.appendChild(el);
      return el;
    });
    var SPAN = 31, TAU = Math.PI * 2;
    var ang = function (yr) { return ((yr - 1996) / SPAN) * TAU; };

    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var dust = [];
    for (var di = 0; di < (mqMobile.matches ? 140 : 260); di++) dust.push({ x: rnd(), y: rnd(), z: rnd(), r: 0.4 + rnd() * 1.4, a: 0.12 + rnd() * 0.5, tw: rnd() * TAU });

    var st = { scroll: 0, off: 0, vel: 0, cur: 0, k: 0, mx: 0, my: 0, smx: 0, smy: 0, node: -1, drag: null, on: false, last: 0 };
    var W = 0, H = 0, raf = 0, avoid = [];

    function measureAvoid() {
      avoid.length = 0;
      var sr = stage.getBoundingClientRect();
      [$('#yearList'), $('.years__now', sec)].forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.width && getComputedStyle(n).display !== 'none') avoid.push({ x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top });
      });
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      labels.forEach(function (el) { el._w = 0; });
      measureAvoid();
      draw(performance.now());
    }
    // 06 원본 캡처 기준 배치: 링 중심은 화면 가운데에서 약간 왼쪽 아래, 가로 반지름 ≈ 화면 높이의 0.47
    var layout = function () {
      return mqMobile.matches
        ? { cx: W * 0.5, cy: H * 0.6, R: Math.min(W * 0.42, H * 0.3), e: 0.5 }
        : { cx: W * 0.425, cy: H * 0.59, R: Math.min(W * 0.26, H * 0.46), e: 0.43 };
    };

    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: function (s) { st.scroll = s.progress * 30; },
      onRefresh: function (s) { st.scroll = s.progress * 30; }
    });
    ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top top', onUpdate: function (s) { st.k = s.progress; }, onRefresh: function (s) { st.k = s.progress; }, onLeave: function () { setTimeout(measureAvoid, 300); } });
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { st.on = s.isActive; if (st.on && !raf) { st.last = performance.now(); raf = requestAnimationFrame(loop); } }
    });

    function loop(now) {
      var dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (!st.drag) { st.off += st.vel * dt; st.vel *= Math.exp(-dt * 3.2); }
      st.cur += (st.scroll + st.off - st.cur) * (1 - Math.exp(-dt * 6));
      st.smx += (st.mx - st.smx) * (1 - Math.exp(-dt * 4));
      st.smy += (st.my - st.smy) * (1 - Math.exp(-dt * 4));
      draw(now);
      raf = st.on ? requestAnimationFrame(loop) : 0;
    }

    function draw(now) {
      if (!W) return;
      var L = layout();
      var ek = 1 - Math.pow(1 - st.k, 3);
      var R = L.R * (0.86 + 0.14 * ek), cx = L.cx + st.smx * 14, cy = L.cy, e = L.e + st.smy * 0.04;
      var se = Math.sin(e), ce = Math.cos(e), F = R * 8;
      var rot = -ang(1996 + st.cur);
      var P = function (a, rr) {
        var x = rr * Math.sin(a + rot), z = rr * Math.cos(a + rot);
        var s = F / (F - z * ce);
        return { x: cx + x * s, y: cy + z * se * s, z: z / rr, s: s };
      };
      ctx.clearRect(0, 0, W, H);

      // 먼지 입자 (06 배경의 주황 먼지)
      dust.forEach(function (d) {
        var px = (d.x + st.smx * 0.012 * (0.4 + d.z)) * W, py = (d.y + st.smy * 0.012 * (0.4 + d.z)) * H;
        var a = d.a * (0.6 + 0.4 * Math.sin(now * 0.0012 + d.tw));
        ctx.fillStyle = 'rgba(255, 196, 140, ' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, d.r, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = ek;

      // 토러스 와이어(아이보리 .25) + 오렌지 선(.7) — 뒤쪽은 옅게
      var N = 124, bw = R * 0.026, inner = [], outer = [], mid = [], i;
      for (i = 0; i <= N; i++) { var a0 = (i / N) * TAU; inner.push(P(a0, R - bw)); outer.push(P(a0, R + bw)); mid.push(P(a0, R)); }
      for (i = 0; i < N; i++) {
        var dz = (mid[i].z + 1) / 2;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 246, 233, ' + (0.1 + 0.2 * dz).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(outer[i + 1].x, outer[i + 1].y);
        ctx.moveTo(outer[i].x, outer[i].y); ctx.lineTo(inner[i + 1].x, inner[i + 1].y);
        ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(inner[i + 1].x, inner[i + 1].y);
        ctx.moveTo(outer[i].x, outer[i].y); ctx.lineTo(outer[i + 1].x, outer[i + 1].y);
        ctx.stroke();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = 'rgba(242, 138, 22, ' + (0.35 + 0.45 * dz).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(mid[i].x, mid[i].y); ctx.lineTo(mid[i + 1].x, mid[i + 1].y); ctx.stroke();
      }
      // 연도 눈금 31개 (노드 연도는 길게)
      ctx.lineWidth = 1;
      for (var yr = 1996; yr <= 2026; yr++) {
        var big = NODES.some(function (n) { return n.y === yr; }), a1 = ang(yr);
        var p0 = P(a1, R * (big ? 0.9 : 0.96)), p1 = P(a1, R * (big ? 1.1 : 1.04));
        ctx.strokeStyle = 'rgba(255, 246, 233, ' + (0.15 + 0.4 * (p0.z + 1) / 2).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }

      // 현재 노드: 정면에 가장 가까운 노드 → 큰 연도·설명·리스트 (06 원본 방식)
      var yp = ((st.cur % SPAN) + SPAN) % SPAN, best = 0, bd = 1e9;
      NODES.forEach(function (n, j) { var dd = Math.abs(n.y - 1996 - yp); dd = Math.min(dd, SPAN - dd); if (dd < bd) { bd = dd; best = j; } });
      if (best !== st.node) {
        var first = st.node < 0;
        st.node = best;
        yearBig.textContent = String(NODES[best].y);
        yearTitle.textContent = NODES[best].d;
        lis.forEach(function (li, j) { li.classList.toggle('is-on', j === best); });
        if (!first) gsap.fromTo([yearBig, yearTitle], { yPercent: 18, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true });
      }

      // 노드 (뒤쪽부터)
      var pts = NODES.map(function (n, j) { return { i: j, p: P(ang(n.y), R) }; }).sort(function (a, b) { return a.p.z - b.p.z; });
      pts.forEach(function (o) {
        var p = o.p, on = o.i === st.node, dz2 = (p.z + 1) / 2, gr = (on ? 30 : 13) * p.s;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
        g.addColorStop(0, on ? 'rgba(255, 140, 40, .8)' : 'rgba(255, 210, 160, ' + (0.25 + 0.3 * dz2).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, gr, 0, TAU); ctx.fill();
        ctx.fillStyle = on ? '#f28a16' : 'rgba(255, 241, 220, ' + (0.5 + 0.5 * dz2).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, (on ? 13 : 5) * p.s, 0, TAU); ctx.fill();
      });

      // 라벨: 현재 노드 → 앞쪽 노드 순으로 놓고, 이미 놓인 라벨·큰 연도·우측 리스트와 겹치면 숨긴다(뒤쪽 반은 숨김)
      var placed = avoid.slice();
      pts.slice().sort(function (a, b) { return ((b.i === st.node) - (a.i === st.node)) || (b.p.z - a.p.z); }).forEach(function (o) {
        var p = o.p, j = o.i, on = j === st.node, el = labels[j], left = p.x > W * 0.6, gap = (on ? 16 : 6) * p.s;
        if (left !== el._l || on !== el._on) { el._l = left; el._on = on; el.classList.toggle('is-l', left); el.classList.toggle('is-on', on); el._w = 0; }
        if (!el._w) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
        var lx = left ? p.x - gap - el._w : p.x + gap, ly = p.y - 8;
        var box = { x0: lx - 4, y0: ly - 4, x1: lx + el._w + 4, y1: ly + el._h + 4 };
        var hit = placed.some(function (r) { return box.x0 < r.x1 && box.x1 > r.x0 && box.y0 < r.y1 && box.y1 > r.y0; });
        var show = ek > 0.5 && (on || (p.z > -0.25 && !hit));
        if (show) placed.push(box);
        el.style.transform = 'translate3d(' + lx.toFixed(1) + 'px, ' + ly.toFixed(1) + 'px, 0)';
        el.style.opacity = show ? '1' : '0';
      });
      ctx.globalAlpha = 1;
    }

    // 드래그(관성) · 커서 시차 — 06 원본: 화면 폭 한 번 끌기 ≈ 24년
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      st.drag = { x: e.clientX, t: performance.now() };
      st.vel = 0;
      stage.classList.add('is-drag');
    });
    window.addEventListener('pointermove', function (e) {
      if (st.on) { st.mx = (e.clientX / innerWidth) * 2 - 1; st.my = (e.clientY / innerHeight) * 2 - 1; }
      var d = st.drag;
      if (!d) return;
      var dx = e.clientX - d.x, now = performance.now(), kk = 24 / innerWidth;
      st.off -= dx * kk;
      st.vel = (-dx * kk) / Math.max(0.008, (now - d.t) / 1000);
      d.x = e.clientX; d.t = now;
    }, { passive: true });
    var up = function () { if (!st.drag) return; st.drag = null; stage.classList.remove('is-drag'); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    resize();
    window.addEventListener('resize', resize);
    ScrollTrigger.addEventListener('refresh', resize);
    window.__ring = st;
  }
})();
