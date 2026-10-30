import * as THREE from 'three';
import { mat, mesh, group } from './kit.js';

const STONE = '#eadfca';
const CREAM = '#f6ead3';
const SAFFRON = '#ff7a00';
const GOLD = '#e8b84a';
const SINDOOR = '#e2572b';
const MARIGOLD = ['#ff9f1c', '#ffd23f'];

const capsule = (r, len, m, pos, rot = [0, 0, 0]) => {
  const c = mesh(new THREE.CapsuleGeometry(r, len, 3, 8), m, pos);
  c.rotation.set(...rot);
  return c;
};

const murti = () => {
  const body = mat(SINDOOR, { roughness: 0.55 });
  const face = mat('#f08a5d', { roughness: 0.55 });
  const gold = mat(GOLD, { metalness: 0.6, roughness: 0.35 });
  const g = group(0, 0, 0);

  g.add(mesh(new THREE.BoxGeometry(0.38, 0.12, 0.3), mat('#c9a24a', { metalness: 0.4 }), [0, 0.06, 0]));
  [1, -1].forEach((s) => g.add(capsule(0.045, 0.16, body, [s * 0.05, 0.25, 0])));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.12, 0.16, 8), mat('#f5c518'), [0, 0.3, 0]));
  const torso = capsule(0.08, 0.12, body, [0, 0.47, 0]);
  torso.scale.set(1.25, 1, 0.9);
  g.add(torso);
  const garland = mesh(new THREE.TorusGeometry(0.08, 0.018, 5, 14), mat(MARIGOLD[0]), [0, 0.55, 0.02]);
  garland.rotation.x = Math.PI / 2 - 0.35;
  g.add(garland);

  const head = group(0, 0.66, 0);
  head.add(mesh(new THREE.IcosahedronGeometry(0.075, 2), body));
  head.add(mesh(new THREE.IcosahedronGeometry(0.045, 1), face, [0, -0.02, 0.055]));
  [1, -1].forEach((s) => {
    head.add(mesh(new THREE.IcosahedronGeometry(0.011, 0), mat('#1b1210'), [s * 0.028, 0.018, 0.068]));
    head.add(mesh(new THREE.IcosahedronGeometry(0.022, 0), body, [s * 0.075, 0.005, 0]));
  });
  head.add(mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.04, 10), gold, [0, 0.065, 0]));
  head.add(mesh(new THREE.ConeGeometry(0.055, 0.11, 8), gold, [0, 0.14, 0]));
  head.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.005), mat('#c0392b'), [0, 0.03, 0.074]));
  g.add(head);

  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.55, depthWrite: false }));
  halo.position.set(0, 0.69, -0.07);
  g.add(halo);

  const blessing = group(-0.11, 0.54, 0);
  blessing.add(capsule(0.03, 0.1, body, [0, -0.06, 0]));
  const fore = group(0, -0.12, 0);
  fore.add(capsule(0.028, 0.09, body, [0, 0.06, 0]));
  fore.add(mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), body, [0, 0.15, 0.01]));
  fore.rotation.x = -0.25;
  blessing.add(fore);
  blessing.rotation.z = -0.35;
  g.add(blessing);

  const gadaArm = group(0.11, 0.54, 0);
  gadaArm.add(capsule(0.03, 0.12, body, [0, -0.06, 0.02], [0.3, 0, 0]));
  gadaArm.rotation.z = 0.3;
  g.add(gadaArm);
  const gada = group(0.14, 0.4, 0.06);
  gada.add(mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.32, 6), gold, [0, 0.16, 0]));
  gada.add(mesh(new THREE.IcosahedronGeometry(0.065, 1), gold, [0, 0.34, 0]));
  gada.add(mesh(new THREE.ConeGeometry(0.02, 0.05, 6), gold, [0, 0.42, 0]));
  gada.rotation.z = -0.35;
  g.add(gada);

  const tailPts = [[0, 0.32, -0.08], [0.06, 0.36, -0.18], [0.1, 0.55, -0.2], [0.07, 0.78, -0.16], [-0.02, 0.86, -0.12], [-0.07, 0.8, -0.1]].map((p) => new THREE.Vector3(...p));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 30, 0.016, 6), body));

  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
};

export function createTemple() {
  const root = group();
  const stone = mat(STONE);
  const cream = mat(CREAM);
  const saffron = mat(SAFFRON);
  const gold = mat(GOLD, { metalness: 0.6, roughness: 0.35 });

  root.add(mesh(new THREE.BoxGeometry(1.5, 0.16, 1.4), stone, [0, 0.08, 0]));
  root.add(mesh(new THREE.BoxGeometry(1.3, 0.14, 1.2), stone, [0, 0.23, 0]));
  root.add(mesh(new THREE.BoxGeometry(0.6, 0.08, 0.2), stone, [0, 0.04, 0.8]));
  root.add(mesh(new THREE.BoxGeometry(0.6, 0.08, 0.14), stone, [0, 0.12, 0.72]));

  root.add(mesh(new THREE.BoxGeometry(1.0, 0.85, 0.1), cream, [0, 0.725, -0.45]));
  [1, -1].forEach((s) => root.add(mesh(new THREE.BoxGeometry(0.1, 0.85, 0.9), cream, [s * 0.45, 0.725, 0])));
  [1, -1].forEach((s) => {
    root.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.85, 8), cream, [s * 0.33, 0.725, 0.42]));
    root.add(mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), saffron, [s * 0.33, 0.33, 0.42]));
  });
  root.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 0.12), saffron, [0, 1.18, 0.42]));
  root.add(mesh(new THREE.BoxGeometry(1.12, 0.1, 1.02), cream, [0, 1.24, 0]));
  root.add(mesh(new THREE.BoxGeometry(1.16, 0.04, 1.06), saffron, [0, 1.3, 0]));

  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const b = mesh(new THREE.IcosahedronGeometry(0.035, 0), mat(MARIGOLD[i % 2]), [-0.38 + u * 0.76, 1.1 - Math.sin(u * Math.PI) * 0.08, 0.49]);
    root.add(b);
  }

  const profile = [[0.52, 0], [0.5, 0.22], [0.45, 0.46], [0.37, 0.68], [0.27, 0.86], [0.16, 1.0], [0.08, 1.06], [0, 1.08]].map(([r, y]) => new THREE.Vector2(r, y));
  root.add(mesh(new THREE.LatheGeometry(profile, 8), mat('#f2b552'), [0, 1.32, 0]));
  root.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), gold, [0, 2.42, 0]));
  root.add(mesh(new THREE.IcosahedronGeometry(0.07, 1), gold, [0, 2.51, 0]));
  root.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 6), gold, [0, 2.6, 0]));

  root.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), mat('#6b4a2f'), [0.06, 2.7, 0]));
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.42, -0.1);
  flagShape.lineTo(0, -0.24);
  flagShape.closePath();
  const flag = group(0.06, 3.0, 0);
  flag.add(new THREE.Mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({ color: SAFFRON, side: THREE.DoubleSide, roughness: 0.8 })));
  root.add(flag);

  const idol = murti();
  idol.position.set(0, 0.3, -0.18);
  root.add(idol);

  const flameMat = new THREE.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ff9a1f', emissiveIntensity: 1.8 });
  const flames = [1, -1].map((s) => {
    root.add(mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.035, 8), mat('#b5552b'), [s * 0.3, 0.32, 0.55]));
    const f = mesh(new THREE.ConeGeometry(0.018, 0.06, 6), flameMat, [s * 0.3, 0.37, 0.55]);
    f.castShadow = false;
    root.add(f);
    return f;
  });
  const glow = new THREE.PointLight(0xffa040, 0.6, 3, 1.8);
  glow.position.set(0, 0.6, 0.35);
  root.add(glow);

  const bell = group(0.2, 1.13, 0.46);
  bell.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), mat('#3a2a1a'), [0, -0.04, 0]));
  bell.add(mesh(new THREE.ConeGeometry(0.05, 0.08, 10, 1, true), mat(GOLD, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), [0, -0.11, 0]));
  root.add(bell);

  let swing = 0;
  return {
    group: root,
    ring: () => (swing = 1),
    update(dt, { t, night, motion, windK }) {
      flag.rotation.y = Math.sin(t * (3 + windK * 4)) * 0.35 * motion;
      flag.scale.x = 0.85 + Math.sin(t * 5) * 0.15 * motion;
      const flick = 0.85 + Math.sin(t * 23) * 0.08 + Math.sin(t * 37) * 0.07;
      flames.forEach((f, i) => f.scale.set(1, flick + (i ? 0.05 : 0), 1));
      glow.intensity = (0.5 + night * 1.6) * flick;
      flameMat.emissiveIntensity = 1.4 + night * 1.2;
      swing = Math.max(0, swing - dt * 0.35);
      bell.rotation.z = Math.sin(t * 9) * 0.5 * swing;
    }
  };
}
