import * as THREE from 'three';
import { mat, mesh, group, rand, smooth } from './kit.js';

const FLOWER_COLORS = ['#f25f5c', '#ffe066', '#f7f7ff', '#c77dff', '#ff9f1c'];
const { lerp, clamp } = THREE.MathUtils;

export function createProps({ scene, island, chimney, pond, avoid = [], area = 5.3, lowPower = false }) {
  // Chimney smoke
  const puffGeo = smooth(new THREE.IcosahedronGeometry(0.14, 0));
  const puffs = Array.from({ length: lowPower ? 6 : 10 }, (_, i) => {
    const m = new THREE.Mesh(puffGeo, new THREE.MeshStandardMaterial({ color: '#e9e9e9', transparent: true, opacity: 0, roughness: 1, depthWrite: false }));
    m.userData = { life: i / 10, seed: rand() * 6 };
    island.add(m);
    return m;
  });

  // Birds
  const birdMat = mat('#2d3340');
  const birds = Array.from({ length: 6 }, (_, i) => {
    const b = group();
    b.add(mesh(new THREE.ConeGeometry(0.07, 0.32, 5), birdMat));
    b.children[0].rotation.x = Math.PI / 2;
    const wings = [1, -1].map((s) => {
      const w = group();
      w.add(mesh(new THREE.BoxGeometry(0.42, 0.015, 0.14), birdMat, [s * 0.21, 0, 0]));
      b.add(w);
      return { w, s };
    });
    b.userData = { wings, lane: Math.ceil(i / 2) * (i % 2 ? 1 : -1), phase: rand() * 6 };
    scene.add(b);
    return b;
  });

  // Fish
  const fishMat = mat('#ff8c42');
  const fish = group();
  const fishBody = mesh(new THREE.IcosahedronGeometry(0.1, 1), fishMat);
  fishBody.scale.set(0.6, 0.7, 1.4);
  const tail = mesh(new THREE.ConeGeometry(0.08, 0.14, 4), fishMat, [0, 0, -0.17]);
  tail.rotation.x = -Math.PI / 2;
  fish.add(fishBody, tail);
  fish.visible = false;
  island.add(fish);
  const jump = { t: -1, next: 4, from: new THREE.Vector3(), dir: new THREE.Vector3() };

  // Ripples
  const ripples = Array.from({ length: 10 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 20), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.userData.life = 1;
    island.add(r);
    return r;
  });
  let rippleI = 0;
  const ripple = (x, z) => {
    const r = ripples[rippleI++ % ripples.length];
    r.position.set(x, pond.y + 0.005, z);
    r.userData.life = 0;
  };
  const pondPoint = (k = 0.85) => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * pond.r * k;
    return [pond.x + Math.cos(a) * d, pond.z + Math.sin(a) * d];
  };

  // Crocodile
  const cg = mat('#4f7d3a');
  const cBelly = mat('#a8b86a');
  const croc = group(pond.x, pond.y, pond.z);
  const torso = mesh(new THREE.CapsuleGeometry(0.13, 0.4, 3, 8), cg, [0, 0.01, 0]);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.25, 1, 0.7);
  croc.add(torso);
  for (let i = 0; i < 5; i++) croc.add(mesh(new THREE.ConeGeometry(0.035, 0.07, 4), cg, [0, 0.1, 0.2 - i * 0.1]));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const leg = mesh(new THREE.BoxGeometry(0.06, 0.05, 0.12), cg, [sx * 0.17, -0.03, sz * 0.15]);
    leg.rotation.y = sx * sz * 0.5;
    croc.add(leg);
  });
  const crocHead = group(0, 0.02, 0.3);
  crocHead.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.34), cg, [0, 0.02, 0.15]));
  [1, -1].forEach((s) => {
    crocHead.add(mesh(new THREE.IcosahedronGeometry(0.045, 0), cg, [s * 0.06, 0.08, 0.04]));
    crocHead.add(mesh(new THREE.IcosahedronGeometry(0.02, 0), mat('#f2d24b'), [s * 0.06, 0.1, 0.07]));
    for (let i = 0; i < 3; i++) {
      const tooth = mesh(new THREE.ConeGeometry(0.012, 0.03, 3), mat('#f4f1e6'), [s * 0.09, -0.03, 0.12 + i * 0.08]);
      tooth.rotation.x = Math.PI;
      crocHead.add(tooth);
    }
  });
  const jaw = group(0, -0.02, 0);
  jaw.add(mesh(new THREE.BoxGeometry(0.18, 0.04, 0.3), cBelly, [0, -0.01, 0.14]));
  crocHead.add(jaw);
  croc.add(crocHead);
  const crocTail = [];
  let parent = croc;
  [[0.11, 0.22, -0.28], [0.08, 0.2, -0.2], [0.05, 0.2, -0.18]].forEach(([r, len, z]) => {
    const seg = group(0, 0, z);
    const m = mesh(new THREE.ConeGeometry(r, len, 6), cg, [0, 0, -len / 2]);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1.2, 1, 0.6);
    seg.add(m);
    parent.add(seg);
    crocTail.push(seg);
    parent = seg;
  });
  island.add(croc);
  const crocSt = { a: 0, snap: 0, next: 6 };

  // Flowers
  const stemMat = mat('#3f8f3f');
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4);
  const headGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const flowers = [];
  for (let tries = 0; flowers.length < (lowPower ? 16 : 28) && tries < 400; tries++) {
    const a = rand() * Math.PI * 2;
    const d = 1 + Math.sqrt(rand()) * area;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const f = group(x, 0.6, z);
    f.add(mesh(stemGeo, stemMat, [0, 0.11, 0]));
    const head = mesh(headGeo, mat(FLOWER_COLORS[flowers.length % FLOWER_COLORS.length]), [0, 0.24, 0]);
    head.scale.set(1, 0.6, 1);
    f.add(head);
    f.userData = { head, seed: rand() * 6 };
    island.add(f);
    flowers.push(f);
  }

  // Butterflies
  const butterflies = Array.from({ length: 3 }, (_, i) => {
    const b = group();
    const wm = mat(['#ffd166', '#ef476f', '#a0e7e5'][i], { side: THREE.DoubleSide });
    const wings = [1, -1].map((s) => {
      const w = group();
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.07, 6), wm);
      p.position.x = s * 0.07;
      p.rotation.x = -Math.PI / 2;
      w.add(p);
      b.add(w);
      return { w, s };
    });
    const home = flowers[(i * 7) % Math.max(1, flowers.length)]?.position;
    b.userData = { wings, cx: home?.x ?? 0, cz: home?.z ?? 0, seed: rand() * 10 };
    island.add(b);
    return b;
  });

  return {
    croc,
    snap: () => (crocSt.snap = 1),
    update(dt, { t, motion, day, night, rain, snow, storm, windX, windZ, windK, temp, snowCover }) {
      const smoke = clamp(0.35 + (temp < 15 ? 0.4 : 0) + night * 0.25, 0, 1);
      const shade = 0.92 - night * 0.55;
      puffs.forEach((p) => {
        const d = p.userData;
        d.life += dt * 0.2 * motion;
        if (d.life > 1) d.life -= 1;
        const l = d.life;
        p.position.set(chimney.x + windX * l * 1.4 + Math.sin(l * 6 + d.seed) * 0.08, chimney.y + l * 2.2, chimney.z + windZ * l * 1.4);
        p.scale.setScalar(0.5 + l * 2);
        p.rotation.set(l * 2 + d.seed, l * 3, 0);
        p.material.opacity = Math.sin(l * Math.PI) * 0.5 * smoke;
        p.material.color.setScalar(shade);
      });

      const fly = day > 0.6 && rain < 0.2 && snow < 0.2 && storm < 0.2;
      birds.forEach((b, i) => {
        const d = b.userData;
        const target = fly ? 1 : 0;
        b.scale.setScalar(Math.max(0.001, lerp(b.scale.x, target, 1 - Math.exp(-dt * 1.5))));
        b.visible = b.scale.x > 0.01;
        const a = t * 0.12 * motion - Math.abs(d.lane) * 0.035;
        const r = 15 + d.lane * 0.5;
        b.position.set(Math.cos(a) * r, 9 + Math.sin(t * 0.4) * 0.6 - Math.abs(d.lane) * 0.15, Math.sin(a) * r);
        b.rotation.y = -a;
        d.wings.forEach(({ w, s }) => (w.rotation.z = s * Math.sin(t * 9 + d.phase + i) * 0.7 * motion));
      });

      const frozen = temp < 0;
      if (jump.t < 0 && !frozen && (jump.next -= dt) <= 0) {
        const [x, z] = pondPoint(0.5);
        const a = rand() * Math.PI * 2;
        jump.from.set(x, pond.y, z);
        jump.dir.set(Math.cos(a), 0, Math.sin(a));
        jump.t = 0;
        fish.visible = true;
        ripple(x, z);
      }
      if (jump.t >= 0) {
        jump.t += dt / 0.9;
        const u = Math.min(1, jump.t);
        fish.position.copy(jump.from).addScaledVector(jump.dir, u * 0.7);
        fish.position.y = pond.y + Math.sin(u * Math.PI) * 0.55 - 0.05;
        fish.rotation.set(-Math.cos(u * Math.PI) * 1.1, Math.atan2(jump.dir.x, jump.dir.z), 0);
        tail.rotation.y = Math.sin(t * 30) * 0.4;
        if (u >= 1) {
          ripple(fish.position.x, fish.position.z);
          fish.visible = false;
          jump.t = -1;
          jump.next = 5 + rand() * 6;
        }
      }

      if (!frozen) crocSt.a += dt * 0.22 * motion;
      if ((crocSt.next -= dt) <= 0) {
        crocSt.snap = 1;
        crocSt.next = 7 + rand() * 8;
      }
      crocSt.snap = Math.max(0, crocSt.snap - dt * 1.4);
      croc.position.set(pond.x + Math.cos(crocSt.a) * 0.55, pond.y - (frozen ? 0 : 0.035) + Math.sin(t * 1.5) * 0.01, pond.z + Math.sin(crocSt.a) * 0.55);
      croc.rotation.y = Math.atan2(-Math.sin(crocSt.a), Math.cos(crocSt.a));
      jaw.rotation.x = Math.sin(crocSt.snap * Math.PI) * 0.55;
      crocHead.rotation.y = Math.sin(t * 0.8) * 0.15 * motion;
      crocTail.forEach((s, i) => (s.rotation.y = Math.sin(t * 2.2 - i * 0.8) * (frozen ? 0.05 : 0.35) * motion));
      if (!frozen && rand() < dt * 1.2) ripple(croc.position.x - Math.cos(crocSt.a) * 0.1, croc.position.z - Math.sin(crocSt.a) * 0.1);

      if (!frozen && rain > 0.05 && rand() < rain * dt * 10) ripple(...pondPoint());
      ripples.forEach((r) => {
        const d = r.userData;
        if (d.life >= 1) return (r.visible = false);
        d.life = Math.min(1, d.life + dt * 0.9);
        r.visible = true;
        r.scale.setScalar(1 + d.life * 6);
        r.material.opacity = (1 - d.life) * 0.7;
      });

      const bloom = 1 - night * 0.4;
      flowers.forEach((f) => {
        const d = f.userData;
        f.rotation.z = Math.sin(t * (1.5 + windK) + d.seed) * 0.12 * (0.3 + windK) * motion;
        f.visible = snowCover < 0.5;
        d.head.scale.set(bloom, 0.6 * bloom, bloom);
      });

      const flutter = day > 0.5 && rain < 0.1 && snow < 0.1;
      butterflies.forEach((b) => {
        const d = b.userData;
        b.visible = flutter;
        if (!flutter) return;
        const s = t * 0.6 * motion + d.seed;
        b.position.set(d.cx + Math.sin(s) * 1.2, 1.1 + Math.sin(s * 2.3) * 0.3, d.cz + Math.cos(s * 0.8) * 1.2);
        b.rotation.y = Math.atan2(Math.cos(s), -Math.sin(s * 0.8));
        d.wings.forEach(({ w, s: side }) => (w.rotation.z = side * (0.3 + Math.sin(t * 22 + d.seed) * 0.9)));
      });
    }
  };
}
