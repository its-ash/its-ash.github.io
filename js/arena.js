import * as THREE from 'three';
import { mat, mesh, group, canvasTexture } from './kit.js';

const GOLD = '#ffd23f';
const BALLS = 7;
const { lerp, clamp, smoothstep } = THREE.MathUtils;
const noPick = () => {};

const star = (ctx, x, y, r) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.fill();
};

export const ballTexture = (n) =>
  canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ff9a1f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d81e1e';
    [0.25, 0.75].forEach((u) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d = n === 1 ? 0 : 5;
        star(ctx, u * w + Math.cos(a) * d, h / 2 + Math.sin(a) * d * 1.6, 4);
      }
    });
  });

const emblemTexture = () =>
  canvasTexture(256, 256, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c * 0.8, c * 0.8, 4, c, c, c);
    g.addColorStop(0, '#ffe7a3');
    g.addColorStop(0.5, '#ff9a1f');
    g.addColorStop(1, '#d9640b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d81e1e';
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, y]) => star(ctx, c + x * 34, c + y * 34, 26));
  });

export const pillarSpots = (padR) =>
  Array.from({ length: 4 }, (_, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return [Math.cos(a) * (padR + 0.55), Math.sin(a) * (padR + 0.55)];
  });

const octagon = (rTop, rBottom, h) => {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 8);
  geo.userData.keep = true;
  return geo;
};

export function createArena({ padR = 1.25 }) {
  const g = group();
  g.add(mesh(octagon(padR + 0.3, padR + 0.38, 0.06), mat('#a89f92'), [0, 0.03, 0]));
  g.add(mesh(octagon(padR, padR + 0.05, 0.05), mat('#e8e1d3'), [0, 0.085, 0]));

  const glowMat = new THREE.MeshStandardMaterial({ color: GOLD, emissive: '#ffb000', emissiveIntensity: 0.3, metalness: 0.4, roughness: 0.4 });
  const ring = mesh(new THREE.TorusGeometry(padR * 0.78, 0.03, 6, 48), glowMat, [0, 0.11, 0]);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const emblem = mesh(new THREE.CircleGeometry(padR * 0.42, 32), new THREE.MeshStandardMaterial({ map: emblemTexture(), roughness: 0.5 }), [0, 0.112, 0]);
  emblem.rotation.x = -Math.PI / 2;
  g.add(emblem);

  const stone = mat('#cfc6b6');
  pillarSpots(padR).forEach(([x, z]) => {
    const p = group(x, 0, z);
    p.add(mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), stone, [0, 0.06, 0]));
    p.add(mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), stone, [0, 0.67, 0]));
    p.add(mesh(new THREE.BoxGeometry(0.26, 0.08, 0.26), glowMat, [0, 1.26, 0]));
    g.add(p);
  });

  const balls = Array.from({ length: BALLS }, (_, i) => {
    const b = mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ map: ballTexture(i + 1), roughness: 0.15, emissive: '#ff8c1a', emissiveIntensity: 0.15 }));
    b.castShadow = false;
    g.add(b);
    return b;
  });

  let spin = 0;
  return {
    group: g,
    update(dt, { t, motion, power, found = [], summon = 0 }) {
      glowMat.emissiveIntensity = 0.3 + Math.max(power, summon) * 2.2 + Math.sin(t * 3) * 0.1 * motion;
      spin += dt * (0.25 + Math.max(power, summon) * 2.5) * motion;
      balls.forEach((b, i) => {
        b.visible = !!found[i];
        const a = spin + (i / BALLS) * Math.PI * 2;
        const r = lerp(padR + 0.35, padR * 0.9, power);
        b.position.set(Math.cos(a) * r, lerp(1.9, 2.6, power) + Math.sin(t * 2 + i) * 0.06 * motion, Math.sin(a) * r);
        b.rotation.y += dt * motion;
        b.material.emissiveIntensity = 0.15 + Math.max(power, summon) * 1.2;
      });
    }
  };
}

const sparkleTexture = () =>
  canvasTexture(64, 64, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255, 240, 180, 1)');
    g.addColorStop(0.3, 'rgba(255, 170, 40, 0.6)');
    g.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

export function createHunt({ spots }) {
  const glow = sparkleTexture();
  const balls = spots.map(([x, z], i) => {
    const g = group(x, 0.95, z);
    const orb = mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ map: ballTexture(i + 1), roughness: 0.15, emissive: '#ff8c1a', emissiveIntensity: 0.35 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.7);
    halo.raycast = noPick;
    g.add(orb, halo);
    g.userData = { index: i, home: g.position.clone(), fly: -1, from: new THREE.Vector3(), halo };
    return g;
  });
  return {
    balls,
    reset(found) {
      balls.forEach((b, i) => {
        b.visible = !found[i];
        b.userData.fly = -1;
        b.position.copy(b.userData.home);
        b.scale.setScalar(1);
      });
    },
    collect(i) {
      const b = balls[i];
      if (!b.visible || b.userData.fly >= 0) return false;
      b.userData.fly = 0;
      b.userData.from.copy(b.position);
      return true;
    },
    update(dt, { t, motion, target }) {
      balls.forEach((b, i) => {
        if (!b.visible) return;
        const d = b.userData;
        if (d.fly >= 0) {
          d.fly = Math.min(1, d.fly + dt / 0.7);
          const k = smoothstep(d.fly, 0, 1);
          b.position.lerpVectors(d.from, target, k);
          b.position.y += Math.sin(k * Math.PI) * 1.2;
          b.scale.setScalar(1 - k * 0.8);
          if (d.fly === 1) b.visible = false;
          return;
        }
        b.position.y = d.home.y + Math.sin(t * 2 + i) * 0.08 * motion;
        b.rotation.y += dt * 1.2 * motion;
        d.halo.material.opacity = 0.6 + Math.sin(t * 4 + i * 1.7) * 0.3;
      });
    }
  };
}

export function createShenron() {
  const g = group();
  const pts = Array.from({ length: 26 }, (_, i) => {
    const a = i * 0.55;
    const r = 2.1 - i * 0.045;
    return new THREE.Vector3(Math.cos(a) * r, 0.2 + i * 0.3, Math.sin(a) * r);
  });
  pts.push(new THREE.Vector3(0.2, 8.0, 1.2), new THREE.Vector3(0, 8.3, 2.0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const SEG = 260;
  const RAD = 12;
  const geo = new THREE.TubeGeometry(curve, SEG, 0.28, RAD);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let j = 0; j <= SEG; j++) {
    const u = j / SEG;
    curve.getPointAt(u, p);
    const taper = 0.25 + 0.75 * smoothstep(u, 0, 0.3);
    for (let r = 0; r <= RAD; r++) {
      const idx = j * (RAD + 1) + r;
      v.fromBufferAttribute(pos, idx).sub(p).multiplyScalar(taper).add(p);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const skin = new THREE.MeshStandardMaterial({ color: '#2f9e44', emissive: '#14532d', emissiveIntensity: 0.7, roughness: 0.45, metalness: 0.2 });
  const body = new THREE.Mesh(geo, skin);
  body.castShadow = true;
  body.raycast = noPick;
  g.add(body);

  const spikeMat = mat('#e9c46a', { roughness: 0.5 });
  const spikes = Array.from({ length: 14 }, (_, i) => {
    const u = 0.08 + i * 0.062;
    const s = mesh(new THREE.ConeGeometry(0.07, 0.3, 4), spikeMat, curve.getPointAt(u).add(new THREE.Vector3(0, 0.26 * (0.4 + 0.6 * smoothstep(u, 0, 0.3)), 0)).toArray());
    s.userData.u = u;
    s.raycast = noPick;
    g.add(s);
    return s;
  });

  const head = group();
  const scale = mat('#2f9e44', { emissive: '#14532d', emissiveIntensity: 0.7, roughness: 0.45 });
  head.add(mesh(new THREE.BoxGeometry(0.62, 0.5, 0.6), scale));
  head.add(mesh(new THREE.BoxGeometry(0.46, 0.3, 0.62), scale, [0, -0.08, 0.52]));
  const jaw = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.52), mat('#e9c46a'), [0, -0.27, 0.46]);
  head.add(jaw);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#330000', emissive: '#ff2020', emissiveIntensity: 2.5 });
  [1, -1].forEach((s) => {
    head.add(mesh(new THREE.BoxGeometry(0.13, 0.06, 0.04), eyeMat, [s * 0.19, 0.08, 0.31]));
    const horn = mesh(new THREE.ConeGeometry(0.06, 0.7, 6), mat('#8a6a3a'), [s * 0.2, 0.42, -0.25]);
    horn.rotation.set(-0.9, 0, s * -0.25);
    head.add(horn);
    const whisker = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.2, -0.05, 0.78), new THREE.Vector3(s * 0.55, -0.2, 0.6), new THREE.Vector3(s * 0.9, -0.55, 0.1), new THREE.Vector3(s * 1.0, -0.95, -0.4)]);
    head.add(mesh(new THREE.TubeGeometry(whisker, 20, 0.018, 5), mat('#e9c46a')));
  });
  head.traverse((o) => o.isMesh && (o.castShadow = true));
  g.add(head);

  const fwd = new THREE.Vector3(0, 0, 1);
  const tan = new THREE.Vector3();
  g.visible = false;
  return {
    group: g,
    head,
    update(dt, { t, k }) {
      g.visible = k > 0.002;
      if (!g.visible) return;
      const u = clamp(k, 0.002, 1);
      geo.setDrawRange(0, Math.floor(u * SEG) * RAD * 6);
      spikes.forEach((s) => (s.visible = s.userData.u <= u));
      curve.getPointAt(u, head.position);
      curve.getTangentAt(u, tan);
      head.quaternion.setFromUnitVectors(fwd, tan.normalize());
      head.position.y += Math.sin(t * 1.5) * 0.06 * u;
      jaw.rotation.x = Math.max(0, Math.sin(t * 2.2)) * 0.25 * u;
      eyeMat.emissiveIntensity = 2 + Math.sin(t * 6) * 0.8;
    }
  };
}
