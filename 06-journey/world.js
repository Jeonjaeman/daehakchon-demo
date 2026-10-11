/* The 3D world. Two renderers share one camera:
     #gl      (z 0) — particles, persimmon sprites, factory plates, certificate tiles, ring, product cards
     #glFront (z 2) — the glass bottle only, so the hero type can sit between the two canvases.
   Everything visual is a pure function of the master progress P (plus time for idle motion and
   the pointer for parallax/drag) — see render(P, t, dt). */
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { buildParticleGeometry, createParticles } from './particles.js';
import { createBottle, createClearQuad } from './bottle.js';
import { createFactory, createTiles, createRing, createCards, createSprites, yearAngle } from './props.js';
import { NODES, PRODUCTS, CERTS, smooth, snap, range, lerp, clamp01, damp, morphAt, darkAt } from './chapters.js';

const A = '../assets/';
const FOV = 35, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed: ' + url));
    img.src = url;
  });
}
/* downsizes large photos on a canvas before upload (GPU memory), keeps NoColorSpace unless asked */
function toTexture(img, max, { colorSpace = THREE.NoColorSpace, premultiply = false } = {}) {
  let src = img;
  const big = Math.max(img.naturalWidth, img.naturalHeight);
  if (big > max) {
    const s = max / big, c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    src = c;
  }
  const t = new THREE.Texture(src);
  t.colorSpace = colorSpace;
  t.premultiplyAlpha = premultiply;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export function createWorld({ canvas, canvasFront, mobile, motion }) {
  const S = motion ? smooth : snap;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);

  // no MSAA on the back canvas: 60k blended points × 4 samples is the most expensive thing on the page;
  // the props there carry their own edge smoothing (SDF cards/tiles, soft-masked plates)
  const back = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  back.setPixelRatio(DPR);
  back.setClearColor(0x000000, 0);
  back.toneMapping = THREE.ACESFilmicToneMapping;
  back.toneMappingExposure = 1.0;
  const front = new THREE.WebGLRenderer({ canvas: canvasFront, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  front.setPixelRatio(DPR);
  front.setClearColor(0x000000, 0);
  front.toneMapping = THREE.ACESFilmicToneMapping;
  front.toneMappingExposure = 1.0;

  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.05, 60);
  camera.position.set(0, 0, 3);
  const scene = new THREE.Scene();
  const fscene = new THREE.Scene();

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 3.5, 4);
  scene.add(key, new THREE.HemisphereLight(0xfff6e9, 0x2a1205, 0.5));
  const fkey = new THREE.DirectionalLight(0xffffff, 2.4); fkey.position.set(-3, 4, 5);
  const frim = new THREE.DirectionalLight(0xffd8b0, 1.6); frim.position.set(4, 1.5, -3);
  fscene.add(fkey, frim, createClearQuad());

  const st = {
    intro: 0, fill: 0, ready: false, fps: 60, P: 0,
    mouse: new THREE.Vector2(), mouseS: new THREE.Vector2(), px: new THREE.Vector2(-999, -999), pointerFine: matchMedia('(pointer: fine)').matches,
    cursor: '', node: 0, hoverTile: -1, hoverCard: -1,
    yearOff: 0, yearVel: 0, carousel: mobile ? 0 : 1.5, carVel: 0, drag: null,
    frontDrawn: true,
  };
  const L = {};   // layout, rebuilt on resize
  let particles = null, bottle = null, factory = null, tiles = null, ring = null, cards = null, sprites = [];
  let tileEls = [], nodeEls = [];
  let onCard = () => {};

  /* ───────── layout ───────── */
  function layout() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    const portrait = aspect < 0.9;
    const D = portrait ? Math.max(3, 1.75 / (aspect * 2 * TAN)) : Math.max(3, 3.2 / (aspect * 2 * TAN));
    const vh = 2 * D * TAN, vw = vh * aspect;
    Object.assign(L, {
      w, h, aspect, portrait, D, vh, vw,
      loaderCI: new THREE.Vector3(0, portrait ? 0.08 * vh : 0.07 * vh, 0), loaderScale: portrait ? 0.62 : 0.82,
      heroBottle: portrait ? new THREE.Vector3(0.02, -0.1 * vh, 0) : new THREE.Vector3(0.085 * vw, -0.025 * vh, 0),
      heroScale: portrait ? Math.min(1.3, 0.34 * vh) : 1.3,
      pourBottle: portrait ? new THREE.Vector3(0.12, 0.14 * vh, 0) : new THREE.Vector3(0.0 * vw, 0.17 * vh, 0),
      ringScale: portrait ? 0.62 : 1,
      morph: portrait ? new THREE.Vector3(0, 0.07 * vh, 0) : new THREE.Vector3(0.1 * vw, 0.01, 0), morphScale: portrait ? 0.95 : 1,
      tiles: portrait ? new THREE.Vector3(0, -0.07 * vh, 0) : new THREE.Vector3(0.16 * vw, -0.03, 0), tileScale: portrait ? 0.95 : 1.02,
      ring: portrait ? new THREE.Vector3(0, -0.06 * vh, 0) : new THREE.Vector3(-0.07 * vw, -0.07, 0), ringK: portrait ? 0.5 : 0.6,
      cards: portrait ? new THREE.Vector3(0, -0.02 * vh, 0) : new THREE.Vector3(0.06 * vw, -0.1, 0), cardScale: portrait ? 1.35 : 1.0,
      contactCI: portrait ? new THREE.Vector3(-0.3, 0.27 * vh, 0) : new THREE.Vector3(0.2 * vw, 0.04, 0), contactScale: portrait ? 0.5 : 0.8,
      contactBottle: portrait ? new THREE.Vector3(0.42, 0.25 * vh, 0) : new THREE.Vector3(0.2 * vw + 0.66, -0.04, 0), contactBottleScale: portrait ? 0.74 : 0.7,
      floorY: -0.44 * vh,
    });
    back.setSize(w, h, false);
    front.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (particles) particles.uniforms.uRef.value = D;
  }
  layout();

  /* ───────── boot: profile + sprite → particle field (renders the loader) ───────── */
  let profileData = null, dotTex = null;
  async function boot() {
    const [prof, dotImg] = await Promise.all([fetch(A + 'img/bottle_profile.json').then((r) => r.json()), loadImage(A + 'img/dot.png')]);
    profileData = prof;
    dotTex = toTexture(dotImg, 128);
    const count = mobile ? 20000 : 60000;
    const geometry = buildParticleGeometry({ count, profile: prof.profile, neckY: prof.neck_y, band: prof.label_band });
    particles = createParticles({ geometry, dot: dotTex, pixelRatio: DPR });
    particles.uniforms.uRef.value = L.D;
    particles.uniforms.uSize.value = mobile ? 1.15 : 1;
    scene.add(particles.points);
  }

  /* ───────── load: HDR, textures, fonts — reports real progress ───────── */
  async function load(onProgress) {
    const items = [
      { w: 1.6, run: (p) => new RGBELoader().loadAsync(A + 'env/studio_small_09_1k.hdr', (e) => { if (e.total) p(e.loaded / e.total); }) },
      { w: 0.06, run: () => loadImage(A + 'img/label_fiber.webp') },
      { w: 0.05, run: () => loadImage(A + 'img/c1_persimmon_512.webp') },
      { w: 0.36, run: () => loadImage(A + 'img/h1_factory_wide.webp') },
      { w: 0.02, run: () => loadImage(A + 'img/h1_factory_wide_depth.webp') },
      { w: 0.35, run: () => loadImage(A + 'img/p1_pipes.webp') },
      { w: 0.22, run: () => loadImage(A + 'img/f3_bottling.webp') },
      ...PRODUCTS.map((p) => ({ w: 0.15, run: () => loadImage(p.tex) })),
      { w: 0.15, run: () => (document.fonts ? Promise.all([document.fonts.load('300 40px "Pretendard Variable"'), document.fonts.load('800 40px "Pretendard Variable"'), document.fonts.load('700 20px Montserrat')]).then(() => document.fonts.ready) : Promise.resolve()) },
    ];
    const total = items.reduce((s, i) => s + i.w, 0);
    const part = items.map(() => 0);
    const report = () => onProgress(part.reduce((s, v, i) => s + v * items[i].w, 0) / total);
    const results = await Promise.all(items.map((it, i) => it.run((f) => { part[i] = Math.min(0.98, f); report(); }).then((r) => { part[i] = 1; report(); return r; })));
    const [hdr, labelImg, persImg, facImg, depthImg, pipesImg, bottlingImg, ...rest] = results;
    const cutImgs = rest.slice(0, 4);

    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm1 = new THREE.PMREMGenerator(front);
    fscene.environment = pm1.fromEquirectangular(hdr).texture;
    pm1.dispose();
    const pm2 = new THREE.PMREMGenerator(back);
    scene.environment = pm2.fromEquirectangular(hdr).texture;
    pm2.dispose();

    const max = mobile ? 1024 : 2048;
    bottle = createBottle({
      profile: profileData.profile, neckY: profileData.neck_y, band: profileData.label_band, arc: profileData.label_arc,
      labelTex: toTexture(labelImg, 2048), mobile,
    });
    fscene.add(bottle.group);

    const persTex = toTexture(persImg, 512, { colorSpace: THREE.SRGBColorSpace });
    sprites = createSprites(persTex);
    sprites.forEach((s) => scene.add(s));

    factory = createFactory({ map: toTexture(facImg, max), depth: toTexture(depthImg, 1024), pipes: toTexture(pipesImg, mobile ? 1024 : 1600), bottling: toTexture(bottlingImg, mobile ? 1024 : 1600), mobile });
    scene.add(factory.group);

    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    tiles = createTiles({ count: CERTS.length, rand });
    tiles.tiles.forEach((t) => { t.mesh.material = t.mesh.material.clone(); });
    scene.add(tiles.group);

    ring = createRing({ nodes: NODES, dot: dotTex });
    scene.add(ring.group);

    const tints = [[0.95, 0.55, 0.15], [0.95, 0.5, 0.1], [0.55, 0.35, 0.18], [0.85, 0.2, 0.15]];
    cards = createCards({ textures: cutImgs.map((im) => toTexture(im, mobile ? 768 : 1024, { premultiply: true })), tints });
    scene.add(cards.group);

    // warm-up: compile every program and upload every texture behind the loader
    [factory.group, tiles.group, ring.group, cards.group, ...sprites].forEach((o) => { o.visible = true; });
    back.compile(scene, camera);
    front.compile(fscene, camera);
    st.ready = true;
  }

  /* ───────── adaptive quality (slow GPUs): lower DPR, draw a uniform subset of the particles ───────── */
  let quality = 0;
  function setQuality(q) {
    quality = Math.max(0, Math.min(2, q));
    const dpr = Math.min(DPR, [1.5, 1.25, 1][quality]);
    back.setPixelRatio(dpr); front.setPixelRatio(dpr);
    back.setSize(L.w, L.h, false); front.setSize(L.w, L.h, false);
    if (particles) {
      const n = particles.points.geometry.getAttribute('aSeed').count;
      particles.points.geometry.setDrawRange(0, Math.round(n * [1, 0.72, 0.5][quality]));
      particles.uniforms.uPx.value = dpr;
      particles.uniforms.uSize.value = (mobile ? 1.15 : 1) * [1, 1.12, 1.25][quality];
    }
    return quality;
  }

  /* ───────── DOM label binding ───────── */
  function bindLabels(tEls, nEls, cardCb) { tileEls = tEls; nodeEls = nEls; onCard = cardCb; }

  /* ───────── pointer ───────── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function onMove(e) {
    st.px.set(e.clientX, e.clientY);
    st.mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    const d = st.drag;
    if (!d) return;
    const dx = e.clientX - d.last, now = performance.now(), dtm = Math.max(1, now - d.t);
    d.last = e.clientX; d.t = now; d.moved += Math.abs(dx);
    if (d.kind === 'ring') {
      const k = 24 / innerWidth;               // a full-width drag ≈ 24 years
      st.yearOff -= dx * k;
      st.yearVel = (-dx * k) / (dtm / 1000);
    } else {
      const k = 1 / (0.95 * L.cardScale * (L.w / L.vw));   // px → card index
      st.carousel -= dx * k;
      st.carVel = (-dx * k) / (dtm / 1000);
    }
  }
  function onDown(e) {
    if (!st.ready) return;
    const P = st.P;
    const kind = P > 0.735 && P < 0.84 ? 'ring' : P > 0.865 && P < 0.945 ? 'cards' : null;
    if (!kind) return;
    st.drag = { kind, last: e.clientX, t: performance.now(), moved: 0, card: st.hoverCard };
    st.yearVel = 0; st.carVel = 0;
    onMove(e);
  }
  function onUp(e) {
    const d = st.drag;
    if (!d) return;
    st.drag = null;
    if (d.kind === 'cards' && d.moved < 6) {
      // taps on touch screens have no hover: pick the card under the finger
      const hit = pick(e.clientX, e.clientY, cards.hit);
      const i = hit ? hit.object.userData.card : d.card;
      if (i >= 0) onCard(i);
    }
  }
  function pick(x, y, list) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(list, false);
    return hits[0] || null;
  }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', () => { st.drag = null; });

  /* ───────── the pure P → frame function ───────── */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), look = new THREE.Vector3(), prj = new THREE.Vector3();
  const tmpE = new THREE.Euler(), ringInv = new THREE.Matrix4();

  function cameraAt(P, t) {
    const m = st.mouseS;
    // base framing
    v1.set(m.x * 0.07, m.y * 0.045, L.D);
    look.set(0, 0, 0);
    // ORIGIN: slow 25° orbit around the morphing body
    const om = S(0.215, 0.262, P) * (1 - S(0.445, 0.49, P));
    if (om > 0) {
      const ang = THREE.MathUtils.degToRad(-12 + 25 * easeInOut(range(0.22, 0.46, P)));
      v2.set(L.morph.x + Math.sin(ang) * L.D, L.morph.y + 0.1, Math.cos(ang) * L.D);
      v1.lerp(v2, om);
      look.lerp(L.morph, om);
    }
    // FACTORY: dolly z 2.6 → 0.6 with ±0.15 mouse parallax
    const of = S(0.445, 0.49, P) * (1 - S(0.605, 0.645, P));
    if (of > 0) {
      const z = lerp(2.6, 0.6, easeInOut(range(0.475, 0.612, P)));
      v2.set(m.x * 0.15, m.y * 0.15 * 0.7, z);
      v3.set(m.x * 0.04, m.y * 0.03, -4);
      v1.lerp(v2, of);
      look.lerp(v3, of);
    }
    camera.position.copy(v1);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  }

  function render(P, t, dt) {
    st.P = P;
    if (!particles) return;
    const u = particles.uniforms;
    const intro = st.intro;
    if (motion) st.mouseS.set(damp(st.mouseS.x, st.mouse.x, 4, dt), damp(st.mouseS.y, st.mouse.y, 4, dt));
    else st.mouseS.set(0, 0);
    cameraAt(P, t);
    const dark = darkAt(P, S);

    // ── bottle ──
    let bVis = false;
    if (bottle) {
      const g = bottle.group;
      const pourK = S(0.105, 0.19, P);
      const gone = S(0.2, 0.245, P);
      const backK = S(0.952, 0.988, P);
      let scale, pos = v2;
      if (P < 0.6) {
        pos.copy(L.heroBottle).lerp(L.pourBottle, easeInOut(pourK));
        scale = L.heroScale * (1 - gone) * (0.55 + 0.45 * easeOut(intro));
        pos.y += (1 - easeOut(intro)) * -0.35;
      } else {
        pos.copy(L.contactBottle);
        scale = L.contactBottleScale * backK;
      }
      if (motion) pos.y += Math.sin(t * 1.1) * 0.04 * (1 - pourK);
      g.position.copy(pos);
      g.scale.setScalar(Math.max(1e-4, scale));
      const tx = motion ? -st.mouseS.x * THREE.MathUtils.degToRad(12) : 0;
      const ty = motion ? st.mouseS.y * THREE.MathUtils.degToRad(12) : 0;
      g.userData.rz = motion ? damp(g.userData.rz || 0, tx, 6, dt) : 0;
      g.userData.rx = motion ? damp(g.userData.rx || 0, -ty, 6, dt) : 0;
      g.rotation.set(g.userData.rx, (motion ? Math.sin(t * 0.55) * 0.05 : 0) + (P > 0.6 ? -0.35 : 0), g.userData.rz);
      bottle.body.rotation.z = P < 0.6 ? THREE.MathUtils.degToRad(70) * easeInOut(pourK) : 0;
      fscene.updateMatrixWorld();
      bottle.centre(v3);
      const levelK = P < 0.6 ? S(0.13, 0.21, P) : 0;
      bottle.setLevel(v3.y + scale * lerp(0.28, -0.05, levelK));
      bVis = scale > 0.002 && intro > 0;
      // pour stream origin and velocity for the particles
      bottle.mouth(u.uMouth.value);
      bottle.axis(u.uPourVel.value).multiplyScalar(0.42 * Math.max(0.5, scale / 1.3));
      u.uRingC.value.copy(v3);
    }

    // ── particles ──
    const morph = morphAt(P, motion);
    u.uIntro.value = intro;
    u.uFill.value = st.fill;
    u.uMorph.value = intro < 1 ? lerp(0, morph, easeInOut(intro)) : morph;
    u.uRing.value = easeInOut(intro) * (1 - S(0.165, 0.245, P));
    u.uRingScale.value = L.ringScale;
    u.uPour.value = S(0.118, 0.145, P) * (1 - S(0.215, 0.255, P)) * (intro > 0 ? 1 : 0);
    u.uDust.value = S(0.455, 0.51, P) * (1 - S(0.835, 0.875, P));
    u.uFloor.value = S(0.845, 0.885, P) * (1 - S(0.952, 0.99, P));
    u.uScatter.value = motion ? Math.sin(Math.PI * intro) * 0.28 : 0;
    u.uAdd.value = dark;
    u.uAlpha.value = lerp(0.92, 0.5, dark);
    u.uTime.value = motion ? t : 0;
    u.uFloorY.value = L.floorY;
    u.uMouse.value.set(st.mouseS.x * 0.06, st.mouseS.y * 0.06);
    // shape placement: loader CI → morph stage → contact CI
    const toContact = S(0.9, 0.95, P);
    v1.copy(L.loaderCI).lerp(L.morph, easeInOut(intro)).lerp(L.contactCI, toContact);
    u.uShapeOffset.value.copy(v1);
    u.uShapeScale.value = lerp(lerp(L.loaderScale, L.morphScale, easeInOut(intro)), L.contactScale, toContact);
    u.uShapeRot.value = motion ? Math.sin(t * 0.22) * 0.18 * (1 - toContact) : 0;

    // ── hero sprites ──
    if (sprites.length) {
      const so = intro * (1 - S(0.07, 0.14, P));
      sprites.forEach((s, i) => {
        s.visible = so > 0.01;
        if (!s.visible) return;
        const base = i === 0
          ? (L.portrait ? [-0.32 * L.vw, -0.2 * L.vh, -1.0, 0.36] : [0.34 * L.vw, 0.3 * L.vh, -1.5, 0.5])
          : (L.portrait ? [0.36 * L.vw, 0.06 * L.vh, -0.8, 0.3] : [-0.02 * L.vw, -0.34 * L.vh, -0.9, 0.36]);
        s.position.set(base[0] + st.mouseS.x * 0.08 * (i + 1), base[1] + (motion ? Math.sin(t * 0.7 + i * 2) * 0.05 : 0), base[2]);
        s.scale.setScalar(base[3]);
        s.material.rotation = motion ? Math.sin(t * 0.4 + i) * 0.12 : 0;
        s.material.opacity = so * 0.95;
      });
    }

    // ── factory ──
    if (factory) factory.set(S(0.45, 0.495, P) * (1 - S(0.6, 0.635, P)));

    // ── certificate tiles ──
    st.cursor = '';
    if (tiles) {
      const vis = P > 0.61 && P < 0.745;
      tiles.group.visible = vis;
      tiles.group.position.copy(L.tiles);
      tiles.group.scale.setScalar(L.tileScale);
      const kOut = S(0.712, 0.738, P);
      let hov = -1;
      if (vis && st.pointerFine && !st.drag) { const h = pick(st.px.x, st.px.y, tiles.meshes); if (h) hov = tiles.meshes.indexOf(h.object); }
      st.hoverTile = hov;
      if (!vis && st.tilesShown) { tileEls.forEach((el) => { el.style.opacity = '0'; }); st.tilesShown = false; }
      if (vis) st.tilesShown = true;
      if (vis) tiles.tiles.forEach((tile, i) => {
        const a = 0.616 + i * 0.0026;
        const kIn = motion ? easeOut(range(a, a + 0.024, P)) : snap(a, a + 0.024, P);
        tile.lift = motion ? damp(tile.lift, i === hov ? 1 : 0, 10, dt) : 0;
        const m = tile.mesh;
        m.position.lerpVectors(tile.from, tile.slot, kIn);
        m.position.y += kOut * 0.9;
        m.position.z += kOut * 1.4 + tile.lift * 0.08;
        tmpE.set(tile.spin.x * (1 - kIn), tile.spin.y * (1 - kIn), tile.spin.z * (1 - kIn));
        m.rotation.copy(tmpE);
        if (motion && kIn > 0.99) { m.rotation.x += Math.sin(t * 0.8 + i) * 0.05; m.rotation.y += Math.cos(t * 0.7 + i * 1.3) * 0.06; }
        m.scale.setScalar(1 + tile.lift * 0.07);
        const op = kIn * (1 - kOut);
        m.material.opacity = op;
        m.children[0].material.opacity = (tile.orange ? 0.55 : 0.35) * op;
        m.visible = op > 0.005;
        const el = tileEls[i];
        if (el) {
          m.updateMatrixWorld();
          prj.setFromMatrixPosition(m.matrixWorld).project(camera);
          const x = (prj.x * 0.5 + 0.5) * L.w, y = (-prj.y * 0.5 + 0.5) * L.h;
          const o = smooth(0.86, 1, kIn) * (1 - kOut);    // labels only once the tile has landed
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%) scale(${(1 + tile.lift * 0.07).toFixed(3)})`;
          el.style.opacity = o.toFixed(3);
        }
      });
    }

    // ── 30-year ring ──
    if (ring) {
      const k = S(0.705, 0.745, P) * (1 - S(0.835, 0.865, P));
      ring.group.visible = k > 0.003;
      if (!st.drag && motion) { st.yearOff += st.yearVel * dt; st.yearVel *= Math.exp(-3 * dt); }
      if (!ring.group.visible && st.ringShown) { nodeEls.forEach((el) => { el.style.opacity = '0'; }); st.ringShown = false; }
      if (ring.group.visible) {
        st.ringShown = true;
        ring.group.position.copy(L.ring);
        ring.group.rotation.set(0.38, 0, 0);
        ring.group.scale.setScalar(L.ringK * (0.86 + 0.14 * k));
        // scroll year: hold on each node, then travel to the next (1996 → 2026)
        const uu = range(0.742, 0.832, P) * 7, i0 = Math.min(6, Math.floor(uu)), f = uu - i0;
        const sy = NODES[i0].y + (NODES[i0 + 1].y - NODES[i0].y) * (motion ? smooth(0.45, 1, f) : (f > 0.72 ? 1 : 0));
        const year = sy + st.yearOff;
        const yAng = yearAngle(year);
        ring.spin.rotation.y = -yAng;
        let best = 0, bd = 1e9;
        ring.items.forEach((it, j) => {
          let dA = Math.abs(((yearAngle(it.node.y) - yAng) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (dA < bd) { bd = dA; best = j; }
        });
        st.node = best;
        ring.mats[0].opacity = 0.7 * k; ring.mats[1].opacity = 0.25 * k; ring.mats[2].opacity = 0.5 * k;
        ring.group.updateMatrixWorld();
        ringInv.copy(ring.group.matrixWorld).invert();
        ring.items.forEach((it, j) => {
          it.on = motion ? damp(it.on, j === best ? 1 : 0, 8, dt) : (j === best ? 1 : 0);
          const ns = 1 + 0.9 * it.on;
          it.mesh.scale.setScalar(ns);
          it.halo.scale.setScalar((0.16 * (1 + 0.5 * it.on)) / ns);   // the halo is a child: undo the node scale
          it.mat.opacity = k;
          it.mat.color.setHex(j === best ? 0xf28a16 : 0xfff1dc);
          it.halo.material.opacity = (0.2 + 0.6 * it.on) * k;
          const el = nodeEls[j];
          if (!el) return;
          prj.setFromMatrixPosition(it.mesh.matrixWorld);
          const depth = v3.copy(prj).applyMatrix4(ringInv).z / 1.4;   // −1 back … 1 front
          prj.project(camera);
          const x = (prj.x * 0.5 + 0.5) * L.w, y = (-prj.y * 0.5 + 0.5) * L.h;
          el.style.transform = `translate3d(${(x + 8 * it.on).toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
          // back half of the ring keeps its dots but drops its labels (they would pile up behind the front)
          el.style.opacity = (k * clamp01((depth + 0.15) / 0.5)).toFixed(3);
          el.classList.toggle('is-on', j === best);
        });
      }
      if (ring.group.visible && P > 0.735 && P < 0.84) st.cursor = 'DRAG';
    }

    // ── product cards ──
    if (cards) {
      const vis = P > 0.835 && P < 0.97;
      cards.group.visible = vis;
      if (!st.drag && motion) {
        st.carousel += st.carVel * dt;
        st.carVel *= Math.exp(-4 * dt);
        const lo = -0.25, hi = 3.25;
        if (st.carousel < lo) st.carousel = damp(st.carousel, lo, 10, dt);
        if (st.carousel > hi) st.carousel = damp(st.carousel, hi, 10, dt);
        if (L.portrait && Math.abs(st.carVel) < 0.4) st.carousel = damp(st.carousel, Math.round(clamp01(st.carousel / 3) * 3), 6, dt);
      }
      if (vis) {
        cards.group.position.copy(L.cards);
        cards.group.scale.setScalar(L.cardScale);
        let hov = -1;
        const active = P > 0.865 && P < 0.945;
        if (active && st.pointerFine) { const h = pick(st.px.x, st.px.y, cards.hit); if (h) hov = h.object.userData.card; }
        st.hoverCard = hov;
        const kOut = S(0.94, 0.965, P);
        cards.cards.forEach((c, i) => {
          const a = 0.842 + i * 0.007;
          const kIn = motion ? easeOut(range(a, a + 0.032, P)) : snap(a, a + 0.032, P);
          const x = (i - st.carousel) * 0.95;
          c.g.position.set(x, (1 - kIn) * -1.5 + kOut * 0.9, -0.16 * x * x);
          c.hover = motion ? damp(c.hover, i === hov ? 1 : 0, 8, dt) : 0;
          let trx = 0, tryy = 0;
          if (i === hov) {
            c.g.updateMatrixWorld();
            prj.setFromMatrixPosition(c.g.matrixWorld).project(camera);
            const dx = clamp01((st.mouse.x - prj.x) * 2.2 + 0.5) - 0.5, dy = clamp01((st.mouse.y - prj.y) * 1.6 + 0.5) - 0.5;
            tryy = dx * 0.7; trx = -dy * 0.7;
            c.fu.uLight.value.set(dx, dy).normalize();
          }
          c.rx = motion ? damp(c.rx, trx, 8, dt) : 0;
          c.ry = motion ? damp(c.ry, tryy, 8, dt) : 0;
          c.g.rotation.set(c.rx, -0.2 * x + c.ry, 0);
          c.g.scale.setScalar(1 + 0.05 * c.hover);
          const op = kIn * (1 - kOut);
          c.bu.uOpacity.value = op; c.fu.uOpacity.value = op;
          c.bu.uHover.value = c.hover; c.fu.uHover.value = c.hover;
          c.g.visible = op > 0.004;
        });
        if (active) st.cursor = hov >= 0 ? 'VIEW' : 'DRAG';
      }
    }

    // ── draw ──
    back.render(scene, camera);
    if (bVis) { front.render(fscene, camera); st.frontDrawn = true; }
    else if (st.frontDrawn) { front.clear(); st.frontDrawn = false; }
    st.calls = back.info.render.calls + (bVis ? front.info.render.calls : 0);
  }

  return {
    boot, load, render, layout, bindLabels, state: st, camera, L,
    get morph() { return particles ? particles.uniforms.uMorph.value : 0; },
    setQuality,
    get renderers() { return [back, front]; },
    /** QA only: internals for probes */
    get debug() { return { bottle, particles, scene, fscene, back, front }; },
  };
}
