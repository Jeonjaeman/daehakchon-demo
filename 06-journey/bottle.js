/* The real bottle, built from assets/img/bottle_profile.json (y 0 = bottom, 1 = top, r relative to height).
   Rendered alone on #glFront so the hero type can sit between it and the particles.

   Transparent-canvas glass: the transmission pass of three r160 clears to white·0.5 when the clear alpha
   is below 1, which would make the glass milky. A full-screen quad drawn first writes (0,0,0,0) into that
   pass, so wherever the refracted ray finds nothing the glass outputs only its reflections with alpha 0 —
   i.e. it adds highlights over the page behind and stays see-through. The liquid, label and cap are opaque,
   so the glass refracts them for real. */
import * as THREE from 'three';

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 4;
  const g = c.getContext('2d');
  for (let x = 0; x < 256; x++) {
    const v = 128 + 110 * Math.sin((x / 256) * Math.PI * 2);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(46, 1);
  return t;
}

const radiusAt = (profile, y) => {
  for (let i = 1; i < profile.length; i++) {
    if (profile[i][0] >= y) {
      const [y0, r0] = profile[i - 1], [y1, r1] = profile[i];
      return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-6, y1 - y0));
    }
  }
  return profile[profile.length - 1][1];
};

/* label decal: the label crop in label_fiber.webp is a *photo* of the front of the bottle,
   so u is un-projected with sin(φ) — seen from the front it lines up with the photograph */
function labelGeometry(profile, band, arc, cols = 72, rows = 24) {
  const thMax = THREE.MathUtils.degToRad(82);
  const pos = [], uv = [], nor = [], idx = [];
  for (let j = 0; j <= rows; j++) {
    const v = j / rows, y = band[0] + (band[1] - band[0]) * v;
    const r = radiusAt(profile, y) * 1.006 + 0.0012;
    for (let i = 0; i <= cols; i++) {
      const ph = -thMax + (2 * thMax * i) / cols;
      pos.push(Math.sin(ph) * r, y - 0.5, Math.cos(ph) * r);
      nor.push(Math.sin(ph), 0, Math.cos(ph));
      uv.push(0.5 + (arc / 2) * (Math.sin(ph) / Math.sin(thMax)), v);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export function createBottle({ profile, neckY, band, arc, labelTex, mobile }) {
  const seg = mobile ? 72 : 120;
  const group = new THREE.Group();          // placement + mouse tilt
  const body = new THREE.Group();           // pour tilt (pivot = bottle centre)
  group.add(body);

  // glass shell up to just under the cap
  const gp = [new THREE.Vector2(0, -0.5)];
  for (const [y, r] of profile) { if (y > neckY + 0.012) break; gp.push(new THREE.Vector2(Math.max(0.001, r), y - 0.5)); }
  gp.push(new THREE.Vector2(0, neckY + 0.012 - 0.5));
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff3e6, transmission: 1, thickness: 0.35, roughness: 0.05, ior: 1.5,
    metalness: 0, envMapIntensity: 1.2, specularIntensity: 1, clearcoat: 0.4, clearcoatRoughness: 0.05,
  });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(gp, seg), glassMat);
  glass.renderOrder = 3;

  // liquid: same profile ×0.9 between y .05 and .78; its top follows a world-space level (pour)
  const lp = [new THREE.Vector2(0, 0.05 - 0.5)];
  lp.push(new THREE.Vector2(radiusAt(profile, 0.05) * 0.9, 0.05 - 0.5));
  for (const [y, r] of profile) if (y > 0.05 && y < 0.78) lp.push(new THREE.Vector2(r * 0.9, y - 0.5));
  lp.push(new THREE.Vector2(radiusAt(profile, 0.78) * 0.9, 0.78 - 0.5), new THREE.Vector2(0, 0.78 - 0.5));
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xf28a16, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
    emissive: 0xa63c00, emissiveIntensity: 0.6, envMapIntensity: 0.9,
  });
  // vertices above the world-space level slide down the bottle axis (toward the base) until they
  // reach it: the surface stays horizontal and, unlike a straight vertical drop, never leaves the glass
  const uLevel = { value: 100 }, uYMin = { value: 0.05 - 0.5 }, uUpLocal = { value: new THREE.Vector3(0, 1, 0) };
  liquidMat.onBeforeCompile = (sh) => {
    sh.uniforms.uLevel = uLevel; sh.uniforms.uYMin = uYMin; sh.uniforms.uUpLocal = uUpLocal;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLevel;\nuniform float uYMin;\nuniform vec3 uUpLocal;\nvarying float vTop;')
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec4 lqW = modelMatrix * vec4( position, 1.0 );
        float lqAy = max( modelMatrix[ 1 ].y, 0.02 );
        vTop = 0.0;
        if ( lqW.y > uLevel ) { objectNormal = uUpLocal; vTop = 1.0; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if ( lqW.y > uLevel ) transformed.y = max( position.y - ( lqW.y - uLevel ) / lqAy, uYMin );`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTop;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lqF = pow( 1.0 - abs( dot( normalize( normal ), normalize( vViewPosition ) ) ), 2.0 );
        // deep amber in the thick middle, golden where the liquid is thin (rims, surface)
        diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.78, 0.62, 0.5 ), vec3( 1.0, 0.62, 0.16 ), lqF * 0.6 + vTop * 0.25 );
        totalEmissiveRadiance *= 0.45 + 1.0 * lqF + 0.4 * vTop;`);
  };
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(lp, seg), liquidMat);
  liquid.renderOrder = 1;

  // gold cap above neck_y
  const cp = [];
  cp.push(new THREE.Vector2(radiusAt(profile, neckY - 0.004) * 1.02, neckY - 0.004 - 0.5));
  for (const [y, r] of profile) if (y >= neckY) cp.push(new THREE.Vector2(Math.max(0.001, r * 1.02), y - 0.5));
  cp.push(new THREE.Vector2(0, 0.5));
  const bump = stripeTexture();
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.35, bumpMap: bump, bumpScale: 0.9, envMapIntensity: 1.25 });
  const cap = new THREE.Mesh(new THREE.LatheGeometry(cp, seg), capMat);
  cap.renderOrder = 1;

  // printed label
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 4;
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.42, metalness: 0, envMapIntensity: 0.85 });
  const label = new THREE.Mesh(labelGeometry(profile, band, arc), labelMat);
  label.renderOrder = 1;

  body.add(liquid, cap, label, glass);

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    group, body, glass, liquid,
    /** world-space liquid surface height (call after updateMatrixWorld) */
    setLevel(levelW) {
      uLevel.value = levelW + 1e-4;
      liquid.getWorldQuaternion(q).invert();
      uUpLocal.value.set(0, 1, 0).applyQuaternion(q);
    },
    mouth(target) { return body.localToWorld(target.set(0, 0.47, 0)); },
    axis(target) { body.getWorldQuaternion(q); return target.set(0, 1, 0).applyQuaternion(q); },
    centre(target) { return body.getWorldPosition(target); },
    tmp,
  };
}

/* full-screen quad that clears the transmission buffer to transparent (see the note at the top) */
export function createClearQuad() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    }),
  );
  m.frustumCulled = false;
  m.renderOrder = -1000;
  return m;
}
