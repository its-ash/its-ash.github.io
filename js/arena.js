import * as THREE from 'three';
import { mat, mesh, group, canvasTexture } from './kit.js';

const GOLD = '#ffd23f';
const BALLS = 7;
const { lerp } = THREE.MathUtils;

const star = (ctx, x, y, r) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.fill();
};

const ballTexture = (n) =>
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
    update(dt, { t, motion, power }) {
      glowMat.emissiveIntensity = 0.3 + power * 2.2 + Math.sin(t * 3) * 0.1 * motion;
      spin += dt * (0.25 + power * 2.5) * motion;
      balls.forEach((b, i) => {
        const a = spin + (i / BALLS) * Math.PI * 2;
        const r = lerp(padR + 0.35, padR * 0.9, power);
        b.position.set(Math.cos(a) * r, lerp(1.9, 2.6, power) + Math.sin(t * 2 + i) * 0.06 * motion, Math.sin(a) * r);
        b.rotation.y += dt * motion;
        b.material.emissiveIntensity = 0.15 + power * 1.2;
      });
    }
  };
}
