/* 대학촌 — 05-clean (E. Campus Clean)
   색 블록 + 물결 띠 + 카운트업 + 제품 탭 + 인증 마키 + 아이소메트릭 호버
   연출 초기 상태는 전부 JS에서만 건다(html.js-anim). JS 실패·모션 축소·?nomotion=1 이면
   본문은 최종 상태 그대로 보인다(카운터는 최종 숫자, 마키는 가로 스크롤). */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var noMotion = /[?&]nomotion=1(&|$)/.test(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = !noMotion && !reduce;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  var hd = $('#hd');
  var qm = $('#qm');

  /* ───────── 항상 동작하는 것 ───────── */

  // 헤더: 스크롤하면 오렌지 바 / 퀵메뉴 TOP 노출
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop;
    hd.classList.toggle('is-solid', y > 24);
    qm.classList.toggle('show-top', y > window.innerHeight * 0.6);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // 페이지 안 이동 (고정 헤더 높이만큼 띄운다)
  function goTo(sel) {
    var target = sel === 'top' ? 0 : $(sel);
    if (target === null) return;
    var offset = target === 0 ? 0 : -hd.offsetHeight;
    if (lenis) { lenis.scrollTo(target, { offset: offset, duration: 1.4 }); return; }
    var y = target === 0 ? 0 : target.getBoundingClientRect().top + window.pageYOffset + offset;
    window.scrollTo({ top: y, behavior: motion ? 'smooth' : 'auto' });
  }
  $$('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () { goTo(btn.dataset.goto); });
  });

  // 외부 연결 자리(스마트스토어·카탈로그·오시는 길·뉴스): 데모 안내 토스트
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

  // KR / EN / CN — 표시만 바뀐다
  var langs = $$('.lang button');
  langs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      langs.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    });
  });

  // 제품 탭 (자사제품 / OEM / ODM) — 링크 없이 패널만 바꾼다
  var tabs = $$('[role="tab"]');
  function activate(tab, focus) {
    var shown = null;
    tabs.forEach(function (t) {
      var on = t === tab;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
      if (on) shown = panel;
    });
    if (focus) tab.focus();
    if (motion && hasGsap) {
      gsap.fromTo($$('.pcard, .ocard, .panel-foot, .odm__item, .odm__side', shown),
        { y: 28, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, overwrite: true, clearProps: 'transform' });
    }
    if (hasGsap) ScrollTrigger.refresh();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      if (!tab.classList.contains('is-active')) activate(tab, false);
    });
    tab.addEventListener('keydown', function (e) {
      var n = tabs.length, j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j < 0) return;
      e.preventDefault();
      activate(tabs[j], true);
    });
  });

  // 마키: 화면 폭을 덮을 만큼 그룹을 복제하고, 그룹 한 개 폭만큼 CSS keyframes로 흘린다
  var marquees = $$('.mq');
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
  if (motion) {
    marquees.forEach(setupMarquee);
    var mqW = window.innerWidth;
    var mqTimer = 0;
    window.addEventListener('resize', function () {
      if (window.innerWidth === mqW) return;   // 모바일 주소창 높이 변화는 무시
      mqW = window.innerWidth;
      clearTimeout(mqTimer);
      mqTimer = setTimeout(function () { marquees.forEach(setupMarquee); }, 200);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { marquees.forEach(setupMarquee); });
    }
  }

  if (!motion || !hasGsap) return;

  /* ───────── 연출 시작 ───────── */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('js-anim');

  if (window.Lenis && window.innerWidth > 768) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* 01 HERO 등장 */
  gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })
    .from('.hero__label, .hero__title .ln, .hero__sub, .hero__btns', { y: 46, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0)
    .from('.hero__title strong', { '--hl': 0, duration: 0.8, ease: 'power2.inOut' }, 0.75)
    .from('.hero__frame', { y: 40, scale: 0.96, autoAlpha: 0, duration: 1.2 }, 0.1)
    .from('.hero__tag-txt', { scale: 0, rotate: -24, autoAlpha: 0, duration: 0.7, ease: 'back.out(1.8)' }, 0.9)
    .fromTo('.hero__tag-arrow path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, stagger: 0.3, ease: 'power1.inOut' }, 1.15)
    .from('.counters', { y: 50, autoAlpha: 0, duration: 1 }, 0.45);

  /* 카운트업: 뷰포트 진입 시 0 → 최종값 */
  var nums = $$('[data-count]');
  nums.forEach(function (el) { el.textContent = '0'; });
  ScrollTrigger.create({
    trigger: '#counters', start: 'top 92%', once: true,
    onEnter: function () {
      nums.forEach(function (el, i) {
        var end = parseFloat(el.dataset.count);
        var o = { v: 0 };
        gsap.to(o, {
          v: end, duration: 1.8, delay: 0.55 + i * 0.12, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(o.v); },
          onComplete: function () { el.textContent = el.dataset.count; }
        });
      });
    }
  });

  /* 공통 fade-up */
  var revealIn = function (els, stagger) {
    gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: stagger, overwrite: true, clearProps: 'transform' });
  };
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 50 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: function (batch) { revealIn(batch, 0.1); }
  });
  $$('[data-reveal-group]').forEach(function (group) {
    var items = Array.prototype.slice.call(group.children);
    gsap.set(items, { autoAlpha: 0, y: 60 });
    ScrollTrigger.create({
      trigger: group, start: 'top 86%', once: true,
      onEnter: function () { revealIn(items, 0.12); }
    });
  });

  /* 사진 안쪽 살짝 시차 (특장점 캠퍼스 · 인증 클린룸) */
  $$('.feat__photo-clip img, .cert__photo-clip img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* 03 물결 띠 위 대표 제품: 떠오르며 걸친다 + 배지 */
  gsap.set('.show__bottle', { x: 0, xPercent: -50 });
  gsap.fromTo('.show__bottle', { yPercent: 10 }, {
    yPercent: -3, ease: 'none',
    scrollTrigger: { trigger: '.show', start: 'top bottom', end: 'bottom 45%', scrub: true }
  });
  gsap.from('.show__badge', {
    scale: 0, rotate: -70, duration: 0.8, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.show', start: 'top 70%', once: true }
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
