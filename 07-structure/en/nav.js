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
    if (burger) { burger.setAttribute('aria-expanded', on ? 'true' : 'false'); burger.setAttribute('aria-label', on ? 'Close menu' : 'Open menu'); }
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


/* 10차 수정(고객 11/05): 카탈로그 웹진 뷰어. [data-catalog]를 누르면 모달로 열린다. 넓은 화면은 두 쪽 펼침+책장 넘김, 휴대폰은 한 쪽씩 */
(function () {
  'use strict';
  var BASE = '../../assets/catalog/', N = 8;
  var SPREADS = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 0]];
  var wide = window.matchMedia('(min-width: 901px) and (min-aspect-ratio: 1/1)');
  var root = document.documentElement;
  var el, book, pgL, pgR, leaf, front, back, count, btnP, btnN, btnZ, stage, ths;
  var page = 1, busy = false, opener = null, pushed = false;

  function img(n) { return n ? BASE + 'page_0' + n + '.webp' : ''; }
  function setPg(box, n) {
    box.classList.toggle('is-empty', !n);
    var i = box.querySelector('img');
    if (n) i.src = img(n); else i.removeAttribute('src');
  }
  function spreadOf(p) { return Math.floor(p / 2); }
  function preload(p) { [p - 2, p - 1, p + 1, p + 2, p + 3].forEach(function (n) { if (n >= 1 && n <= N) { new Image().src = img(n); } }); }

  function paint() {
    var one = !wide.matches;
    el.classList.toggle('is-one', one);
    var s = SPREADS[spreadOf(page)];
    if (one) { setPg(pgR, page); count.textContent = page + ' / ' + N; }
    else {
      setPg(pgL, s[0]); setPg(pgR, s[1]);
      count.textContent = (s[0] && s[1] ? s[0] + '~' + s[1] : (s[0] || s[1])) + ' / ' + N;
    }
    book.classList.toggle('is-front', !one && !s[0]);
    book.classList.toggle('is-back', !one && !s[1]);
    btnP.disabled = page <= 1;
    btnN.disabled = one ? page >= N : spreadOf(page) >= SPREADS.length - 1;
    ths.forEach(function (t, k) {
      var n = k + 1, on = one ? n === page : (n === s[0] || n === s[1]);
      t.classList.toggle('is-on', on);
      if (on && t.scrollIntoView && t.parentNode.scrollWidth > t.parentNode.clientWidth) t.parentNode.scrollLeft = t.offsetLeft - t.parentNode.clientWidth / 2;
    });
    preload(page);
  }

  function flip(to) {            // to: 옮겨 갈 쪽 번호(펼침 안의 아무 쪽)
    var a = SPREADS[spreadOf(page)], b = SPREADS[spreadOf(to)], fwd = spreadOf(to) > spreadOf(page);
    busy = true;
    setPg(pgL, fwd ? a[0] : b[0]);
    setPg(pgR, fwd ? b[1] : a[1]);
    front.querySelector('img').src = img(fwd ? a[1] : b[1]);
    back.querySelector('img').src = img(fwd ? b[0] : a[0]);
    front.style.visibility = (fwd ? a[1] : b[1]) ? '' : 'hidden';
    back.style.visibility = (fwd ? b[0] : a[0]) ? '' : 'hidden';
    leaf.classList.remove('is-run');
    leaf.style.transform = fwd ? 'rotateY(0deg)' : 'rotateY(-180deg)';
    leaf.classList.add('is-on');
    book.classList.toggle('is-front', !b[0]);
    book.classList.toggle('is-back', !b[1]);
    leaf.getBoundingClientRect();
    leaf.classList.add('is-run');
    leaf.style.transform = fwd ? 'rotateY(-180deg)' : 'rotateY(0deg)';
    var done = false;
    function end() {
      if (done) return;
      done = true;
      leaf.classList.remove('is-on', 'is-run');
      page = to; busy = false;
      paint();
    }
    leaf.addEventListener('transitionend', end, { once: true });
    setTimeout(end, 1000);
  }

  function goTo(to) {
    if (busy || to < 1 || to > N) return;
    if (!wide.matches) {
      var cls = to > page ? 'go-n' : 'go-p';
      page = to;
      pgR.classList.remove('go-n', 'go-p');
      paint();
      pgR.getBoundingClientRect();
      pgR.classList.add(cls);
    } else {
      var s = SPREADS[spreadOf(to)];
      to = s[0] || s[1];
      if (spreadOf(to) === spreadOf(page)) return;
      if (el.classList.contains('is-zoom')) { page = to; paint(); }
      else flip(to);
    }
    stage.scrollTop = 0; stage.scrollLeft = 0;
  }
  function step(d) {
    if (!wide.matches) { goTo(page + d); return; }
    var s = SPREADS[spreadOf(page) + d];
    if (s) goTo(s[0] || s[1]);
  }
  function zoom(on) {
    el.classList.toggle('is-zoom', on);
    book.style.setProperty('--z', on ? '2' : '1');
    btnZ.textContent = on ? 'Zoom out' : 'Zoom in';
    btnZ.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function setVh() { el.style.setProperty('--cv-vh', window.innerHeight + 'px'); }

  function build() {
    var thumbs = '';
    for (var i = 1; i <= N; i++) thumbs += '<button type="button" class="cv__th" data-p="' + i + '" aria-label="' + 'Page ' + i + '"><img src="' + BASE + 'thumb_0' + i + '.webp" alt="" loading="lazy"></button>';
    el = document.createElement('div');
    el.className = 'cv';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Daehakchon Catalog');
    el.innerHTML = '<div class="cv__top"><p class="cv__title">' + 'Daehakchon Catalog' + '</p><p class="cv__count" aria-live="polite"></p><div class="cv__acts">'
      + '<button type="button" class="cv__btn" data-a="zoom" aria-pressed="false">' + 'Zoom in' + '</button>'
      + '<a class="cv__btn cv__btn--main" href="' + BASE + 'daehakchon-catalog.pdf" download="Daehakchon_Catalog.pdf">' + 'Download All' + '</a>'
      + '<button type="button" class="cv__btn" data-a="x" aria-label="' + 'Close catalog' + '">×</button></div></div>'
      + '<div class="cv__stage"><div class="cv__book"><div class="cv__pg cv__pg--l"><img alt=""></div><div class="cv__pg cv__pg--r"><img alt=""></div>'
      + '<div class="cv__leaf"><div class="cv__f"><img alt=""></div><div class="cv__b"><img alt=""></div></div></div>'
      + '<button type="button" class="cv__nav cv__nav--p" data-a="p" aria-label="' + 'Previous page' + '">‹</button><button type="button" class="cv__nav cv__nav--n" data-a="n" aria-label="' + 'Next page' + '">›</button></div>'
      + '<div class="cv__thumbs">' + thumbs + '</div>';
    document.body.appendChild(el);
    book = el.querySelector('.cv__book'); stage = el.querySelector('.cv__stage');
    pgL = el.querySelector('.cv__pg--l'); pgR = el.querySelector('.cv__pg--r');
    leaf = el.querySelector('.cv__leaf'); front = el.querySelector('.cv__f'); back = el.querySelector('.cv__b');
    count = el.querySelector('.cv__count'); btnP = el.querySelector('.cv__nav--p'); btnN = el.querySelector('.cv__nav--n');
    btnZ = el.querySelector('[data-a="zoom"]');
    ths = [].slice.call(el.querySelectorAll('.cv__th'));
    el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'), t = e.target.closest('.cv__th');
      if (a) {
        var k = a.dataset.a;
        if (k === 'x') close();
        else if (k === 'p') step(-1);
        else if (k === 'n') step(1);
        else if (k === 'zoom') zoom(!el.classList.contains('is-zoom'));
      } else if (t) goTo(+t.dataset.p);
      else if (wide.matches && !el.classList.contains('is-zoom') && e.target.closest('.cv__pg')) step(e.target.closest('.cv__pg--r') ? 1 : -1);   // 책장 클릭으로 넘기기
    });
    var sx = 0, sy = 0, multi = false;
    stage.addEventListener('touchstart', function (e) { multi = e.touches.length > 1; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (multi || el.classList.contains('is-zoom')) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {   // 포커스를 뷰어 안에 가둔다
        var f = [].filter.call(el.querySelectorAll('a,button'), function (x) { return !x.disabled; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    wide.addEventListener('change', function () { if (el.classList.contains('is-on')) paint(); });
    window.addEventListener('resize', setVh);
  }

  function uiClose() {
    el.classList.remove('is-on');
    root.classList.remove('cv-open');
    var lenis = window.__g && window.__g.lenis;
    if (lenis) lenis.start();
    if (opener) opener.focus();
  }
  function close() {
    if (pushed) { pushed = false; history.back(); }   // popstate에서 닫힌다
    uiClose();
  }
  function open(from) {
    if (!el) build();
    opener = from;
    setVh();
    zoom(false);
    page = 1; busy = false;
    paint();
    el.classList.add('is-on');
    root.classList.add('cv-open');
    var lenis = window.__g && window.__g.lenis;
    if (lenis) lenis.stop();
    if (!pushed) { history.pushState({ cv: 1 }, ''); pushed = true; }   // 휴대폰 뒤로 가기로 닫히게
    el.querySelector('[data-a="x"]').focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-catalog]');
    if (t) { e.preventDefault(); open(t); }
  });
  window.addEventListener('popstate', function () {
    if (el && el.classList.contains('is-on')) { pushed = false; uiClose(); }
  });
  window.addEventListener('keydown', function (e) {
    if (!el || !el.classList.contains('is-on')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
})();
