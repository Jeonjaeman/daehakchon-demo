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

  /* ═════════ 5. 30년의 발자취 — 레퍼런스 hy 발자취(한 자리 플립북 + 굴러가는 연도) + Histography(쌓여서 보이는 양).
     섹션 고정, 스크롤 진행도 p(0 → 1)가 곧 시간: 제품 i = p × N 번째가 왼쪽에 서고, 0 ~ i 번째가 오른쪽 선반에 쌓인다.
     연도 1996 → 2026(글자색 검정 → 주황). 끝에서 선반 전체가 컬러로 바뀌고 마무리 문구. ═════════ */
  (function history() {
    var sec = $('#history30');
    if (!sec) return;
    var frames = $$('.g-ts__f', sec), cells = $$('.g-ts__shelf li', sec), N = frames.length;
    var countEl = $('#tsCount', sec), digits = $$('.g-ts__dg > span', sec), yearEl = $('.g-ts__year', sec);
    var Y0 = 1996, Y1 = 2026, TRAIL = 10;
    var isMobile = window.matchMedia('(max-width: 900px)').matches;

    function setYear(y) {
      String(y).split('').forEach(function (d, k) { digits[k].style.transform = 'translateY(' + (-d) + 'em)'; });
    }
    var cur = -1;
    function show(i, p) {
      if (i !== cur) {
        if (frames[cur]) frames[cur].classList.remove('is-on');
        frames[i].classList.add('is-on');
        if (MOTION && cur >= 0) gsap.fromTo(frames[i], { scale: 1.05 }, { scale: 1, duration: 0.22, ease: 'power2.out', overwrite: true, transformOrigin: '50% 100%', xPercent: -50, x: 0 });
        cells.forEach(function (c, k) {
          c.classList.toggle('is-on', k <= i);
          c.classList.toggle('is-old', k < i - TRAIL);
          c.classList.toggle('is-now', k === i);
        });
        countEl.textContent = String(i + 1);
        cur = i;
      }
      setYear(Math.round(Y0 + (Y1 - Y0) * p));
      yearEl.style.color = MOTION ? gsap.utils.interpolate('#2b1d12', '#eb6100', Math.min(1, p * 1.1)) : '#eb6100';
      sec.style.setProperty('--p', p.toFixed(4));
      sec.classList.toggle('is-end', p > 0.985);
    }

    if (!MOTION || !window.ScrollTrigger) { show(N - 1, 1); return; }
    show(0, 0);
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: '+=' + (isMobile ? 260 : 340) + '%',   // 117개 기준 제품 하나에 화면 높이의 약 3%
      pin: '.g-ts__in', pinSpacing: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
      onUpdate: function (st) {
        var p = st.progress;
        show(Math.min(N - 1, Math.floor(p * N * 0.999)), p);
      }
    });
    ScrollTrigger.refresh();
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
