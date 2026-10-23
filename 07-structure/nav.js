/* 대학촌 공통 내비게이션 — 메가메뉴(데스크톱) · 전체 화면 메뉴(모바일) · 모바일 헤더 바탕. 원본 _compose/nav.js (메인·서브 공통) */
(function () {
  'use strict';
  var root = document.documentElement;
  var hd = document.getElementById('hd');
  if (!hd) return;
  var nav = hd.querySelector('.hd__nav');
  var desk = window.matchMedia('(min-width: 901px)');

  /* 메가메뉴: 메뉴에 올리면 열고, 헤더에서 벗어나면 닫는다. 키보드 포커스도 같다. */
  var closeT = 0;
  function open() {
    if (!desk.matches) return;
    clearTimeout(closeT);
    var subs = hd.querySelectorAll('.hd__sub'), h = 0;
    subs.forEach(function (s) { h = Math.max(h, s.scrollHeight); });
    hd.style.setProperty('--mega-h', (h + 64) + 'px');
    hd.classList.add('is-mega');
  }
  function close() { clearTimeout(closeT); closeT = setTimeout(function () { hd.classList.remove('is-mega'); }, 120); }
  if (nav) {
    nav.addEventListener('mouseenter', open);
    hd.addEventListener('mouseleave', close);
    nav.addEventListener('focusin', open);
    hd.addEventListener('focusout', function (e) { if (!hd.contains(e.relatedTarget)) close(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') hd.classList.remove('is-mega'); });
  }

  /* 모바일 전체 화면 메뉴 */
  var burger = document.getElementById('hdBurger'), mnav = document.getElementById('mnav');
  function setMenu(on) {
    root.classList.toggle('mnav-open', on);
    if (burger) { burger.setAttribute('aria-expanded', on ? 'true' : 'false'); burger.setAttribute('aria-label', on ? '메뉴 닫기' : '메뉴 열기'); }
    if (mnav) mnav.setAttribute('aria-hidden', on ? 'false' : 'true');
    var lenis = window.__g && window.__g.lenis;
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('mnav-open')); });
    mnav.querySelectorAll('.mnav__t').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.parentNode, on = !g.classList.contains('is-open');
        mnav.querySelectorAll('.mnav__g').forEach(function (x) { x.classList.remove('is-open'); x.querySelector('.mnav__t').setAttribute('aria-expanded', 'false'); });
        g.classList.toggle('is-open', on);
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    desk.addEventListener('change', function () { if (desk.matches) setMenu(false); });
  }

  /* 흰 바탕 헤더 — 모바일은 첫 화면을 지나면, 서브페이지는 데스크톱도 히어로를 지나면(히어로 없는 상세는 처음부터) */
  var ticking = false;
  var isSub = document.body.classList.contains('is-sub');
  var subHero = document.querySelector('.sp-hero');
  function solid() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop;
    var limit = !desk.matches ? 40 : isSub ? (subHero ? subHero.offsetHeight - hd.offsetHeight - 10 : -1) : Infinity;
    hd.classList.toggle('is-solid', y > limit);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(solid); } }, { passive: true });
  solid();
})();
