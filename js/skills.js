import * as THREE from 'three';
import { mat, mesh, group, jitter, canvasTexture, rand } from './kit.js';

export const SKILLS = [
  { id: 'rust', name: 'Rust', note: 'Fast, safe tools and systems code.', logo: 'rust.svg', fill: '#ce422b', bg: '#ffffff' },
  { id: 'js', name: 'JavaScript', note: 'Web apps, tooling, and interactive UIs like this one.', logo: 'javascript.svg', fill: '#f7df1e', bg: '#323330' },
  { id: 'python', name: 'Python', note: 'APIs, automation, and ML pipelines.', logo: 'python.svg', fill: '#3776ab', bg: '#ffffff' },
  { id: 'linux', name: 'Linux', note: 'Servers, shell tooling, and embedded devices.', logo: 'linux.svg', fill: '#1d1d1d', bg: '#fcc624' },
  { id: 'agents', name: 'Agents', note: 'AI agents that plan, call tools, and finish tasks.', logo: 'robot.svg', bg: '#2a7f8a' },
  { id: 'llm', name: 'LLM', note: 'Apps built on large language models: RAG, prompts, evals.', logo: 'huggingface.svg', fill: '#ffd21e', bg: '#1d2433' },
  { id: 'cv', name: 'Computer Vision', note: 'Detection and image models that run on real cameras.', logo: 'opencv.svg', fill: '#5c3ee8', bg: '#ffffff' }
];

const SIDE = 2.47;
const SPREAD = 0.62;
const ROWS = [[11.2, 4], [14.6, 3]];
const VIEW = new THREE.Vector3(13.6, 8.4, 17.2);
const LOGO_DIR = '/assets/tech/';

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

const badgeTexture = ({ logo, fill, bg }) => {
  const tex = canvasTexture(256, 256, (ctx, w, h, img) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.stroke();
    if (!img) return;
    ctx.imageSmoothingEnabled = !logo.startsWith('robot');
    ctx.drawImage(img, w * 0.22, h * 0.22, w * 0.56, h * 0.56);
  });
  loadSvg(logo, fill, 256).then((img) => tex.userData.redraw(img)).catch(() => {});
  return tex;
};

const jsFaceTexture = () => {
  const tex = canvasTexture(256, 256, (ctx, w, h, img) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f7df1e';
    if (!img) return ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#323330';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
  loadSvg('javascript.svg', '#f7df1e', 256).then((img) => tex.userData.redraw(img)).catch(() => {});
  return tex;
};

const base = (top, rock, r = 1.5) => {
  const g = group();
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.45, 9), mat(top), [0, -0.225, 0]));
  const cone = new THREE.ConeGeometry(r * 0.9, r * 1.7, 9, 2);
  jitter(cone, 0.35, (y) => y < -r * 0.85 + 0.01);
  cone.rotateX(Math.PI);
  g.add(mesh(cone, mat(rock), [0, -0.45 - r * 0.85, 0]));
  return g;
};

const builders = {
  rust(g, anim) {
    const metal = mat('#ce422b', { metalness: 0.45, roughness: 0.45 });
    const gear = group(0, 1.25, 0);
    const disc = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.24, 20), metal);
    disc.rotation.x = Math.PI / 2;
    gear.add(disc);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tooth = mesh(new THREE.BoxGeometry(0.2, 0.26, 0.24), metal, [Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0]);
      tooth.rotation.z = a;
      gear.add(tooth);
    }
    const hub = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12), mat('#3a1a10'));
    hub.rotation.x = Math.PI / 2;
    gear.add(hub);
    g.add(gear, mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 6), mat('#4a2a1a'), [0, 0.3, 0]));
    anim.push(({ dt, motion }) => (gear.rotation.z -= dt * 0.8 * motion));
  },

  js(g, anim) {
    const face = new THREE.MeshStandardMaterial({ map: jsFaceTexture(), roughness: 0.6 });
    const cube = mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), face, [0, 1.1, 0]);
    g.add(cube);
    anim.push(({ t, dt, motion }) => {
      cube.rotation.y += dt * 0.6 * motion;
      cube.position.y = 1.1 + Math.sin(t * 1.6) * 0.12 * motion;
    });
  },

  python(g, anim) {
    const coil = group(0, 0.05, 0);
    [['#3776ab', 0], ['#ffd43b', Math.PI]].forEach(([color, ph]) => {
      const pts = Array.from({ length: 40 }, (_, i) => {
        const u = i / 39;
        const a = u * Math.PI * 4 + ph;
        return new THREE.Vector3(Math.cos(a) * 0.38, 0.15 + u * 1.5, Math.sin(a) * 0.38);
      });
      const m = mat(color, { flatShading: false, roughness: 0.5 });
      coil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 8), m));
      const head = mesh(new THREE.IcosahedronGeometry(0.15, 1), m, pts.at(-1).toArray());
      head.scale.set(1, 0.8, 1.3);
      coil.add(head);
      [1, -1].forEach((s) => head.add(mesh(new THREE.IcosahedronGeometry(0.03, 0), mat('#111'), [s * 0.07, 0.06, 0.09])));
    });
    coil.traverse((o) => o.isMesh && (o.castShadow = true));
    g.add(coil);
    anim.push(({ dt, motion }) => (coil.rotation.y += dt * 0.5 * motion));
  },

  linux(g, anim) {
    const black = mat('#1d1d1d');
    const white = mat('#f4f4f4');
    const orange = mat('#f5a623');
    const tux = group();
    const body = mesh(new THREE.CapsuleGeometry(0.34, 0.3, 4, 10), black, [0, 0.55, 0]);
    const belly = mesh(new THREE.SphereGeometry(0.3, 12, 10), white, [0, 0.5, 0.14]);
    belly.scale.set(0.9, 1.15, 0.7);
    const head = group(0, 1.08, 0);
    head.add(mesh(new THREE.IcosahedronGeometry(0.27, 1), black));
    const face = mesh(new THREE.SphereGeometry(0.2, 10, 8), white, [0, -0.02, 0.12]);
    face.scale.set(1, 0.9, 0.7);
    head.add(face);
    [1, -1].forEach((s) => head.add(mesh(new THREE.IcosahedronGeometry(0.035, 0), black, [s * 0.07, 0.05, 0.25])));
    const beak = mesh(new THREE.ConeGeometry(0.08, 0.2, 6), orange, [0, -0.06, 0.3]);
    beak.rotation.x = Math.PI / 2;
    head.add(beak);
    const flippers = [1, -1].map((s) => {
      const f = mesh(new THREE.BoxGeometry(0.08, 0.42, 0.18), black, [s * 0.36, 0.6, 0]);
      f.rotation.z = s * 0.25;
      return f;
    });
    [1, -1].forEach((s) => tux.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.28), orange, [s * 0.14, 0.03, 0.08])));
    tux.add(body, belly, head, ...flippers);
    g.add(tux);
    anim.push(({ t, motion }) => {
      tux.rotation.z = Math.sin(t * 3) * 0.08 * motion;
      tux.rotation.y = Math.sin(t * 0.5) * 0.6 * motion;
      flippers.forEach((f, i) => (f.rotation.z = (i ? -1 : 1) * (0.25 + Math.max(0, Math.sin(t * 6)) * 0.3 * motion)));
    });
  },

  agents(g, anim) {
    const shell = mat('#dfe3ea', { metalness: 0.3, roughness: 0.4 });
    const teal = mat('#2a7f8a');
    const bot = group(0, 0.35, 0);
    bot.add(mesh(new THREE.BoxGeometry(0.6, 0.55, 0.45), teal, [0, 0.3, 0]));
    const head = group(0, 0.85, 0);
    head.add(mesh(new THREE.BoxGeometry(0.62, 0.48, 0.5), shell));
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#0b1220', emissive: '#59f3ff', emissiveIntensity: 1.4 });
    [1, -1].forEach((s) => head.add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), eyeMat, [s * 0.14, 0.03, 0.26])));
    head.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 5), mat('#343341'), [0, 0.36, 0]));
    const tipMat = new THREE.MeshStandardMaterial({ color: '#f92f3c', emissive: '#f92f3c', emissiveIntensity: 1 });
    head.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), tipMat, [0, 0.5, 0]));
    const arms = [1, -1].map((s) => {
      const a = group(s * 0.36, 0.5, 0);
      a.add(mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), shell, [0, -0.18, 0]));
      bot.add(a);
      return a;
    });
    bot.add(head);
    g.add(bot);
    anim.push(({ t, motion }) => {
      bot.position.y = 0.35 + Math.sin(t * 2) * 0.1 * motion;
      head.rotation.y = Math.sin(t * 0.9) * 0.7 * motion;
      arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 2.5 + i * Math.PI) * 0.5 * motion));
      tipMat.emissiveIntensity = Math.sin(t * 5) > 0 ? 1.6 : 0.2;
    });
  },

  llm(g, anim) {
    const bubble = group(0, 1.15, 0);
    const shellMat = mat('#ffd21e', { roughness: 0.5 });
    bubble.add(mesh(new THREE.CapsuleGeometry(0.36, 0.7, 6, 12), shellMat));
    bubble.children[0].rotation.z = Math.PI / 2;
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.3, 4), shellMat, [-0.35, -0.38, 0]);
    tail.rotation.z = 0.5;
    bubble.add(tail);
    const dotMat = mat('#1d2433');
    const dots = [-0.28, 0, 0.28].map((x) => mesh(new THREE.IcosahedronGeometry(0.075, 1), dotMat, [x, 0, 0.34]));
    bubble.add(...dots);
    g.add(bubble, mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6), mat('#6b4a2f'), [0, 0.25, 0]));
    anim.push(({ t, motion }) => {
      bubble.position.y = 1.15 + Math.sin(t * 1.3) * 0.08 * motion;
      bubble.rotation.y = Math.sin(t * 0.6) * 0.5 * motion;
      dots.forEach((d, i) => (d.position.y = Math.max(0, Math.sin(t * 6 - i * 0.9)) * 0.12 * motion));
    });
  },

  cv(g, anim) {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6), mat('#3a3f4a'), [0, 0.35, 0]));
    const eye = group(0, 1.15, 0);
    eye.add(mesh(new THREE.SphereGeometry(0.5, 20, 14), mat('#f7f7fb', { flatShading: false, roughness: 0.3 })));
    const iris = mesh(new THREE.SphereGeometry(0.22, 16, 10), mat('#5c3ee8', { flatShading: false, roughness: 0.3 }), [0, 0, 0.42]);
    iris.scale.z = 0.35;
    const pupil = mesh(new THREE.SphereGeometry(0.11, 12, 8), mat('#0b0b10', { flatShading: false, roughness: 0.1 }), [0, 0, 0.5]);
    pupil.scale.z = 0.3;
    eye.add(iris, pupil);
    const lid = mesh(new THREE.SphereGeometry(0.53, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3a3f4a', { side: THREE.DoubleSide }));
    lid.rotation.x = -1.5;
    eye.add(lid);
    g.add(eye);
    let blink = 3;
    anim.push(({ dt, target }) => {
      eye.lookAt(target);
      eye.rotation.x = THREE.MathUtils.clamp(eye.rotation.x, -0.8, 0.8);
      blink -= dt;
      if (blink < -0.18) blink = 2 + rand() * 4;
      lid.rotation.x = blink < 0 ? 0 : -1.5;
    });
  }
};

export function createSkills({ scene }) {
  const items = [];
  const anims = [];
  const top = { rust: ['#c9773f', '#7a3b1f'], linux: ['#eef3f8', '#6b6f78'] };
  const slots = ROWS.flatMap(([r, n], row) =>
    Array.from({ length: n }, (_, j) => [r, SIDE + (n === 1 ? 0 : (j / (n - 1) - 0.5) * 2 * SPREAD * (row ? 0.75 : 1)), row])
  );
  SKILLS.forEach((skill, i) => {
    const [r, a, row] = slots[i];
    const [t, rock] = top[skill.id] ?? ['#6fbf5a', '#7b6650'];
    const isle = base(t, rock);
    isle.position.set(Math.cos(a) * r, -1.4 + row * 1.3 + (i % 2) * 0.4, Math.sin(a) * r);
    isle.rotation.y = Math.atan2(VIEW.x - isle.position.x, VIEW.z - isle.position.z);
    builders[skill.id](isle, anims);
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(skill), transparent: true, depthWrite: false }));
    badge.scale.setScalar(1.1);
    badge.position.y = 2.7;
    isle.add(badge);
    isle.userData = { skill, baseY: isle.position.y, phase: rand() * 6, badge };
    scene.add(isle);
    items.push(isle);
  });

  return {
    items,
    update(dt, { t, motion, target }) {
      items.forEach((g) => {
        const d = g.userData;
        g.position.y = d.baseY + Math.sin(t * 0.6 + d.phase) * 0.3 * motion;
        d.badge.position.y = 2.7 + Math.sin(t * 1.4 + d.phase) * 0.08 * motion;
      });
      anims.forEach((fn) => fn({ t, dt, motion, target }));
    }
  };
}
