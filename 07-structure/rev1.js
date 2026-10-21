/* 대학촌 G안 1차 수정 (고객 10/20 「대학촌 홈페이지 수정요청.xls」) — main.js 다음에 실행된다. 원본은 _compose/g_rev1.js
   3 첫 접속 인트로 · 5 OEM·ODM 쇼케이스 · 7 제품 필름 → 상세페이지 · 8 문의 제목 한/영 자동 전환
   QA: ?intro=0 (인트로 끄기) · ?nomotion=1 (정적) */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var gsap = window.gsap;
  var MOTION = !!gsap && root.classList.contains('mo') && !root.classList.contains('is-static');

  // 토스트 — main.js와 같은 #toast
  var toast = $('#toast'), toastTimer = 0;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
  }

  /* ═════════ 3. 인트로 — 학교 엠블럼 → 식품공장 로고 → 막이 올라가며 메인 영상 ═════════ */
  (function intro() {
    var el = $('#gIntro');
    if (!el || !root.classList.contains('has-intro')) return;
    var video = $('.hero__video');
    var lenis = window.__g && window.__g.lenis;
    var finished = false, revealed = false;

    function reveal() {
      if (revealed) return;
      revealed = true;
      document.dispatchEvent(new CustomEvent('intro:reveal'));
      if (video) { try { video.currentTime = 0; } catch (e) {} var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }
    function done() {
      if (finished) return;
      finished = true;
      reveal();
      root.classList.add('intro-done');
      if (lenis) lenis.start();
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }

    if (!MOTION) { done(); return; }                     // GSAP이 없으면 바로 넘어간다
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    if (lenis) { lenis.scrollTo(0, { immediate: true, force: true }); lenis.stop(); }
    if (video) { video.pause(); }

    var school = $('[data-step="school"]', el), factory = $('[data-step="factory"]', el);
    var emb = $('.g-intro__emb', el), name = $$('.g-intro__name > *', el);
    var logo = $('.g-intro__logo', el), wipe = $('.wipe', el), line = $('.g-intro__line', el), edge = $('.g-intro__edge', el);

    var tl = gsap.timeline({ onComplete: done });
    tl.to(el, { '--glow': 1, duration: 1.4, ease: 'power1.out' }, 0)
      // 학교 엠블럼 — 흐릿하게 작게 → 또렷하게 튀어나온다
      .set(school, { autoAlpha: 1 }, 0.2)
      .fromTo(emb, { scale: 0.55, autoAlpha: 0, filter: 'blur(14px)' }, { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.95, ease: 'back.out(1.7)' }, 0.2)
      .fromTo(name, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0.55)
      .to(school, { autoAlpha: 0, scale: 1.08, filter: 'blur(8px)', duration: 0.5, ease: 'power2.in' }, 1.85)
      // 식품공장 로고 — 크게 → 제자리, 왼쪽부터 닦아 내듯
      .set(factory, { autoAlpha: 1 }, 2.25)
      .fromTo(logo, { scale: 1.22 }, { scale: 1, duration: 1.2, ease: 'expo.out' }, 2.25)
      .fromTo(wipe, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.95, ease: 'power3.inOut' }, 2.25)
      .to(line, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 2.85)
      // 막이 올라가며 영상 — 영상은 살짝 크게 시작해 제자리로
      .addLabel('exit', 3.7)
      .call(reveal, null, 'exit')
      .to(factory, { autoAlpha: 0, y: -30, duration: 0.45, ease: 'power2.in' }, 'exit')
      .to(edge, { opacity: 1, duration: 0.2 }, 'exit')
      .to(el, { yPercent: -100, duration: 1.05, ease: 'power4.inOut' }, 'exit+=0.2');
    if (video) tl.fromTo(video, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'power3.out' }, 'exit+=0.2');

    function skip() {                                     // 클릭·키·휠 → 바로 막이 올라간다
      if (finished) return;
      if (tl.time() < tl.labels.exit) tl.seek('exit');
      tl.timeScale(1.6);
    }
    el.addEventListener('click', skip);
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('wheel', skip, { once: true, passive: true });
    window.addEventListener('touchmove', skip, { once: true, passive: true });
    setTimeout(done, 9000);                               // 무슨 일이 있어도 9초 뒤에는 페이지를 연다
  })();

  /* ═════════ 7. 제품 필름 → 제품 상세페이지 ═════════ */
  (function filmLinks() {
    var stage = $('.film__stage');
    if (!stage) return;
    var names = $$('.callout h3').map(function (h) { return h.textContent.replace(/\s+/g, ' ').trim(); });
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.callout__more')) return;      // 버튼은 main.js의 data-toast
      var now = $('#filmNow');
      var i = Math.max(0, Math.min(names.length - 1, (parseInt(now && now.textContent, 10) || 1) - 1));
      say('데모 화면입니다. 실제 사이트에서는 \'' + names[i] + '\' 제품 상세페이지로 연결됩니다.');
    });
  })();

  /* ═════════ 5. 30년의 발자취 — 제품 컷이 세 줄로 빠르게 흘러간다(타임랩스). 처음 보일 때 연도가 1996 → 2026으로 돌며 잠깐 더 빨리 감긴다 ═════════ */
  (function history() {
    var sec = $('#history30');
    if (!sec) return;
    var rows = $$('.g-hs__row', sec);
    var yearEl = $('#hsYear', sec);
    var Y0 = 1996, Y1 = 2026;
    var isMobile = window.matchMedia('(max-width: 900px)').matches;

    // 05 마키와 같은 방식: 화면을 덮을 만큼 그룹을 복제하고 그룹 한 개 폭만큼 흘린다. 줄마다 속도(px/s)가 다르다.
    function setup(row) {
      var track = $('.g-hs__track', row), group = $('.g-hs__group', track);
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
      var speed = parseFloat(row.dataset.speed) || 160;
      if (isMobile) speed *= 0.62;
      track.style.setProperty('--shift', (-w) + 'px');
      track.style.setProperty('--dur', (w / speed).toFixed(2) + 's');
      row.classList.add('is-run');
    }
    if (!MOTION) return;                               // 정적: 첫 그룹만 멈춰 보인다
    rows.forEach(setup);
    var rw = window.innerWidth, rt = 0;
    var resetup = function () { clearTimeout(rt); rt = setTimeout(function () { rows.forEach(setup); }, 150); };
    window.addEventListener('resize', function () { if (window.innerWidth !== rw) { rw = window.innerWidth; resetup(); } });
    $$('.g-hs__group img', sec).forEach(function (im) { if (!im.complete) im.addEventListener('load', resetup, { once: true }); });

    // 처음 보일 때: 연도가 1996 → 2026으로 돌고, 그동안 제품은 3배 빨리 감기다가 제 속도로
    var played = false;
    function play() {
      if (played) return;
      played = true;
      sec.classList.add('is-in');
      var o = { y: Y0, s: 3 };
      gsap.to(o, {
        y: Y1, s: 1, duration: 3.2, ease: 'power3.out',
        onUpdate: function () { yearEl.textContent = String(Math.round(o.y)); sec.style.setProperty('--spd', o.s.toFixed(3)); },
        onComplete: function () { yearEl.textContent = String(Y1); sec.style.setProperty('--spd', '1'); }
      });
    }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) play(); }, { threshold: 0.3 }).observe(sec);
  })();

  /* ═════════ 8. 문의 제목 — 한글 ↔ 영어 자동 반복 ═════════ */
  (function ctaRotate() {
    var h = $('.cta__t.is-rot');
    if (!h) return;
    var spans = $$('.rot', h), k = 0, timer = 0, vis = false;
    function tick() {
      clearTimeout(timer);
      if (!vis || document.hidden) return;
      timer = setTimeout(function () {
        k = (k + 1) % spans.length;
        spans.forEach(function (s, i) { s.setAttribute('aria-hidden', i === k ? 'false' : 'true'); });
        tick();
      }, k === 0 ? 3600 : 3000);                          // 한글 3.6초 · 영어 3초
    }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; tick(); }, { threshold: 0.2 }).observe(h);
    document.addEventListener('visibilitychange', tick);
  })();
})();
