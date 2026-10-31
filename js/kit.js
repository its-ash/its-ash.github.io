import * as THREE from 'three';

const mulberry = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const rand = mulberry(7);
export const spread = (n) => (rand() - 0.5) * n;

export const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: false, roughness: 0.9, ...opts });

const SMOOTH = {
  IcosahedronGeometry: { detail: 2 },
  DodecahedronGeometry: { detail: 1 },
  SphereGeometry: { widthSegments: 32, heightSegments: 16 },
  CylinderGeometry: { radialSegments: 32 },
  ConeGeometry: { radialSegments: 32 },
  CapsuleGeometry: { capSegments: 6, radialSegments: 24 },
  TorusGeometry: { radialSegments: 10, tubularSegments: 32 },
  CircleGeometry: { segments: 32 }
};
const smoothed = new WeakMap();

export const smooth = (geo) => {
  const up = SMOOTH[geo.type];
  if (!up || geo.userData.keep || geo.parameters.radialSegments <= 4) return geo;
  if (!smoothed.has(geo)) {
    const p = { ...geo.parameters };
    for (const [k, n] of Object.entries(up)) p[k] = Math.max(p[k], n);
    smoothed.set(geo, new geo.constructor(...Object.values(p)));
  }
  return smoothed.get(geo);
};

export const mesh = (geo, material, [x = 0, y = 0, z = 0] = []) => {
  const m = new THREE.Mesh(smooth(geo), material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
};

export const group = (x = 0, y = 0, z = 0, ...kids) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (kids.length) g.add(...kids);
  return g;
};

export const jitter = (geo, amt, keep) => {
  const p = geo.attributes.position;
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    if (keep(y)) continue;
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!cache.has(key)) cache.set(key, [spread(amt), spread(amt * 0.6), spread(amt)]);
    const [dx, dy, dz] = cache.get(key);
    p.setXYZ(i, x + dx, y + dy, z + dz);
  }
  geo.computeVertexNormals();
  geo.userData.keep = true;
  return geo;
};

export const canvasTexture = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.redraw = (...args) => {
    draw(c.getContext('2d'), w, h, ...args);
    tex.needsUpdate = true;
  };
  tex.userData.redraw();
  return tex;
};

export const angleTo = (from, to) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
