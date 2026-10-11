/* Chapter props on the back canvas: 2.5D factory, certificate hex tiles, the 30-year ring,
   product cards and the two persimmon sprites of the hero. Each factory returns plain objects;
   world.js decides visibility and drives them from P. Textures for ShaderMaterials stay in
   NoColorSpace so their sRGB values are written straight to the canvas. */
import * as THREE from 'three';

/* ───────── FACTORY: depth-displaced plane + two soft-edged foreground plates ───────── */
const FACTORY_VERT = /* glsl */`
uniform sampler2D uDepth; uniform float uDisp;
varying vec2 vUv; varying float vD;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  vD = d;
  vec3 p = position;
  p.z += d * uDisp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FACTORY_FRAG = /* glsl */`
uniform sampler2D uMap; uniform float uOpacity, uDim;
varying vec2 vUv; varying float vD;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  float e = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
  c *= uDim * (0.72 + 0.4 * vD);
  c = mix(c, c * vec3(1.1, 0.93, 0.8), 0.4);
  gl_FragColor = vec4(c, uOpacity * e);
}`;
const PLATE_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PLATE_FRAG = /* glsl */`
uniform sampler2D uMap; uniform float uOpacity, uDim;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb * uDim;
  float m = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float e = smoothstep(0.0, 0.16, m);
  gl_FragColor = vec4(c, uOpacity * e);
}`;

export function createFactory({ map, depth, pipes, bottling, mobile }) {
  const group = new THREE.Group();
  const u = { uMap: { value: map }, uDepth: { value: depth }, uDisp: { value: 0.35 }, uOpacity: { value: 0 }, uDim: { value: 0.6 } };
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.8, mobile ? 128 : 256, mobile ? 55 : 110),
    new THREE.ShaderMaterial({ uniforms: u, vertexShader: FACTORY_VERT, fragmentShader: FACTORY_FRAG, transparent: true }),
  );
  plane.renderOrder = 0;
  group.add(plane);
  const plate = (tex, w, h) => {
    const pu = { uMap: { value: tex }, uOpacity: { value: 0 }, uDim: { value: 0.72 } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ uniforms: pu, vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, transparent: true, depthWrite: false }));
    m.renderOrder = 1;
    m.userData.u = pu;
    group.add(m);
    return m;
  };
  const left = plate(pipes, 0.92, 0.92 * (2336 / 1744));
  left.position.set(-1.5, 0.02, 0.6);
  const right = plate(bottling, 1.5, 1.5 * (1357 / 2400));
  right.position.set(1.5, -0.3, 0.4);
  return {
    group, plane, left, right,
    set(opacity) {
      u.uOpacity.value = opacity;
      left.userData.u.uOpacity.value = opacity;
      right.userData.u.uOpacity.value = opacity;
      group.visible = opacity > 0.002;
    },
  };
}

/* ───────── CERTIFIED: 12 hex tiles flying into a honeycomb ───────── */
export function createTiles({ count = 12, rand = Math.random }) {
  const group = new THREE.Group();
  const R = 0.18;
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const edgePts = [];
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + (i * Math.PI) / 3; edgePts.push(new THREE.Vector3(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, 0.002)); }
  const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
  // emissive keeps the brand colours readable whatever the light; env + key light add the sheen
  const matO = new THREE.MeshStandardMaterial({ color: 0xeb6100, emissive: 0xeb6100, emissiveIntensity: 0.42, roughness: 0.36, metalness: 0.1, envMapIntensity: 0.5, toneMapped: false, side: THREE.DoubleSide, transparent: true });
  const matI = new THREE.MeshStandardMaterial({ color: 0xfff6e9, emissive: 0xfff6e9, emissiveIntensity: 0.5, roughness: 0.48, metalness: 0.0, envMapIntensity: 0.4, toneMapped: false, side: THREE.DoubleSide, transparent: true });
  const lineO = new THREE.LineBasicMaterial({ color: 0xffb27a, transparent: true, opacity: 0.55, toneMapped: false });
  const lineI = new THREE.LineBasicMaterial({ color: 0xeb6100, transparent: true, opacity: 0.35, toneMapped: false });

  const gap = 1.075, dx = Math.sqrt(3) * R * gap, dy = 1.5 * R * gap;
  const tiles = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / 4), c = i % 4;
    const orange = (r + c) % 2 === 0;
    const mesh = new THREE.Mesh(geo, orange ? matO : matI);
    mesh.add(new THREE.LineLoop(edgeGeo, orange ? lineO : lineI));
    mesh.renderOrder = 1;
    const slot = new THREE.Vector3((c - 1.5) * dx + (r % 2 ? dx / 2 : 0) - dx / 4, (1 - r) * dy, 0);
    const side = rand() < 0.5 ? -1 : 1;
    const from = new THREE.Vector3(side * (2.6 + rand() * 1.4), (rand() - 0.5) * 4, 1.2 + rand() * 1.8);
    const spin = new THREE.Euler((rand() - 0.5) * 6, (rand() - 0.5) * 6, (rand() - 0.5) * 4);
    group.add(mesh);
    tiles.push({ mesh, slot, from, spin, orange, lift: 0, k: 0 });
  }
  return { group, tiles, meshes: tiles.map((t) => t.mesh), matO, matI };
}

/* ───────── 30 YEARS: ring with 31 year ticks and 8 nodes ───────── */
export const RING_R = 1.4;
export const yearAngle = (y) => ((y - 1996) / 31) * Math.PI * 2;

export function createRing({ nodes, dot }) {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);
  const circle = [];
  for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; circle.push(new THREE.Vector3(Math.sin(a) * RING_R, 0, Math.cos(a) * RING_R)); }
  const lineMat = new THREE.LineBasicMaterial({ color: 0xf28a16, transparent: true, opacity: 0.7, toneMapped: false });
  spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circle), lineMat));
  const torusMat = new THREE.MeshBasicMaterial({ color: 0xfff6e9, wireframe: true, transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.026, 4, 124), torusMat);
  torus.rotation.x = Math.PI / 2;
  spin.add(torus);
  const ticks = [];
  for (let y = 1996; y <= 2026; y++) {
    const a = yearAngle(y), big = nodes.some((n) => n.y === y), l0 = big ? 0.9 : 0.96, l1 = big ? 1.1 : 1.04;
    ticks.push(Math.sin(a) * RING_R * l0, 0, Math.cos(a) * RING_R * l0, Math.sin(a) * RING_R * l1, 0, Math.cos(a) * RING_R * l1);
  }
  const tickGeo = new THREE.BufferGeometry();
  tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  const tickMat = new THREE.LineBasicMaterial({ color: 0xfff6e9, transparent: true, opacity: 0.5, toneMapped: false });
  spin.add(new THREE.LineSegments(tickGeo, tickMat));

  const nodeGeo = new THREE.SphereGeometry(0.028, 24, 16);
  const haloMat = new THREE.SpriteMaterial({ map: dot, color: 0xf28a16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const items = nodes.map((n) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1dc, transparent: true, toneMapped: false });
    const m = new THREE.Mesh(nodeGeo, mat);
    const a = yearAngle(n.y);
    m.position.set(Math.sin(a) * RING_R, 0, Math.cos(a) * RING_R);
    const halo = new THREE.Sprite(haloMat.clone());
    halo.scale.setScalar(0.2);
    m.add(halo);
    spin.add(m);
    return { mesh: m, mat, halo, node: n, on: 0 };
  });
  return { group, spin, items, mats: [lineMat, torusMat, tickMat] };
}

/* ───────── PRODUCTS: four cards, cut-outs on a rounded ivory board ───────── */
const CARD_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BACK_FRAG = /* glsl */`
uniform float uHover, uOpacity; uniform vec3 uTint;
varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = vUv - 0.5;
  float d = sdRound(p, vec2(0.5), 0.075);
  float aa = fwidth(d) * 1.2;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  vec3 c = mix(vec3(1.0, 0.988, 0.962), vec3(0.975, 0.918, 0.85), clamp(length(p) * 1.25, 0.0, 1.0));
  c = mix(c, uTint, 0.16 * (1.0 - smoothstep(0.0, 0.48, length(p - vec2(0.0, 0.03)))));
  float edge = smoothstep(-0.03, -0.004, d);
  c = mix(c, vec3(0.922, 0.38, 0.0), edge * uHover);
  c = mix(c, vec3(0.85, 0.77, 0.69), edge * (1.0 - uHover) * 0.45);
  gl_FragColor = vec4(c, inside * uOpacity);
}`;
const FRONT_FRAG = /* glsl */`
uniform sampler2D uMap; uniform float uOpacity, uHover, uZoom; uniform vec2 uLight;
varying vec2 vUv;
void main() {
  vec2 uv = (vUv - 0.5) / uZoom + vec2(0.5, 0.5);
  vec4 t = texture2D(uMap, uv);
  if (t.a < 0.2) discard;
  float edge = clamp((t.a - texture2D(uMap, uv + uLight * 0.014).a) * 2.2, 0.0, 1.0);
  vec3 c = t.rgb + vec3(0.95, 0.5, 0.12) * edge * (0.2 + 0.8 * uHover);
  gl_FragColor = vec4(c, t.a * uOpacity);
}`;

export function createCards({ textures, tints }) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.7, 0.7);
  const cards = textures.map((tex, i) => {
    const g = new THREE.Group();
    const bu = { uHover: { value: 0 }, uOpacity: { value: 0 }, uTint: { value: new THREE.Color(...tints[i]) } };
    const back = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: bu, vertexShader: CARD_VERT, fragmentShader: BACK_FRAG, transparent: true, side: THREE.DoubleSide }));
    back.position.z = -0.01;
    back.renderOrder = 1;
    const fu = { uMap: { value: tex }, uOpacity: { value: 0 }, uHover: { value: 0 }, uZoom: { value: 1.14 }, uLight: { value: new THREE.Vector2(0.7, 0.7) } };
    const front = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: fu, vertexShader: CARD_VERT, fragmentShader: FRONT_FRAG, transparent: true }));
    front.renderOrder = 2;
    g.add(back, front);
    group.add(g);
    back.userData.card = i; front.userData.card = i;
    return { g, back, front, bu, fu, hover: 0, rx: 0, ry: 0 };
  });
  return { group, cards, hit: cards.flatMap((c) => [c.back, c.front]) };
}

/* ───────── HERO: two persimmon sprites floating behind the bottle ───────── */
export function createSprites(tex) {
  const mk = () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    s.renderOrder = 0;
    return s;
  };
  return [mk(), mk()];
}
