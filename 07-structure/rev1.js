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

  /* ═════════ 5. OEM·ODM 쇼케이스 — 컨베이어처럼 한 칸씩 지나가며 가운데 제품을 크게 ═════════ */
  (function showcase() {
    var sec = $('#showcase');
    if (!sec) return;
    var stage = $('#scStage', sec), belt = $('#scBelt', sec), ghost = $('#scGhost', sec), cap = $('#scCap', sec), nowEl = $('#scNow', sec);
    var items = $$('.g-sc__item', sec), N = items.length;
    var imgs = items.map(function (it) { return $('img', it); });
    var ratio = imgs.map(function (im) { return (+im.getAttribute('width')) / (+im.getAttribute('height')); });
    var pos = { v: 0 }, target = 0;                       // target: 지금 가고 있는 칸(연달아 눌러도 한 칸씩 더 간다)
    var shown = -1, timer = 0, inView = false, hover = false, drag = null, tween = null;
    var STEP = 2.6, DUR = 1.05;

    var mod = function (n) { return ((n % N) + N) % N; };
    var sizes = { sw: 0, hb: 0 };
    function measure() {
      var w = stage.clientWidth, h = stage.clientHeight;
      sizes.sw = Math.max(120, Math.min(300, w * 0.16));   // 칸 간격
      sizes.hb = h * 0.78;                                 // 가운데 병 높이
      imgs.forEach(function (im, i) {                      // 세트·박스처럼 가로로 긴 제품은 조금 낮게(면적을 비슷하게)
        var hh = sizes.hb * Math.min(1, 0.72 / Math.sqrt(ratio[i]));
        im.style.height = hh.toFixed(1) + 'px';
        im.style.width = (hh * ratio[i]).toFixed(1) + 'px';
      });
      layout();
    }

    function layout() {
      var sw = sizes.sw;
      for (var i = 0; i < N; i++) {
        var d = i - pos.v;
        d = d - N * Math.round(d / N);                     // 고리처럼 이어진다
        var ad = Math.abs(d), sg = d < 0 ? -1 : 1;
        var x = ad < 1 ? d * sw * 1.4 : sg * (1.4 + (ad - 1) * 0.95) * sw;
        var s = ad < 1 ? 1 - 0.46 * ad : Math.max(0.4, 0.54 - 0.04 * (ad - 1));
        var o = ad < 3.6 ? 1 : Math.max(0, 1 - (ad - 3.6));
        var it = items[i];
        it.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) scale(' + s.toFixed(4) + ')';
        it.style.opacity = o.toFixed(3);
        it.style.zIndex = String(100 - Math.round(ad * 10));
        it.style.visibility = o <= 0 ? 'hidden' : 'visible';
      }
      belt.style.backgroundPosition = (-pos.v * sw * 1.4).toFixed(1) + 'px 0';
      var k = mod(Math.round(pos.v));
      if (k !== shown) caption(k);
    }

    function caption(k) {
      var first = shown < 0;
      shown = k;
      var it = items[k];
      nowEl.textContent = ('0' + (k + 1)).slice(-2);
      var put = function () {
        $('.g-sc__cat', cap).textContent = it.dataset.cat;
        $('.g-sc__name', cap).textContent = it.dataset.name;
        $('.g-sc__partner', cap).innerHTML = it.dataset.who;
        ghost.textContent = it.dataset.cat;
        cap.classList.remove('is-swap');
      };
      if (first || !MOTION) { put(); return; }
      cap.classList.add('is-swap');
      clearTimeout(cap._t);
      cap._t = setTimeout(put, 220);
    }

    function go(to, dur) {
      target = to;
      if (tween) tween.kill();
      if (!MOTION) { pos.v = to; layout(); return; }
      tween = gsap.to(pos, { v: to, duration: dur == null ? DUR : dur, ease: 'power3.inOut', onUpdate: layout, onComplete: function () { tween = null; } });
    }
    function next(dir) { go((tween ? target : Math.round(pos.v)) + (dir || 1)); }

    function loop() {
      clearTimeout(timer);
      if (!MOTION || !inView || hover || drag || document.hidden) return;
      timer = setTimeout(function () { next(1); loop(); }, STEP * 1000);
    }

    $$('[data-sc]', sec).forEach(function (b) {
      b.addEventListener('click', function () { next(+b.dataset.sc); loop(); });
    });
    stage.addEventListener('mouseenter', function () { hover = true; loop(); });
    stage.addEventListener('mouseleave', function () { hover = false; loop(); });

    // 끌어서 넘기기
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (tween) tween.kill();
      drag = { x: e.clientX, v: pos.v, moved: false, id: e.pointerId };
      loop();
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      pos.v = drag.v - dx / (sizes.sw * 1.4);
      layout();
    });
    window.addEventListener('pointerup', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var moved = drag.moved;
      drag = null;
      go(Math.round(pos.v), 0.6);
      if (!moved) {                                       // 옆 제품을 누르면 그 제품으로
        var hit = e.target.closest && e.target.closest('.g-sc__item');
        if (hit) {
          var i = items.indexOf(hit), d = i - pos.v;
          d = d - N * Math.round(d / N);
          go(Math.round(pos.v + d));
        }
      }
      loop();
    });

    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      loop();
    }, { threshold: 0.35 }).observe(stage);
    document.addEventListener('visibilitychange', loop);

    measure();
    window.addEventListener('resize', measure);
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
