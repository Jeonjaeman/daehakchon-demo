/* One THREE.Points, one draw call. Every particle carries four target positions
   (T0 CI hexagon · T1 persimmon · T2 onggi jar · T3 bottle), four colours and a seed;
   the vertex shader blends between them from uMorph and layers the hero ring, the pour stream,
   the factory dust and the product floor on top. Colours are display (sRGB) values, written as is. */
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const rgb = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const LIGHT = new THREE.Vector3(-0.42, 0.66, 0.62).normalize();
const HALF = LIGHT.clone().add(new THREE.Vector3(0, 0, 1)).normalize();

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* sample `count` points on a geometry; returned sorted by height so that particle i sits at
   a similar height in every target → morphs read as one body reshaping instead of a swarm swap */
function sampleTarget(geo, count, rand, colorFn) {
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).setRandomGenerator(rand).build();
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  const pts = new Array(count);
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    const c = colorFn(p, n);
    pts[i] = { x: p.x, y: p.y, z: p.z, c, k: p.y + Math.atan2(p.z, p.x) * 0.004 };
  }
  pts.sort((a, b) => a.k - b.k);
  const pos = new Float32Array(count * 3), col = new Uint8Array(count * 3);
  for (let i = 0; i < count; i++) {
    const q = pts[i];
    pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
    col[i * 3] = Math.round(Math.min(1, q.c[0]) * 255);
    col[i * 3 + 1] = Math.round(Math.min(1, q.c[1]) * 255);
    col[i * 3 + 2] = Math.round(Math.min(1, q.c[2]) * 255);
  }
  return { pos, col };
}

const lit = (n, amb = 0.5) => amb + (1 - amb) * Math.max(0, n.dot(LIGHT));
const spec = (n, pow = 24) => Math.pow(Math.max(0, n.dot(HALF)), pow);

/* ── T0: CI hexagon from shared/ci.svg (viewBox 100×112) ── */
export const CI_K = 0.0115;           // svg unit → world
const svgToWorld = (x, y) => [(x - 50) * CI_K, (56 - y) * CI_K];
const INNER = [[50, 14], [85, 35], [85, 77], [50, 98], [15, 77], [15, 35]];
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function ciColor(p, n) {
  const sx = p.x / CI_K + 50, sy = 56 - p.y / CI_K;
  const O = rgb(0xeb6100), IV = rgb(0xfff6e9);
  if (Math.abs(n.z) > 0.5) {
    // red diamond is drawn last in the svg, so it is tested first
    if (Math.abs(sx - 48) + Math.abs(sy - 56) < 6) return rgb(0xd7262e);
    if (Math.abs(sx - 42) + Math.abs(sy - 56) < 6) return rgb(0x2f6fb5);
    if (Math.abs(sx - 54) + Math.abs(sy - 56) < 6) return rgb(0xe8b317);
    if (sx > 30 && sx < 70 && sy > 47 && sy < 65) return IV;
    let d = 1e9;
    for (let i = 0; i < 6; i++) { const a = INNER[i], b = INNER[(i + 1) % 6]; d = Math.min(d, segDist(sx, sy, a[0], a[1], b[0], b[1])); }
    if (d < 1.7) return IV;
    return O;
  }
  return mul3(O, 0.82);
}
function ciGeometry() {
  const s = new THREE.Shape();
  [[50, 2], [96, 29], [96, 83], [50, 110], [4, 83], [4, 29]].forEach(([x, y], i) => {
    const [wx, wy] = svgToWorld(x, y);
    if (i === 0) s.moveTo(wx, wy); else s.lineTo(wx, wy);
  });
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -0.06);
  return g;
}

/* ── T1: persimmon ── */
function persimmonGeometry() {
  const g = new THREE.SphereGeometry(0.42, 140, 100);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const th = Math.atan2(z, x), lobe = 1 + 0.05 * Math.cos(6 * th);
    x *= 1.05 * lobe; z *= 1.05 * lobe; y *= 0.82;
    const rxz = Math.hypot(x, z);
    if (y > 0) y -= 0.07 * Math.exp(-(rxz * rxz) / 0.012) * (y / 0.344);   // stem dimple
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function persimmonColor(p, n) {
  const H = 0.344, t = (p.y + H) / (2 * H);            // 0 bottom → 1 top
  const top = rgb(0xff7a1a), bot = rgb(0xeb6100), green = rgb(0x6b8f3a);
  const th = Math.atan2(p.z, p.x), rxz = Math.hypot(p.x, p.z);
  // calyx: four leaves on the top 12%
  const leaf = t > 0.88 && (Math.cos(4 * th) > -0.15 || rxz < 0.07);
  let c = leaf ? green : mix3(bot, top, Math.pow(t, 0.8));
  c = mul3(c, lit(n, 0.52));
  if (!leaf) c = mix3(c, [1, 0.86, 0.66], spec(n) * 0.75);
  return c;
}

/* ── T2: onggi jar (lathe [y, r]) ── */
const ONGGI = [[0, 0.22], [0.08, 0.34], [0.3, 0.42], [0.55, 0.41], [0.75, 0.33], [0.88, 0.27], [0.95, 0.3], [1, 0.29]];
function onggiGeometry() {
  const pts = [new THREE.Vector2(0, -0.5)];
  ONGGI.forEach(([y, r]) => pts.push(new THREE.Vector2(r, y - 0.5)));
  // rolled mouth and a shallow inside so the opening reads from slightly above
  pts.push(new THREE.Vector2(0.255, 0.49), new THREE.Vector2(0.245, 0.36), new THREE.Vector2(0, 0.34));
  const g = new THREE.LatheGeometry(pts, 120);
  g.computeVertexNormals();
  return g;
}
function onggiColor(p, n) {
  const a = rgb(0x3b2314), b = rgb(0x5a3a22), hi = rgb(0x8a6a4a);
  const y = p.y + 0.5, r = Math.hypot(p.x, p.z);
  if (y > 0.84 && r < 0.25) return mul3(rgb(0x24150b), 1.3);            // inside of the mouth
  const l = Math.max(0, n.dot(LIGHT));
  let c = mix3(a, b, l);
  const band = Math.abs(y - 0.56) < 0.012 || Math.abs(y - 0.76) < 0.01 ? 0.55 : 0;   // two glaze lines
  c = mix3(c, hi, Math.max(band, spec(n, 10) * 0.9));
  // the brief's earthenware browns vanish in additive light on the dark chapter: lift them and
  // add a warm rim so the jar's silhouette carries
  const rim = Math.pow(1 - Math.abs(n.z), 3);
  return mix3(mul3(c, 1.75), [0.86, 0.6, 0.36], rim * 0.55);
}

/* ── T3: bottle (profile from assets/img/bottle_profile.json) ── */
function bottleGeometry(profile) {
  const pts = [new THREE.Vector2(0, -0.5)];
  profile.forEach(([y, r]) => pts.push(new THREE.Vector2(Math.max(0.001, r), y - 0.5)));
  pts.push(new THREE.Vector2(0, 0.5));
  return new THREE.LatheGeometry(pts, 96);
}
function bottleColorFn(neckY, band) {
  const label = rgb(0xfff1dc), liquid = rgb(0xf28a16), cap = rgb(0xd9a441), glass = rgb(0x8a6440);
  return (p, n) => {
    const y = p.y + 0.5;
    const l = lit(n, 0.6);
    if (y >= neckY) return mix3(mul3(cap, l), [1, 0.93, 0.7], spec(n, 18) * 0.8);
    const front = Math.atan2(p.x, p.z);                   // 0 = facing camera
    if (y > band[0] && y < band[1] && Math.abs(front) < 1.43) return mul3(label, l);
    if (y > 0.05 && y < 0.78) return mix3(mul3(liquid, l), [1, 0.85, 0.55], spec(n) * 0.6);
    return mul3(glass, l);
  };
}

/* scale applied to each target so that the four bodies read at a similar size */
const T_SCALE = [1, 1.25, 1.12, 1.3];

export function buildParticleGeometry({ count, profile, neckY, band }) {
  const rand = mulberry(1996);
  const targets = [
    sampleTarget(ciGeometry(), count, rand, ciColor),
    sampleTarget(persimmonGeometry(), count, rand, persimmonColor),
    sampleTarget(onggiGeometry(), count, rand, onggiColor),
    sampleTarget(bottleGeometry(profile), count, rand, bottleColorFn(neckY, band)),
  ];
  // one shared shuffle keeps particle i ↔ the same height in every target, while any prefix of the
  // buffer is a uniform subset — so quality fallback can simply draw fewer particles
  const perm = new Uint32Array(count);
  for (let i = 0; i < count; i++) perm[i] = i;
  for (let i = count - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const geo = new THREE.BufferGeometry();
  targets.forEach((t, i) => {
    const s = T_SCALE[i];
    const pos = new Float32Array(count * 3), col = new Uint8Array(count * 3);
    for (let k = 0; k < count; k++) {
      const q = perm[k] * 3;
      pos[k * 3] = t.pos[q] * s; pos[k * 3 + 1] = t.pos[q + 1] * s; pos[k * 3 + 2] = t.pos[q + 2] * s;
      col[k * 3] = t.col[q]; col[k * 3 + 1] = t.col[q + 1]; col[k * 3 + 2] = t.col[q + 2];
    }
    geo.setAttribute('aPos' + i, new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCol' + i, new THREE.BufferAttribute(col, 3, true));
  });
  // independent per-particle randoms: deriving everything from one scalar seed puts (x, z) pairs
  // on a 1D curve, which shows up as streaks in the floor and banding in the ring
  const seed = new Float32Array(count), rnd = new Float32Array(count * 4), dir = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed[i] = rand();
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = rand();
    for (let k = 0; k < 3; k++) dir[i * 3 + k] = rand() * 2 - 1;
  }
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  // three needs a `position` attribute for bounds; the shader never reads it
  geo.setAttribute('position', geo.getAttribute('aPos0'));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  return geo;
}

const VERT = /* glsl */`
attribute vec3 aPos0; attribute vec3 aPos1; attribute vec3 aPos2; attribute vec3 aPos3;
attribute vec3 aCol0; attribute vec3 aCol1; attribute vec3 aCol2; attribute vec3 aCol3;
attribute float aSeed;
attribute vec4 aRnd;
attribute vec3 aDir;
uniform float uMorph, uScatter, uPour, uTime, uFill, uIntro, uRing, uDust, uFloor, uAdd, uAlpha, uSize, uPx, uRef;
uniform vec2 uMouse;
uniform vec3 uShapeOffset; uniform float uShapeScale; uniform float uShapeRot;
uniform vec3 uRingC; uniform float uRingScale;
uniform vec3 uMouth; uniform vec3 uPourVel;
uniform float uFloorY;
varying vec3 vCol; varying float vA;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

void main() {
  float r1 = aRnd.x, r2 = aRnd.y, r3 = aRnd.z, r4 = aRnd.w;
  vec3 n = aDir;

  // ── morph between the four bodies ──
  float m = clamp(uMorph, 0.0, 3.0);
  float seg = min(floor(m), 2.0);
  float f = m - seg;
  vec3 a = aPos0, b = aPos1, ca = aCol0, cb = aCol1;
  if (seg > 0.5) { a = aPos1; b = aPos2; ca = aCol1; cb = aCol2; }
  if (seg > 1.5) { a = aPos2; b = aPos3; ca = aCol2; cb = aCol3; }
  float d = r1 * 0.35;
  float k = smoothstep(d, d + 0.65, f);
  vec3 p = mix(a, b, k);
  vec3 col = mix(ca, cb, k);
  // scatter = sin(π·frac) × 0.35, shaped as a swirl around the vertical axis so the body
  // visibly unwinds and re-forms instead of dissolving into uniform noise
  float sk = sin(3.14159265 * k);
  vec3 swirl = vec3(-p.z, 0.22 * sin(p.x * 5.0 + aSeed * 6.0), p.x) * 1.1 + n * 0.55;
  p += swirl * sk * 0.35 + n * uScatter * (0.75 + 0.25 * sin(uTime * 0.9 + aSeed * 40.0));
  p.xz = rot(uShapeRot) * p.xz;
  p = p * uShapeScale + uShapeOffset;

  // ── hero: a slow elliptical ring + loose cloud around the bottle ──
  vec3 ring;
  if (r3 < 0.78) {
    float ang = aSeed * 6.2831853 * 11.0 + uTime * (0.05 + 0.06 * r2);
    float rad = mix(0.8, 1.14, r1 * r1) + 0.05 * sin(ang * 3.0 + uTime * 0.3);
    ring = vec3(cos(ang) * rad * 1.02, sin(ang) * rad * 0.24, sin(ang) * rad * 0.55 - 0.5);
    ring += n * 0.03;
  } else {
    ring = normalize(n + vec3(0.0001)) * mix(0.4, 0.82, r1) * vec3(0.85, 1.2, 0.6) + vec3(0.0, 0.0, -0.25);
    ring.y += sin(uTime * 0.45 + aSeed * 21.0) * 0.03;
  }
  ring.xy = rot(0.2) * ring.xy;
  ring = ring * uRingScale + uRingC;
  float rk = smoothstep(r2 * 0.3, r2 * 0.3 + 0.7, uRing);
  p = mix(p, ring, rk);
  col = mix(col, mix(vec3(0.922, 0.38, 0.0), vec3(0.95, 0.61, 0.53), step(0.82, r4)), rk * 0.55);

  // ── factory / certified / years: floating dust ──
  vec3 dust = vec3(n.x * 2.7, n.y * 1.55, mix(-1.4, 2.3, r2));
  dust.xy += vec2(sin(uTime * 0.13 + aSeed * 40.0), cos(uTime * 0.11 + aSeed * 31.0)) * 0.07;
  float dk = smoothstep(r1 * 0.3, r1 * 0.3 + 0.7, uDust);
  p = mix(p, dust, dk);

  // ── products: a shallow floor ──
  vec3 fl = vec3(n.x * 3.6, uFloorY + 0.035 * sin(n.x * 7.0 + uTime * 0.7) + 0.02 * n.y, mix(-2.8, 0.9, r1));
  float fk = smoothstep(r2 * 0.3, r2 * 0.3 + 0.7, uFloor);
  p = mix(p, fl, fk);
  col = mix(col, mix(vec3(0.922, 0.38, 0.0), vec3(0.95, 0.61, 0.53), step(0.7, r4)), fk * 0.6);

  // ── pour: 20% of the particles leave along a parabola from the bottle mouth ──
  float stream = step(r4, 0.2);
  float s = fract(r3 * 7.0 + uTime * 0.34);
  float T = s * 1.45;
  vec3 sp = uMouth + uPourVel * T + vec3(0.0, -1.35, 0.0) * T * T;
  sp += n * (0.006 + 0.05 * s * s);
  float pk = stream * smoothstep(r1 * 0.4, r1 * 0.4 + 0.6, uPour);
  p = mix(p, sp, pk);
  col = mix(col, vec3(0.95, 0.54, 0.09), pk);

  // ── loader: the CI fills from the inside out with real load progress ──
  float key = clamp(length(aPos0.xy) / 0.64, 0.0, 1.0) * 0.9 + r2 * 0.1;
  float filled = smoothstep(key - 0.05, key + 0.01, uFill);
  float vis = mix(0.07 + 0.93 * filled, 1.0, uIntro);

  p.xy += uMouse * (0.6 + 0.4 * r2);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = mix(2.2, 4.5, r2) * uSize * (1.0 - 0.42 * dk - 0.4 * fk) * (1.0 + 0.3 * pk);
  gl_PointSize = min(sz * uPx * uRef / max(0.2, -mv.z), 48.0);
  vCol = col * mix(1.0, 1.55, uAdd);
  vA = uAlpha * vis * (0.6 + 0.4 * r1) * mix(1.0, 0.6, dk) * mix(1.0, 0.42 + 0.3 * step(0.85, r3), fk) * (1.0 + 0.6 * pk);
}`;

const FRAG = /* glsl */`
uniform sampler2D uDot;
uniform float uAdd;
varying vec3 vCol; varying float vA;
void main() {
  // the sprite is a soft gaussian; at 2–4 px it needs a fuller core to read as a dot
  float a = pow(texture2D(uDot, gl_PointCoord).a, 0.55) * vA;
  if (a < 0.004) discard;
  // premultiplied output: alpha 0 → pure additive (dark chapters), alpha a → normal "over" (ivory chapters)
  gl_FragColor = vec4(vCol * a, a * (1.0 - uAdd));
}`;

export function createParticles({ geometry, dot, pixelRatio }) {
  const uniforms = {
    uMorph: { value: 0 }, uScatter: { value: 0 }, uPour: { value: 0 }, uTime: { value: 0 },
    uFill: { value: 0 }, uIntro: { value: 0 }, uRing: { value: 0 }, uDust: { value: 0 }, uFloor: { value: 0 },
    uAdd: { value: 0 }, uAlpha: { value: 0.9 }, uSize: { value: 1 }, uPx: { value: pixelRatio }, uRef: { value: 3 },
    uMouse: { value: new THREE.Vector2() },
    uShapeOffset: { value: new THREE.Vector3() }, uShapeScale: { value: 1 }, uShapeRot: { value: 0 },
    uRingC: { value: new THREE.Vector3() }, uRingScale: { value: 1 },
    uMouth: { value: new THREE.Vector3() }, uPourVel: { value: new THREE.Vector3() },
    uFloorY: { value: -0.95 },
    uDot: { value: dot },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  return { points, uniforms };
}
