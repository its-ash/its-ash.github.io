import * as THREE from 'three';
import { mat, mesh, group, canvasTexture } from './kit.js';

export const SKILLS = [
  { id: 'rust', name: 'Rust', note: 'Fast, safe tools and systems code.', logo: 'rust.svg', fill: '#ce422b', bg: '#ffffff' },
  { id: 'js', name: 'JavaScript', note: 'Web apps, tooling, and interactive UIs like this one.', logo: 'javascript.svg', fill: '#f7df1e', bg: '#323330' },
  { id: 'python', name: 'Python', note: 'APIs, automation, and ML pipelines.', logo: 'python.svg', fill: '#3776ab', bg: '#ffffff' },
  { id: 'linux', name: 'Linux', note: 'Servers, shell tooling, and embedded devices.', logo: 'linux.svg', fill: '#1d1d1d', bg: '#fcc624' },
  { id: 'agents', name: 'Agents', note: 'AI agents that plan, call tools, and finish tasks.', logo: 'robot.svg', bg: '#2a7f8a' },
  { id: 'llm', name: 'LLM', note: 'Apps built on large language models: RAG, prompts, evals.', logo: 'huggingface.svg', fill: '#ffd21e', bg: '#1d2433' },
  { id: 'cv', name: 'Computer Vision', note: 'Detection and image models that run on real cameras.', logo: 'opencv.svg', fill: '#5c3ee8', bg: '#ffffff' }
];

const LOGO_DIR = '/assets/tech/';
const SCREEN_W = 0.64;
const SCREEN_H = 0.4;
const WALL_ROWS = [[1.62, 4], [1.07, 3]];
const CABLES = ['#e84a3c', '#3c8de8', '#f5c518', '#2ecc71', '#1c1f26'];
const GREEN = '#7cffb2';

const loadSvg = (file, fill, size) =>
  fetch(LOGO_DIR + file)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then(
      (svg) =>
        new Promise((resolve, reject) => {
          const sized = svg.replace('<svg', `<svg width="${size}" height="${size}"${fill ? ` fill="${fill}"` : ''}`);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
        })
    );

const wrap = (ctx, text, max) =>
  text.split(' ').reduce((lines, word) => {
    const last = lines.at(-1);
    if (last && ctx.measureText(`${last} ${word}`).width <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);

const drawScreen = (ctx, w, h, skill, { logo = null, on = false } = {}) => {
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(89, 243, 255, 0.04)';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
  ctx.fillStyle = on ? 'rgba(124, 255, 178, 0.22)' : 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(0, 0, w, 44);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(24 + i * 22, 22, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = GREEN;
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.fillText(`~/stack/${skill.id}`, 100, 23);

  const r = 62;
  ctx.fillStyle = skill.bg;
  ctx.beginPath();
  ctx.arc(96, 160, r, 0, Math.PI * 2);
  ctx.fill();
  if (logo) {
    ctx.imageSmoothingEnabled = !skill.logo.startsWith('robot');
    ctx.drawImage(logo, 96 - r * 0.62, 160 - r * 0.62, r * 1.24, r * 1.24);
  }
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `700 ${skill.name.length > 10 ? 36 : 46}px Outfit, sans-serif`;
  ctx.fillText(skill.name, 180, 112);
  ctx.fillStyle = 'rgba(244, 241, 234, 0.75)';
  ctx.font = '500 24px Outfit, sans-serif';
  wrap(ctx, skill.note, w - 204)
    .slice(0, 3)
    .forEach((line, i) => ctx.fillText(line, 180, 160 + i * 30));

  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(28, h - 26, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.fillText('online', 44, h - 25);
  if (!on) return;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
};

const monitor = (skill, bezel) => {
  const g = group();
  g.add(mesh(new THREE.BoxGeometry(SCREEN_W + 0.05, SCREEN_H + 0.05, 0.05), bezel));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), bezel, [0, 0, -0.08]));
  const state = { logo: null, on: false };
  const tex = canvasTexture(512, 320, (ctx, w, h) => drawScreen(ctx, w, h, skill, state));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = 0.026;
  g.add(screen);
  const redraw = () => tex.userData.redraw();
  loadSvg(skill.logo, skill.fill, 128)
    .then((img) => {
      state.logo = img;
      redraw();
    })
    .catch(() => {});
  g.userData = {
    skill,
    light(on) {
      state.on = on;
      redraw();
    }
  };
  return g;
};

const monitorWall = () => {
  const g = group();
  const frame = mat('#3a3f4a', { metalness: 0.5, roughness: 0.45 });
  const bezel = mat('#1c1f26', { metalness: 0.3, roughness: 0.5 });
  [-1.5, 1.5].forEach((x) => {
    g.add(mesh(new THREE.BoxGeometry(0.08, 1.95, 0.08), frame, [x, 0.975, -0.14]));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.05, 0.5), frame, [x, 0.025, -0.1]));
  });
  [1.07, 1.62].forEach((y) => g.add(mesh(new THREE.BoxGeometry(3.08, 0.05, 0.05), frame, [0, y, -0.16])));
  const leg = mat('#5b3a22');
  g.add(mesh(new THREE.BoxGeometry(2.7, 0.06, 0.5), mat('#8d5f31'), [0, 0.62, 0.3]));
  [[-1.25, 0.1], [1.25, 0.1], [-1.25, 0.5], [1.25, 0.5]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), leg, [x, 0.3, z])));
  g.add(mesh(new THREE.BoxGeometry(0.56, 0.025, 0.17), bezel, [0, 0.665, 0.38]));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.02, 0.12), bezel, [0.45, 0.66, 0.38]));

  const screens = [];
  WALL_ROWS.forEach(([y, n]) => {
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.73;
      const m = monitor(SKILLS[screens.length], bezel);
      m.position.set(x, y, -0.04);
      m.rotation.y = -x * 0.12;
      g.add(m);
      screens.push(m);
    }
  });
  return { g, screens };
};

const LOG_ROWS = 8;

const fit = (ctx, text, max) => {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
};

const drawLogs = (ctx, w, h, { lines, head, blink }) => {
  ctx.fillStyle = '#04110a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(124, 255, 178, 0.05)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillStyle = GREEN;
  ctx.fillText(fit(ctx, '$ tail -f github/its-ash', w - 32), 16, 24);
  ctx.fillStyle = 'rgba(124, 255, 178, 0.25)';
  ctx.fillRect(16, 42, w - 32, 2);
  ctx.font = '500 18px "JetBrains Mono", monospace';
  const rows = Array.from({ length: LOG_ROWS }, (_, i) => lines.length ? lines[(head + i) % lines.length] : '');
  rows.forEach((l, i) => {
    ctx.fillStyle = `rgba(124, 255, 178, ${0.45 + (i / LOG_ROWS) * 0.55})`;
    ctx.fillText(fit(ctx, l, w - 32), 16, 66 + i * 34);
  });
  if (blink) {
    ctx.fillStyle = GREEN;
    ctx.fillRect(16, 66 + LOG_ROWS * 34 - 10, 12, 20);
  }
};

const mainframe = (anim) => {
  const g = group();
  const steel = mat('#2b303a', { metalness: 0.4, roughness: 0.5 });
  const trim = mat('#9aa3b2', { metalness: 0.6, roughness: 0.35 });
  const slot = mat('#161a21');
  const leds = ['#59f3ff', GREEN, '#ffb347', GREEN].map((c) => new THREE.MeshStandardMaterial({ color: '#111111', emissive: c, emissiveIntensity: 1.4 }));
  g.add(mesh(new THREE.BoxGeometry(2.4, 0.12, 1.0), mat('#4a4f5a'), [0, 0.06, 0]));
  [-0.78, 0, 0.78].forEach((x, r) => {
    g.add(mesh(new THREE.BoxGeometry(0.74, 1.8, 0.8), steel, [x, 1.02, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.76, 0.06, 0.82), trim, [x, 1.95, 0]));
    for (let i = 0; i < (r === 1 ? 3 : 7); i++) {
      const y = 0.3 + i * 0.22;
      g.add(mesh(new THREE.BoxGeometry(0.6, 0.12, 0.02), slot, [x, y, 0.41]));
      for (let k = 0; k < 3; k++) g.add(mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), leds[(i + k + r) % leds.length], [x + 0.15 + k * 0.065, y, 0.425]));
    }
  });
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.45, 0.02), slot, [0, 1.35, 0.41]));
  const reelMat = mat('#c9ced8', { metalness: 0.5, roughness: 0.4 });
  const reels = [-0.15, 0.15].map((x) => {
    const reel = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24), reelMat, [x, 1.35, 0.44]);
    reel.rotation.x = Math.PI / 2;
    reel.add(mesh(new THREE.BoxGeometry(0.21, 0.05, 0.04), slot, [0, 0.025, 0]));
    g.add(reel);
    return reel;
  });
  const crt = mat('#2b303a', { metalness: 0.3, roughness: 0.5 });
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.62, 0.5), crt, [0, 2.29, -0.02]));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), crt, [0, 2.01, -0.02]));
  const logState = { lines: ['connecting to github...'], head: 0, blink: true };
  const logTex = canvasTexture(512, 360, (ctx, w, h) => drawLogs(ctx, w, h, logState));
  const logScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.5), new THREE.MeshBasicMaterial({ map: logTex, toneMapped: false }));
  logScreen.position.set(0, 2.29, 0.235);
  g.add(logScreen);

  let key = '';
  anim.push(({ t, dt, motion }) => {
    reels.forEach((r, i) => (r.rotation.y += dt * (i ? 1.6 : -1.1) * motion));
    leds.forEach((m, i) => (m.emissiveIntensity = !motion || Math.sin(t * (3 + i * 1.7) + i) > -0.2 ? 1.4 : 0.15));
    logState.head = Math.floor(t / 1.6) % Math.max(1, logState.lines.length);
    logState.blink = Math.floor(t * 2) % 2 === 0;
    const k = `${logState.head}${logState.blink}${logState.lines.length}`;
    if (k === key) return;
    key = k;
    logTex.userData.redraw();
  });
  return {
    g,
    setLogs(lines) {
      logState.lines = lines.length ? lines : ['no public activity yet'];
      key = '';
    }
  };
};

const place = (obj, { x, z, rot }, y) => {
  obj.position.set(x, y, z);
  obj.rotation.y = rot;
  obj.updateMatrix();
  return obj;
};

export function createSkills({ parent, server, wall, y = 0.6 }) {
  const anims = [];
  const frame = mainframe(anims);
  const rig = place(frame.g, server, y);
  const { g: stand, screens } = monitorWall();
  place(stand, wall, y);
  parent.add(rig, stand);

  const at = (o, x, py, z) => new THREE.Vector3(x, py, z).applyMatrix4(o.matrix);
  const pulseMat = new THREE.MeshStandardMaterial({ color: '#111111', emissive: GREEN, emissiveIntensity: 2 });
  const pulseGeo = new THREE.IcosahedronGeometry(0.045, 1);
  CABLES.forEach((color, i) => {
    const curve = new THREE.CatmullRomCurve3([
      at(rig, 1.18, 0.45 + i * 0.1, -0.25 + i * 0.1),
      at(rig, 1.45, 0.03, -0.2 + i * 0.1),
      at(stand, -2.3, 0.03, 0.35 + i * 0.07),
      at(stand, -1.0 + i * 0.1, 0.03, -0.4),
      at(stand, -1.0 + i * 0.1, 0.9, -0.2)
    ]);
    parent.add(mesh(new THREE.TubeGeometry(curve, 80, 0.022, 6), mat(color, { roughness: 0.6 })));
    const pulse = mesh(pulseGeo, pulseMat);
    pulse.castShadow = false;
    parent.add(pulse);
    anims.push(({ t, motion }) => {
      pulse.visible = motion > 0;
      pulse.position.copy(curve.getPointAt((t * 0.35 + i / CABLES.length) % 1));
    });
  });

  let hi = -1;
  anims.push(({ t }) => {
    const next = Math.floor(t / 1.6) % screens.length;
    if (next === hi) return;
    screens[hi]?.userData.light(false);
    screens[next].userData.light(true);
    hi = next;
  });

  return {
    items: screens,
    server: rig,
    setLogs: frame.setLogs,
    update(dt, { t, motion, target }) {
      anims.forEach((fn) => fn({ t, dt, motion, target }));
    }
  };
}
