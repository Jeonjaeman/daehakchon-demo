/* 대학촌 — 02-depth (B. Depth Product)
   깊이맵 패럴랙스 히어로(순수 WebGL1 셰이더 한 장) + 로딩 게이트 + GSAP ScrollTrigger · Lenis.
   연출 초기 상태는 html.js-anim 일 때만 건다. prefers-reduced-motion · ?nomotion=1 이면 정적 화면,
   ?noloader=1 이면 로딩 게이트를 건너뛴다. ?depth=0.05 로 깊이 강도 조절.
   QA 훅: window.__loader (progress · done · ready · finish), window.__depth (mode · strength) */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var noop = function () {};
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  var query = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noMotion = reduce || query.get('nomotion') === '1';
  var gate = root.classList.contains('has-loader');          // head 인라인 스크립트가 결정
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var portraitMQ = window.matchMedia('(max-aspect-ratio: 6/5)');
  var isMobile = function () { return window.innerWidth <= 900; };
  var anim = !noMotion && !!(window.gsap && window.ScrollTrigger);
  var lenis = null;

  var DEPTH_SRC = '../assets/img/pr5_fiber_dark_hero_depth.webp';
  var BG = [13, 8, 5];                                          // style.css --hero-bg
  var STRENGTH = parseFloat(query.get('depth')) || 0.035;
  var BOTTLE = { x: 0.65, y: 0.52 };                            // 사진 속 병 중심 — 스크롤 줌의 기준점

  var hero = $('#hero');
  var heroMedia = $('#heroMedia');
  var heroImg = $('#heroImg');
  var heroCanvas = $('#heroGL');

  if (gate) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  /* 포인터 (0..1, 화면 기준) — 히어로 깊이와 원료 레이어가 같이 쓴다 */
  var pointer = { x: 0.5, y: 0.5, t: -1e9 };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
    pointer.t = performance.now();
  }, { passive: true });

  /* ───────── 로딩 게이트: 히어로 텍스처 · 깊이맵 · 폰트 가중 평균 ───────── */
  var loader = (function () {
    var el = $('#loader'), bar = $('#loaderBar'), num = $('#loaderNum');
    var W = { tex: 0.6, depth: 0.15, fonts: 0.25 };
    var part = { tex: 0, depth: 0, fonts: 0 };
    var fontsDone = false;
    var shown = 0, t0 = performance.now(), MIN = gate ? 1200 : 0;
    var holding = false, finished = false, resolveReady, listeners = [];

    var api = {
      progress: 0,
      done: false,
      gated: gate,
      parts: part,
      ready: new Promise(function (r) { resolveReady = r; }),
      set: function (k, v) { part[k] = Math.max(part[k], clamp(v, 0, 1)); if (k === 'fonts' && v >= 1) fontsDone = true; },
      onDone: function (fn) { if (api.done) fn(); else listeners.push(fn); },
      finish: finish
    };

    function paint(p) {
      if (!gate) return;
      var pct = Math.floor(p * 100);
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (num.textContent !== String(pct)) num.textContent = pct;
      el.setAttribute('aria-valuenow', pct);
    }

    function finish() {
      if (finished) return;
      finished = true;
      part.tex = part.depth = part.fonts = 1;
      api.progress = 1;
      paint(1);
      api.done = true;
      if (gate) {
        el.classList.add('is-done');
        var gone = function () { el.classList.add('is-gone'); };
        el.addEventListener('transitionend', gone, { once: true });
        setTimeout(gone, 1600);
      }
      root.classList.remove('is-loading');
      if (lenis) lenis.start();
      resolveReady();
      listeners.splice(0).forEach(function (fn) { fn(); });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    function tick(now) {
      if (finished || holding) return;
      // 폰트는 바이트 진행률이 없어 끝날 때까지 90%까지만 천천히 채운다
      if (!fontsDone) part.fonts = Math.min(0.9, part.fonts + 0.006);
      var target = part.tex * W.tex + part.depth * W.depth + part.fonts * W.fonts;
      shown += (target - shown) * 0.14;
      if (target - shown < 0.001) shown = target;
      var p = Math.min(shown, MIN ? (now - t0) / MIN : 1);
      api.progress = p;
      paint(p);
      if (p >= 0.9999 && target >= 0.9999) {
        holding = true;
        setTimeout(finish, gate ? 280 : 0);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(finish, 9000);                                   // 느린 회선에서도 게이트에 갇히지 않게

    return api;
  })();
  window.__loader = loader;

  /* fetch 스트림으로 바이트 진행률을 받고, 받은 blob을 <img>에 넣는다 (한 번만 내려받음) */
  function fetchBlobURL(url, onProgress) {
    if (!window.fetch || !window.ReadableStream || location.protocol === 'file:') return Promise.reject(new Error('no-fetch'));
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var total = parseInt(res.headers.get('content-length'), 10) || 0;
      var type = res.headers.get('content-type') || 'image/webp';
      if (!res.body || !res.body.getReader) return res.blob();
      var reader = res.body.getReader(), got = 0, chunks = [];
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return new Blob(chunks, { type: type });
          chunks.push(r.value);
          got += r.value.length;
          if (total) onProgress(got / total);
          return pump();
        });
      })();
    }).then(function (blob) { return URL.createObjectURL(blob); });
  }

  function loadImage(img, url, onProgress) {
    return new Promise(function (resolve, reject) {
      var use = function (src) {
        img.onload = function () {
          onProgress(1);
          (img.decode ? img.decode().catch(noop) : Promise.resolve()).then(function () { resolve(img); });
        };
        img.onerror = function () { reject(new Error('image failed: ' + url)); };
        img.src = src;
      };
      fetchBlobURL(url, onProgress).then(use, function () { use(url); });
    });
  }

  var depthImg = new Image();
  var heroReady = loadImage(heroImg, heroImg.getAttribute('data-src'), function (p) { loader.set('tex', p); });
  var depthReady = noMotion ? Promise.resolve(null) : loadImage(depthImg, DEPTH_SRC, function (p) { loader.set('depth', p); });
  heroReady.catch(function () { loader.set('tex', 1); });
  if (noMotion) loader.set('depth', 1);
  else depthReady.catch(function () { loader.set('depth', 1); });

  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([
        document.fonts.load('200 64px "Pretendard Variable"', '감 한 알에서'),
        document.fonts.load('800 64px "Pretendard Variable"', '건강한 한 병까지'),
        document.fonts.load('600 14px "Montserrat"', 'SCROLL TO EXPLORE 0123456789%')
      ]).then(function () { return document.fonts.ready; })
    : Promise.resolve();
  Promise.race([fontsReady, wait(4000)]).catch(noop).then(function () { loader.set('fonts', 1); });

  /* ───────── 깊이맵 패럴랙스 (WebGL1, 전체 화면 쿼드 한 장) ───────── */
  var VERT = [
    'attribute vec2 a_pos;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = a_pos * 0.5 + 0.5;',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // u_frame: 사진이 놓이는 칸(캔버스 0..1, 좌상단 원점) — 그 칸 안에서 object-fit: cover
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D u_tex;',
    'uniform sampler2D u_depth;',
    'uniform vec2 u_res;',
    'uniform vec4 u_frame;',
    'uniform vec4 u_feather;',
    'uniform vec2 u_focus;',
    'uniform vec2 u_origin;',
    'uniform vec2 u_mouse;',
    'uniform float u_texAspect;',
    'uniform float u_scale;',
    'uniform float u_zoom;',
    'uniform float u_strength;',
    'uniform vec3 u_bg;',
    'varying vec2 v_uv;',
    'void main() {',
    '  vec2 s = vec2(v_uv.x, 1.0 - v_uv.y);',
    '  s = (s - u_origin) / u_zoom + u_origin;',
    '  vec2 q = (s - u_frame.xy) / u_frame.zw;',
    '  float fa = (u_frame.z * u_res.x) / (u_frame.w * u_res.y);',
    '  vec2 r = fa > u_texAspect ? vec2(1.0, u_texAspect / fa) : vec2(fa / u_texAspect, 1.0);',
    '  vec2 uv = (q - 0.5) * r / u_scale + u_focus;',
    '  float d = texture2D(u_depth, uv).r;',
    '  uv += (u_mouse - 0.5) * (d - 0.5) * u_strength;',
    '  vec3 col = texture2D(u_tex, uv).rgb;',
    '  vec4 f = max(u_feather, vec4(0.0001));',
    '  float m = smoothstep(0.0, f.x, q.x) * smoothstep(0.0, f.y, 1.0 - q.x)',
    '          * smoothstep(0.0, f.z, q.y) * smoothstep(0.0, f.w, 1.0 - q.y);',
    '  gl_FragColor = vec4(mix(u_bg, col, m), 1.0);',
    '}'
  ].join('\n');

  function createDepthHero(canvas, frameEl, colorImg, depthMap) {
    var gl = null;
    try {
      var opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
      gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    } catch (e) { gl = null; }
    if (!gl) return null;

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[depth] shader compile failed:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[depth] program link failed:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // MAX_TEXTURE_SIZE 가 2048인 구형 기기는 2D 캔버스로 줄여 올린다
    var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
    function fit(img) {
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, maxTex / Math.max(w, h));
      if (k >= 1) return img;
      var c = document.createElement('canvas');
      c.width = Math.floor(w * k);
      c.height = Math.floor(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c;
    }
    function texture(unit, img) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);   // NPOT: clamp + 밉맵 없음
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, fit(img));
    }
    texture(0, colorImg);
    texture(1, depthMap);

    var U = {};
    ['u_tex', 'u_depth', 'u_res', 'u_frame', 'u_feather', 'u_focus', 'u_origin', 'u_mouse', 'u_texAspect',
     'u_scale', 'u_zoom', 'u_strength', 'u_bg'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var texAspect = colorImg.naturalWidth / colorImg.naturalHeight;
    var SCALE = 1.08;                                              // 가장자리 빈 곳을 숨기는 오버스캔
    gl.uniform1i(U.u_tex, 0);
    gl.uniform1i(U.u_depth, 1);
    gl.uniform1f(U.u_texAspect, texAspect);
    gl.uniform1f(U.u_scale, SCALE);
    gl.uniform3f(U.u_bg, BG[0] / 255, BG[1] / 255, BG[2] / 255);

    var state = { mouse: { x: 0.5, y: 0.5 }, zoom: 1, strength: STRENGTH };

    function layout() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.u_res, w, h);
      // 사진 칸 = CSS가 <img>를 놓은 자리 (offset 값은 transform 영향을 받지 않는다)
      var fx = frameEl.offsetLeft / w, fy = frameEl.offsetTop / h;
      var fw = frameEl.offsetWidth / w, fh = frameEl.offsetHeight / h;
      gl.uniform4f(U.u_frame, fx, fy, fw, fh);
      var portrait = portraitMQ.matches;
      if (portrait) gl.uniform4f(U.u_feather, 0, 0, 0, 0.3);       // style.css 의 mask-image 와 같은 값
      else gl.uniform4f(U.u_feather, 0.28, 0.06, 0, 0);
      // 초점은 사진 밖을 샘플링하지 않는 범위로 묶는다
      var fa = (fw * w) / (fh * h);
      var rx = fa > texAspect ? 1 : fa / texAspect, ry = fa > texAspect ? texAspect / fa : 1;
      var hx = rx / 2 / SCALE, hy = ry / 2 / SCALE;
      var cx = clamp(0.5, hx, 1 - hx), cy = clamp(portrait ? 0.45 : 0.47, hy, 1 - hy);
      gl.uniform2f(U.u_focus, cx, cy);
      // 줌 기준점: 사진 좌표의 병 중심을 화면 좌표로 (uv = (q - .5) * r / scale + focus 의 역)
      gl.uniform2f(U.u_origin,
        fx + ((BOTTLE.x - cx) * SCALE / rx + 0.5) * fw,
        fy + ((BOTTLE.y - cy) * SCALE / ry + 0.5) * fh);
    }

    function draw() {
      gl.uniform2f(U.u_mouse, state.mouse.x, state.mouse.y);
      gl.uniform1f(U.u_zoom, state.zoom);
      gl.uniform1f(U.u_strength, state.strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return { gl: gl, state: state, layout: layout, draw: draw };
  }

  /* 입력: 마우스 → (모바일) deviceorientation → 둘 다 없으면 느린 자동 드리프트 */
  var depthTarget = (function () {
    var orient = null, base = null;
    function onOrient(e) {
      if (e.gamma == null || e.beta == null) return;
      if (base === null) base = e.beta;
      orient = { x: clamp(0.5 + e.gamma / 60, 0, 1), y: clamp(0.5 + (e.beta - base) / 60, 0, 1), t: performance.now() };
    }
    function listen() { window.addEventListener('deviceorientation', onOrient, { passive: true }); }
    if (!noMotion && !finePointer && window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS: 히어로를 처음 탭할 때 한 번만 권한을 묻는다
        hero.addEventListener('touchend', function () {
          DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') listen(); }).catch(noop);
        }, { once: true });
      } else {
        listen();
      }
    }
    return function (now, out) {
      if (now - pointer.t < 4000) { out.x = pointer.x; out.y = pointer.y; return; }
      if (orient && now - orient.t < 1500) { out.x = orient.x; out.y = orient.y; return; }
      var s = now / 1000;
      out.x = 0.5 + 0.34 * Math.sin(s * 0.42);
      out.y = 0.5 + 0.22 * Math.cos(s * 0.31);
    };
  })();

  var heroFX = { zoom: 1, intro: gate && anim ? 1.14 : 1 };          // 스크롤 줌 × 인트로 줌
  var depth = null;                                               // createDepthHero 결과
  var cssParallax = false;                                        // WebGL 없음: <img> CSS 패럴랙스
  var heroVisible = true;
  var smooth = { x: 0.5, y: 0.5 }, tgt = { x: 0.5, y: 0.5 };
  var rafId = 0;

  function heroFrame(now) {
    rafId = 0;
    if (!heroVisible) return;
    depthTarget(now, tgt);
    smooth.x += (tgt.x - smooth.x) * 0.08;
    smooth.y += (tgt.y - smooth.y) * 0.08;
    var z = heroFX.zoom * heroFX.intro;
    if (depth) {
      depth.state.mouse.x = smooth.x;
      depth.state.mouse.y = smooth.y;
      depth.state.zoom = z;
      depth.draw();
    } else if (cssParallax) {
      heroMedia.style.transformOrigin = (heroImg.offsetLeft + heroImg.offsetWidth * BOTTLE.x) + 'px ' +
        (heroImg.offsetTop + heroImg.offsetHeight * BOTTLE.y) + 'px';
      heroMedia.style.transform = 'scale(' + z.toFixed(4) + ')';
      heroImg.style.transform = 'translate3d(' + ((smooth.x - 0.5) * -26).toFixed(2) + 'px,' +
        ((smooth.y - 0.5) * -18).toFixed(2) + 'px,0) scale(1.04)';
    }
    rafId = requestAnimationFrame(heroFrame);
  }
  function startHeroLoop() {
    if (!rafId && heroVisible && (depth || cssParallax)) rafId = requestAnimationFrame(heroFrame);
  }

  if (!noMotion) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        heroVisible = es[0].isIntersecting;
        if (heroVisible) startHeroLoop();
      }).observe(hero);
    }

    Promise.all([heroReady, depthReady]).then(function () {
      depth = createDepthHero(heroCanvas, heroImg, heroImg, depthImg);
      if (depth) {
        depth.layout();
        depth.draw();
        hero.classList.add('gl-on');
        heroCanvas.addEventListener('webglcontextlost', function (e) {
          e.preventDefault();
          depth = null;
          hero.classList.remove('gl-on');
          cssParallax = true;
          startHeroLoop();
        });
      } else {
        cssParallax = true;
      }
      startHeroLoop();
    }).catch(function () {
      cssParallax = true;
      startHeroLoop();
    });

    var relayout = function () { if (depth) { depth.layout(); depth.draw(); } };
    window.addEventListener('resize', relayout);
    if (portraitMQ.addEventListener) portraitMQ.addEventListener('change', relayout);
  }

  window.__depth = {
    get mode() { return depth ? 'webgl' : cssParallax ? 'css' : 'static'; },
    get strength() { return depth ? depth.state.strength : STRENGTH; },
    set strength(v) { if (depth) depth.state.strength = v; },
    fx: heroFX,
    mouse: smooth
  };

  /* ───────── 항상 동작하는 것 ───────── */

  // 헤더: 어두운 구간([data-dark]) 위에서 흰색
  var hd = $('#hd');
  var sections = $$('main > section');
  function updateHeader() {
    var y = hd.offsetHeight * 0.5, dark = true;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { dark = sections[i].hasAttribute('data-dark'); break; }
    }
    hd.classList.toggle('is-light', dark);
    hd.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  var hdQueued = false;
  function onScroll() {
    if (hdQueued) return;
    hdQueued = true;
    requestAnimationFrame(function () { hdQueued = false; updateHeader(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // KR / EN / CN 토글 (표시만)
  $$('.hd__lang button').forEach(function (btn, i, all) {
    btn.addEventListener('click', function () {
      all.forEach(function (b) {
        b.classList.toggle('is-on', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  // 페이지 안 이동 (문의로)
  $$('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = $(btn.dataset.goto);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { duration: 1.8 });
      else target.scrollIntoView({ behavior: noMotion ? 'auto' : 'smooth' });
    });
  });

  // 문의 폼: 화면만
  (function () {
    var form = $('#inquiry'), msg = $('#formMsg');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = '데모 화면입니다. 실제 전송은 이루어지지 않습니다.';
    });
  })();

  // 제품 카드: 포인터를 따라가는 글로우
  if (finePointer) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  if (!anim) {
    $('#zoom').removeAttribute('data-dark');                      // 정적 화면에서는 아이보리 구간
    updateHeader();
    return;
  }

  /* ───────── 연출 시작 ───────── */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add('js-anim');

  if (window.Lenis && window.innerWidth > 768) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', onScroll);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (gate && !loader.done) lenis.stop();
  }
  updateHeader();

  /* 01 HERO — 인트로(셔터가 열릴 때) + 스크롤 스크럽(scale 1→1.25, 글자 fade) */
  function heroIntro() {
    gsap.fromTo(heroFX, { intro: 1.14 }, { intro: 1, duration: 2.4, ease: 'power3.out' });
    gsap.from('.hero__label > span, .hero__title .ln > span', { yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.1, delay: 0.2 });
    gsap.from('.hero__sub', { autoAlpha: 0, y: 30, duration: 1.2, ease: 'power3.out', delay: 0.65 });
    gsap.from('.hero__foot > *', { autoAlpha: 0, y: 14, duration: 1, ease: 'power2.out', stagger: 0.07, delay: 0.9 });
  }
  if (gate) loader.onDone(heroIntro);
  else heroIntro();

  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true } })
    .to(heroFX, { zoom: 1.25, ease: 'none', duration: 1 }, 0)
    .to('.hero__body', { autoAlpha: 0, y: -70, ease: 'power1.in', duration: 0.55 }, 0)
    .to('.hero__foot', { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0)
    .to('.hero__veil', { opacity: 0.85, ease: 'none', duration: 0.35 }, 0.65);

  /* 공통 fade-up */
  var revealIn = function (els, stagger) {
    gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: stagger, overwrite: true, clearProps: 'transform' });
  };
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 50 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: function (batch) { revealIn(batch, 0.1); }
  });
  $$('[data-reveal-group]').forEach(function (group) {
    var items = Array.prototype.slice.call(group.children);
    gsap.set(items, { autoAlpha: 0, y: 70 });
    ScrollTrigger.create({
      trigger: group, start: 'top 85%', once: true,
      onEnter: function () { revealIn(items, 0.12); }
    });
  });

  /* 02 ORIGIN — 원료 누끼가 서로 다른 속도로 떠오르고, 마우스에 ±12px */
  gsap.fromTo('.origin__word', { xPercent: 10 }, {
    xPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '#origin', start: 'top bottom', end: 'bottom top', scrub: 0.4 }
  });
  $$('.float').forEach(function (f, i) {
    var speed = parseFloat(f.dataset.speed) || 1;
    gsap.fromTo(f, { y: function () { return window.innerHeight * 0.05 * speed; } }, {
      y: function () { return -window.innerHeight * 0.05 * speed; }, ease: 'none',
      scrollTrigger: { trigger: '#originStage', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });
    gsap.from($('img', f), {
      autoAlpha: 0, y: 140, scale: 0.82, rotate: i % 2 ? 8 : -8, duration: 1.6, ease: 'power3.out', delay: i * 0.09,
      scrollTrigger: { trigger: '#originStage', start: 'top 78%', once: true }
    });
  });
  if (finePointer) {
    var layers = $$('.float__m').map(function (el) {
      return { el: el, d: parseFloat(el.parentNode.dataset.depth) || 1, x: 0, y: 0 };
    });
    var originOn = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { originOn = es[0].isIntersecting; }).observe($('#originStage'));
    }
    gsap.ticker.add(function () {
      if (!originOn) return;
      var mx = pointer.x * 2 - 1, my = pointer.y * 2 - 1;
      layers.forEach(function (l) {
        l.x += (mx * 12 * l.d - l.x) * 0.08;
        l.y += (my * 12 * l.d - l.y) * 0.08;
        l.el.style.transform = 'translate3d(' + l.x.toFixed(2) + 'px,' + l.y.toFixed(2) + 'px,0)';
      });
    });
  }

  /* 03 ZOOM — sticky 100vh: 병 0.6→1.6, 다크→아이보리 원형 wipe, 콜아웃 3개 순차 */
  (function () {
    var sec = $('#zoom'), light = $('#zoomLight'), product = $('#zoomProduct');
    var wipe = { r: 0 };
    var applyWipe = function () {
      light.style.clipPath = 'circle(' + wipe.r.toFixed(2) + '% at 50% 55%)';
      var dark = wipe.r < 74;                                       // 헤더 줄까지 아이보리가 덮이면 반전
      if (dark !== sec.hasAttribute('data-dark')) {
        if (dark) sec.setAttribute('data-dark', '');
        else sec.removeAttribute('data-dark');
        updateHeader();
      }
    };
    var tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
    tl.fromTo(product, { scale: 0.6 }, { scale: function () { return isMobile() ? 1.35 : 1.6; }, duration: 1, ease: 'power1.inOut' }, 0);
    tl.to(wipe, { r: 150, duration: 0.3, ease: 'power2.inOut', onUpdate: applyWipe }, 0.04);
    tl.to('.zoom__intro', { autoAlpha: 0, y: -40, duration: 0.1, ease: 'power1.in' }, 0.34);
    $$('.co', sec).forEach(function (c, i) {
      tl.fromTo(c, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power2.out' }, 0.44 + i * 0.14);
    });
    tl.to({}, { duration: 0.08 });
  })();

  /* 04 CERTIFIED — 스티커 랜덤 회전 리빌 (crav 방식) */
  $$('.sticker').forEach(function (s, i) {
    gsap.fromTo(s,
      { opacity: 0, scale: 0.8, rotate: -15 + 30 * Math.random(), y: 50 },
      {
        opacity: 1, scale: 1, rotate: 0, y: 0, duration: 1, ease: 'back.out(1.6)', delay: (i % 4) * 0.08,
        scrollTrigger: { trigger: s, start: 'top 70%', toggleActions: 'play none none none' }
      });
  });

  /* 06 PARTNERS — 수치 카운트업 */
  $$('[data-count]').forEach(function (el) {
    var end = parseInt(el.dataset.count, 10), o = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: '#stats', start: 'top 82%', once: true,
      onEnter: function () {
        gsap.to(o, { v: end, duration: 2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
