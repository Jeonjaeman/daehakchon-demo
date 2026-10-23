/* 대학촌 서브페이지 동작 — 메인(G)과 같은 GSAP + ScrollTrigger + Lenis. 원본 _compose/sub.js (sub.py 가 07-structure/sub.js 로 복사)
   레퍼런스: 분석/서브페이지_레퍼런스_분석.md (gigavis 히어로·탭·카드 확장, welstory 연혁, shipnergy 글자 채움·숫자 교체, cosmax 가로 트랙, weonus 폼)
   QA: ?nomotion=1 (정적) · window.__g */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var qs = new URLSearchParams(location.search);
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  var NOMOTION = qs.get('nomotion') === '1' || !HAS_GSAP;
  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var lenis = null;
  var hd = $('#hd');

  if (NOMOTION) { root.classList.add('is-static'); root.classList.remove('mo', 'js-anim'); }

  /* ───────── 항상 동작 ───────── */
  // 토스트(메인과 같은 #toast)
  var toast = $('#toast'), toastT = 0;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toast]');
    if (t) { e.preventDefault(); say(t.dataset.toast); }
    var c = e.target.closest('[data-copy]');
    if (c) {
      var done = function () { say('주소를 복사했습니다: ' + c.dataset.copy); };
      if (navigator.clipboard) navigator.clipboard.writeText(c.dataset.copy).then(done, done); else done();
    }
  });
  // 퀵메뉴(메인 05와 같은 동작): 문의 → 문의하기 페이지, TOP
  $$('.qm [data-goto]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.goto === 'top') { if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else location.href = 'contact.html';
    });
  });
  var qm = $('#qm');
  function qmTop() { if (qm) qm.classList.toggle('show-top', (window.pageYOffset || root.scrollTop) > window.innerHeight * 0.6); }
  window.addEventListener('scroll', qmTop, { passive: true });
  qmTop();

  // 필터(인증서·제품·뉴스): data-filter="카드 선택자", 버튼 data-f
  $$('[data-filter]').forEach(function (bar) {
    var sel = bar.dataset.filter;
    $$('button[data-f]', bar).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', bar).forEach(function (x) { x.classList.toggle('is-on', x === b); });
        var f = b.dataset.f, shown = [];
        $$(sel).forEach(function (card) {
          var on = f === '전체' || card.dataset.cat === f;
          card.classList.toggle('is-out', !on);
          if (on) shown.push(card);
        });
        if (!NOMOTION) gsap.fromTo(shown, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .6, stagger: .05, ease: 'power3.out', overwrite: true });
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  });

  // 뉴스 검색
  var newsQ = $('#newsQ');
  if (newsQ) {
    newsQ.addEventListener('input', function () {
      var q = newsQ.value.trim();
      var n = 0;
      $$('.sp-post').forEach(function (p) {
        var on = !q || p.dataset.q.indexOf(q) > -1;
        p.style.display = on ? '' : 'none';
        if (on) n++;
      });
      $('#newsEmpty').style.display = n ? 'none' : 'block';
    });
  }

  // 뉴스 상세: ?no= 로 글 채우기(데모 — 실제는 서버에서)
  var nd = $('#newsData');
  if (nd) {
    var list = JSON.parse(nd.textContent), no = +(qs.get('no') || list[0].no);
    var i = Math.max(0, list.findIndex(function (x) { return x.no === no; })), it = list[i];
    var art = $('#spArticle');
    $('[data-a="title"]', art).textContent = it.title;
    $('[data-a="date"]', art).textContent = it.date;
    $('[data-a="cat"]', art).textContent = it.cat;
    $('[data-a="img"]', art).src = it.img;
    document.title = it.title + ' — 경북과학대학교 식품공장 대학촌';
    var prev = list[i + 1], next = list[i - 1];
    var pa = $('[data-a="prev"]', art), na = $('[data-a="next"]', art);
    if (prev) { pa.href = 'news-view.html?no=' + prev.no; pa.children[1].textContent = prev.title; pa.children[2].textContent = prev.date; } else pa.style.display = 'none';
    if (next) { na.href = 'news-view.html?no=' + next.no; na.children[1].textContent = next.title; na.children[2].textContent = next.date; } else na.style.display = 'none';
  }

  // 인증서 라이트박스
  var lb = $('#spLb');
  if (lb) {
    var certs = $$('.sp-cert'), cur = 0;
    var show = function (k) {
      var vis = certs.filter(function (c) { return !c.classList.contains('is-out'); });
      if (!vis.length) return;
      cur = (k + vis.length) % vis.length;
      $('img', lb).src = vis[cur].dataset.src;
      $('img', lb).alt = vis[cur].dataset.t;
      $('.sp-lb__cap', lb).textContent = vis[cur].dataset.t;
      lb.classList.add('is-on');
      if (lenis) lenis.stop();
    };
    var hide = function () { lb.classList.remove('is-on'); if (lenis) lenis.start(); };
    certs.forEach(function (c) {
      c.addEventListener('click', function () {
        var vis = certs.filter(function (x) { return !x.classList.contains('is-out'); });
        show(vis.indexOf(c));
      });
    });
    lb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) { if (b.dataset.lb === 'x') hide(); else show(cur + (+b.dataset.lb)); return; }
      if (e.target === lb) hide();
    });
    window.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-on')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
  }

  // 문의 폼: 필수 + 동의가 채워지면 버튼이 켜진다(weonus), 보내면 완료 화면(데모)
  var form = $('#spForm');
  if (form) {
    var submit = $('#fSubmit'), agree = $('#fAgree'), hint = $('#fHint');
    var req = $$('[data-req]', form);
    var valid = function (f) {
      var el = $('input, textarea', f), v = el.value.trim();
      if (!v) return false;
      if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      return true;
    };
    var check = function () {
      var ok = req.every(valid) && agree.checked;
      submit.disabled = !ok;
      if (hint) hint.style.visibility = ok ? 'hidden' : 'visible';
    };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
    req.forEach(function (f) {
      $('input, textarea', f).addEventListener('blur', function () { f.classList.toggle('is-err', !valid(f)); });
    });
    var fileIn = $('input[type=file]', form);
    if (fileIn) fileIn.addEventListener('change', function () { $('#fFile').textContent = fileIn.files[0] ? fileIn.files[0].name : '기획서 · 참고 자료 첨부 (선택, 10MB 이하)'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      check();
      if (submit.disabled) { req.forEach(function (f) { f.classList.toggle('is-err', !valid(f)); }); return; }
      form.classList.add('is-done');
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    check();
  }

  // 히어로 영상
  var hv = $('.sp-hero video');
  if (hv) { if (NOMOTION) { hv.removeAttribute('autoplay'); hv.pause(); } else { var pr = hv.play(); if (pr && pr.catch) pr.catch(function () {}); } }

  if (NOMOTION) {
    // 정적: 연혁 첫 연도, 숫자 그대로
    $$('[data-own]').forEach(function () {});
    return;
  }

  /* ───────── 연출 ───────── */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (window.Lenis && window.innerWidth > 768) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  window.__g = { lenis: lenis, ScrollTrigger: ScrollTrigger };
  var hdH = function () { return hd ? hd.offsetHeight : 80; };
  root.style.setProperty('--hd', hdH() + 'px');

  // 페이지 안 링크(#)
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = a.getAttribute('href');
      if (t.length < 2) return;
      var el = $(t);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -hdH() - 70, duration: 1.4 }); else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* 히어로 — 줄 리빌 + 스크롤 시 영상 확대·글자 위로, 본문이 히어로를 덮는다(히어로 고정, gigavis) */
  var heroEl = $('.sp-hero');
  if (heroEl) {
    gsap.from('.sp-hero__crumb, .sp-hero__en > span, .sp-hero__title .ln > span, .sp-hero__desc > span, .sp-hero__copy .ln > span', {
      yPercent: 115, autoAlpha: 0, duration: 1.2, ease: 'power4.out', stagger: .08, delay: .15
    });
    gsap.from('.sp-hero__media', { scale: 1.18, duration: 2.2, ease: 'power3.out' });
    ScrollTrigger.create({ trigger: heroEl, start: 'top top', end: 'bottom top', pin: true, pinSpacing: false });
    gsap.to('.sp-hero__body, .sp-hero__copy', { yPercent: -30, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom 30%', scrub: true } });
    gsap.to('.sp-hero__media', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.sp-hero__shade', { opacity: 1.4, ease: 'none', scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* 헤더 — 어두운 구간 위에서 흰 글씨(메인 header01과 같은 규칙), 내려갈 때 메뉴 숨김 */
  if (hd) {
    var on = { logo: [], nav: [] };
    var setDark = function (key, el, active) {
      var i = on[key].indexOf(el);
      if (active && i < 0) on[key].push(el);
      if (!active && i >= 0) on[key].splice(i, 1);
      hd.classList.toggle('logo-light', on.logo.length > 0);
      hd.classList.toggle('nav-light', on.nav.length > 0);
    };
    $$('[data-dark]').forEach(function (sec) {
      ScrollTrigger.create({ trigger: sec, start: 'top 44px', end: 'bottom 44px', onToggle: function (s) { setDark('logo', sec, s.isActive); setDark('nav', sec, s.isActive); } });
    });
    ScrollTrigger.create({
      start: 120, end: 'max',
      onUpdate: function (s) { hd.classList.toggle('nav-hide', s.direction > 0 && s.scroll() > window.innerHeight * 0.6); },
      onLeaveBack: function () { hd.classList.remove('nav-hide'); }
    });
  }

  /* 탭 — 히어로 아래에 붙어 있다가 내려가면 헤더 아래 고정(gigavis), 현재 탭 밑줄 */
  var tabs = $('#spTabs');
  if (tabs) {
    var bar = $('.sp-tabs__bar', tabs), curA = $('a[aria-current]', tabs);
    var placeBar = function (a) {
      if (!a) return;
      var r = a.getBoundingClientRect(), pr = a.parentNode.getBoundingClientRect();
      bar.style.width = r.width + 'px';
      bar.style.transform = 'translateX(' + (r.left - pr.left + a.parentNode.scrollLeft) + 'px)';
    };
    placeBar(curA);
    $$('.sp-tabs__list a', tabs).forEach(function (a) {
      a.addEventListener('mouseenter', function () { placeBar(a); });
      a.addEventListener('mouseleave', function () { placeBar(curA); });
    });
    if (curA && isMobile) curA.parentNode.scrollLeft = curA.offsetLeft - 24;
    window.addEventListener('resize', function () { placeBar(curA); });
    ScrollTrigger.create({
      trigger: tabs, start: function () { return 'top ' + (hd.classList.contains('nav-hide') ? 0 : hdH()); }, endTrigger: 'main', end: function () { return 'bottom ' + ((hd.classList.contains('nav-hide') ? 0 : hdH()) + tabs.offsetHeight); },   // 본문 끝이 탭 아래선에 닿으면 풀린다(하단 문의 단락을 덮지 않게, 10/24)
      pin: true, pinSpacing: false, toggleClass: { targets: tabs, className: 'is-stuck' }
    });
  }

  /* 공통 등장 */
  $$('[data-rv]').forEach(function (el) {
    var kind = el.dataset.rv;
    var vars = kind === 'clip' ? { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.inOut' } : { autoAlpha: 1, y: 0, x: 0, scale: 1, duration: 1.1, ease: 'power3.out' };
    vars.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
    var sib = el.parentNode ? $$(':scope > [data-rv]', el.parentNode) : [];
    vars.delay = Math.min(.4, Math.max(0, sib.indexOf(el)) * .07);
    gsap.to(el, vars);
  });
  // 사진 안 패럴랙스(data-py) · 큰 외곽선 글자 가로 이동(data-px)
  $$('[data-py]').forEach(function (img) {
    gsap.fromTo(img, { yPercent: 0 }, { yPercent: +img.dataset.py, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-px]').forEach(function (g) {
    gsap.fromTo(g, { xPercent: 0 }, { xPercent: +g.dataset.px, ease: 'none', scrollTrigger: { trigger: g.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // 숫자 카운트업(welstory)
  $$('[data-count]').forEach(function (b) {
    var to = parseFloat(b.dataset.count), small = $('small', b), txt = b.firstChild;
    if (isNaN(to) || !txt || txt.nodeType !== 3) return;
    var raw = txt.textContent.trim(), comma = raw.indexOf(',') > -1, o = { v: to > 1900 ? to - 30 : 0 };
    txt.textContent = String(Math.round(o.v));
    ScrollTrigger.create({
      trigger: b, start: 'top 90%', once: true,
      onEnter: function () {
        gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: function () {
          var n = Math.round(o.v);
          txt.textContent = comma ? n.toLocaleString('en-US') : String(n);
        } });
      }
    });
    if (small) b.appendChild(small);
  });

  /* 기업소개 — 글자 채움(shipnergy) */
  var words = $('[data-words]');
  if (words) {
    var ws = $$('.w', words);
    ScrollTrigger.create({
      trigger: words, start: 'top 75%', end: 'bottom 40%', scrub: true,
      onUpdate: function (s) { var k = Math.round(s.progress * ws.length); ws.forEach(function (w, i) { w.classList.toggle('is-on', i < k); }); }
    });
  }
  /* 사진 박스 → 풀스크린(gigavis 카드 확장 · 오시는 길 배너) */
  var ex = $('#spExpand');
  if (ex) {
    var box = $('.sp-expand__box', ex), exv = $('video', ex);
    var tl = gsap.timeline({ scrollTrigger: { trigger: ex, start: 'top top', end: '+=' + (window.innerHeight * 0.9), pin: $('.sp-expand__pin', ex), scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
      onEnter: function () { if (exv) { var pp = exv.play(); if (pp && pp.catch) pp.catch(function () {}); } } } });
    tl.to(box, { width: function () { return window.innerWidth; }, height: function () { return window.innerHeight; }, borderRadius: 0, ease: 'power2.inOut', duration: .7 }, 0)
      .to($('.sp-expand__dim', ex), { opacity: 1, duration: .4 }, .3)
      .to($('.sp-expand__copy', ex), { autoAlpha: 1, y: 0, duration: .35 }, .55)
      .to({}, { duration: .15 });
  }
  /* 숫자 교체 핀(shipnergy) */
  var sw = $('#spSwap');
  if (sw) {
    var swItems = $$('.sp-swap__list li', sw), swBg = $$('.sp-swap__bg img', sw), swNo = $('#swapNo'), swCur = 0;
    var swSet = function (k) {
      if (k === swCur) return;
      swItems.forEach(function (li, i) { li.classList.toggle('is-on', i === k); li.classList.toggle('is-past', i < k); });
      swBg.forEach(function (im, i) { im.classList.toggle('is-on', i === k); });
      swNo.textContent = ('0' + (k + 1)).slice(-2);
      swCur = k;
    };
    ScrollTrigger.create({
      trigger: sw, start: 'top top', end: '+=' + (swItems.length * 70) + '%', pin: $('.sp-swap__pin', sw), anticipatePin: 1,
      onUpdate: function (s) { swSet(Math.min(swItems.length - 1, Math.floor(s.progress * swItems.length * 0.999))); }
    });
  }
  /* 강점 스택 카드 — 다음 카드가 덮을 때 앞 카드가 작아지며 어두워짐(weonus) */
  var cards = $$('.sp-stack__card');
  cards.forEach(function (c, i) {
    if (i === cards.length - 1) return;
    gsap.to(c, { scale: .9, filter: 'brightness(.7)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top ' + (hdH() + 76) + 'px', scrub: true } });
  });

  /* CI — 심볼 마우스 기울기 */
  var tilt = $('[data-tilt]');
  if (tilt && !isMobile) {
    var stg = tilt.parentNode;
    stg.addEventListener('pointermove', function (e) {
      var r = stg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      gsap.to(tilt, { rotateY: x * 24, rotateX: -y * 24, x: x * 20, y: y * 20, duration: .6, ease: 'power3.out', transformPerspective: 800 });
    });
    stg.addEventListener('pointerleave', function () { gsap.to(tilt, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: .8, ease: 'power3.out' }); });
  }

  /* 연혁 — 왼쪽 연도가 굴러가고 시대 사진·버튼이 바뀐다, 세로 진행선(welstory) */
  var hist = $('#spHist');
  if (hist) {
    var rows = $$('.sp-hist__row', hist), digits = $$('#histYear .dg > span'), eraEl = $('#histEra'), capEl = $('#histCap');
    var figs = $$('.sp-hist__fig img', hist), btns = $$('.sp-hist__nav button', hist), grps = $$('.sp-hist__grp', hist);
    var eraNames = btns.map(function (b) { return b.textContent; });
    var caps = ['시작', '성장', '신뢰', '도약'];
    var setYear = function (y) { String(y).split('').forEach(function (d, k) { if (digits[k]) digits[k].style.transform = 'translateY(' + (-d) + 'em)'; }); };
    var curEra = -1;
    var setEra = function (k) {
      if (k === curEra) return;
      curEra = k;
      figs.forEach(function (f, i) { f.classList.toggle('is-on', i === k); });
      btns.forEach(function (b, i) { b.classList.toggle('is-on', i === k); });
      if (eraEl) eraEl.textContent = eraNames[k];
      if (capEl) capEl.textContent = caps[k] || '';
      if (isMobile && btns[k]) btns[k].parentNode.scrollTo({ left: btns[k].offsetLeft - 24, behavior: 'smooth' });
    };
    setYear(rows[0].dataset.year);
    rows.forEach(function (r) {
      ScrollTrigger.create({
        trigger: r, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (s) { if (s.isActive) { rows.forEach(function (x) { x.classList.toggle('is-on', x === r); }); setYear(r.dataset.year); setEra(+r.dataset.era); } }
      });
    });
    gsap.to('#histLine', { height: '100%', ease: 'none', scrollTrigger: { trigger: '.sp-hist__list', start: 'top 55%', end: 'bottom 55%', scrub: true } });
    btns.forEach(function (b, k) {
      b.addEventListener('click', function () {
        var t = grps[k];
        if (lenis) lenis.scrollTo(t, { offset: -(hdH() + (isMobile ? 120 : 90)), duration: 1.4 }); else window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - hdH() - 90, behavior: 'smooth' });
      });
    });
  }

  /* 설비 — 가로 트랙 핀(soijeong · cosmax) */
  $$('[data-hscroll]').forEach(function (wrap) {
    var track = $('.sp-hscroll__track', wrap), prog = $('.sp-hscroll__prog i', wrap.parentNode);
    if (isMobile) {   // 모바일은 손가락으로 가로 스크롤
      wrap.style.overflowX = 'auto';
      wrap.style.scrollbarWidth = 'none';
      return;
    }
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'center center', end: function () { return '+=' + dist(); }, pin: wrap.parentNode, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (s) { if (prog) prog.style.transform = 'scaleX(' + s.progress + ')'; } } });
  });

  /* 생산공정 — 단계 핀(9단계가 스크롤로 진행) */
  var steps = $('#spSteps');
  if (steps && !isMobile) {
    var sli = $$('.sp-steps__list li', steps), simg = $$('.sp-steps__stage img', steps), sno = $('#stepNo'), sbar = $('#stepBar'), scur = 0;
    var sset = function (k) {
      if (k === scur) return;
      sli.forEach(function (li, i) { li.classList.toggle('is-on', i === k); });
      simg.forEach(function (im, i) { im.classList.toggle('is-on', i === k); im.classList.toggle('is-past', i < k); });
      sno.textContent = ('0' + (k + 1)).slice(-2);
      scur = k;
    };
    ScrollTrigger.create({
      trigger: steps, start: 'top top', end: '+=' + (sli.length * 45) + '%', pin: $('.sp-steps__pin', steps), anticipatePin: 1,
      onUpdate: function (s) { sset(Math.min(sli.length - 1, Math.floor(s.progress * sli.length * 0.999))); sbar.style.transform = 'scaleX(' + s.progress + ')'; }
    });
  } else if (steps) {
    $$('.sp-steps__list li', steps).forEach(function (li) { li.classList.add('is-on'); });
  }

  /* ODM 수출 지도 — 점선 경로가 그려진다 */
  var routes = $$('[data-route]');
  if (routes.length) {
    routes.forEach(function (r) { var L = r.getTotalLength(); r.style.strokeDasharray = L; r.style.strokeDashoffset = L; });
    gsap.to(routes, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .18, scrollTrigger: { trigger: '.sp-export', start: 'top 70%', once: true },
      onComplete: function () { routes.forEach(function (r) { r.style.strokeDasharray = '6 8'; }); } });
    gsap.from('.sp-export .pt', { scale: 0, transformOrigin: 'center', duration: .6, ease: 'back.out(3)', stagger: .12, scrollTrigger: { trigger: '.sp-export', start: 'top 70%', once: true } });
  }

  /* 자사제품 — 왼쪽 무대는 고정, 오른쪽 설명이 바뀌면 제품이 교체(스플릿 스티키) */
  var own = $('#spOwn');
  if (own) {
    var oimgs = $$('.sp-own__stage img', own);
    $$('.sp-own__item', own).forEach(function (it, k) {
      ScrollTrigger.create({ trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) {
        if (!s.isActive) return;
        oimgs.forEach(function (im, i) { im.classList.toggle('is-on', i === k); });
      } });
    });
  }

  /* 협력업체 마키 2줄 */
  $$('[data-mq]').forEach(function (mq) {
    var track = $('.sp-mq__track', mq), g = $('.sp-mq__g', track);
    var setup = function () {
      $$('[data-clone]', track).forEach(function (c) { track.removeChild(c); });
      var w = g.getBoundingClientRect().width;
      if (!w) return;
      for (var k = 0; k < Math.max(1, Math.ceil(window.innerWidth / w)); k++) { var c = g.cloneNode(true); c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
      track.style.setProperty('--shift', (-w) + 'px');
      track.style.setProperty('--dur', (w / (+mq.dataset.mq || 50)).toFixed(2) + 's');
      mq.classList.add('is-run');
    };
    setup();
    window.addEventListener('load', setup);
  });

  /* 제품 상세 — 360° 턴테이블(메인 제품 필름의 프레임을 드래그로), 하단 구매 바 */
  var spin = $('#pdSpin');
  if (spin) {
    var base = spin.dataset.seq, N = +spin.dataset.frames || 120, STEP = isMobile ? 2 : 1, cv = $('canvas', spin), cx = cv.getContext('2d'), frames = [], idx = 0, loaded = 0;
    var pad = function (n) { return ('000' + n).slice(-4); };
    var size = function () { var d = Math.min(window.devicePixelRatio || 1, 2); cv.width = spin.clientWidth * d; cv.height = spin.clientHeight * d; draw(); };
    var draw = function () {
      var k = Math.round(idx / STEP) * STEP, f = null;
      for (var j = 0; j < N && !f; j++) { f = frames[(k + j) % N] || frames[(k - j + N) % N]; }
      if (!f) return;
      cx.fillStyle = '#fff6e9'; cx.fillRect(0, 0, cv.width, cv.height);
      var s = Math.min(cv.width / f.naturalWidth, cv.height / f.naturalHeight), w = f.naturalWidth * s, h = f.naturalHeight * s;
      cx.drawImage(f, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    };
    for (var fi = 0; fi < N; fi += STEP) {
      (function (fi) { var im = new Image(); im.decoding = 'async'; im.onload = function () { frames[fi] = im; loaded++; if (fi === 0 || loaded % 10 === 0) draw(); }; im.src = base + pad(fi + 1) + '.webp'; })(fi);
    }
    size();
    window.addEventListener('resize', size);
    var auto = gsap.to({ v: 0 }, { v: 1, duration: 9, repeat: -1, ease: 'none', onUpdate: function () { idx = (idx + .5) % N; draw(); } });
    var drag = null;
    spin.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, i: idx }; auto.pause(); spin.setPointerCapture(e.pointerId); spin.style.cursor = 'grabbing'; });
    spin.addEventListener('pointermove', function (e) { if (!drag) return; idx = ((drag.i - (e.clientX - drag.x) / spin.clientWidth * N * 1.2) % N + N) % N; draw(); });
    var up = function () { if (!drag) return; drag = null; spin.style.cursor = ''; gsap.delayedCall(2.5, function () { if (!drag) auto.play(); }); };
    spin.addEventListener('pointerup', up);
    spin.addEventListener('pointercancel', up);
    spin.style.cursor = 'grab';
    spin.style.touchAction = 'pan-y';
    var buy = $('#spBuy'), btnsEl = $('#pdBtns');
    if (buy && btnsEl) ScrollTrigger.create({ trigger: btnsEl, start: 'bottom top', end: 'max', onToggle: function (s) { buy.classList.toggle('is-on', s.isActive); buy.setAttribute('aria-hidden', s.isActive ? 'false' : 'true'); } });
  }


  /* 하단 문의 제목 — 한글 ↔ 영어 자동 반복 (메인 g_rev1.js 8번과 같다) */
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
      }, k === 0 ? 3600 : 3000);
    }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; tick(); }, { threshold: 0.2 }).observe(h);
    document.addEventListener('visibilitychange', tick);
  })();

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
