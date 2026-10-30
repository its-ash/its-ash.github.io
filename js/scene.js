import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sunPosition, moonPosition, moonIllumination, toDirection } from './astro.js';
import { rand, spread, mat, mesh, group, jitter, canvasTexture } from './kit.js';
import { createCharacter } from './character.js';
import { createProps } from './props.js';
import { createSkills } from './skills.js';
import { createTemple } from './temple.js';

const ORBIT_R = 80;
const DEG = 180 / Math.PI;
const CLOUDS = 14;
const { lerp, clamp, smoothstep } = THREE.MathUtils;
const ease = (a, b, x) => smoothstep(x, a, b);

const SKY_KEYS = [
  [-18, '#04070f', '#0a1226'],
  [-8, '#121a3d', '#3a2f5c'],
  [-2, '#2b3d7a', '#d77a62'],
  [6, '#4a7fcf', '#f6b37c'],
  [20, '#3f8ae0', '#bfe0fb']
].map(([a, t, b]) => [a, new THREE.Color(t), new THREE.Color(b)]);

const glowTexture = (inner, outer) =>
  canvasTexture(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

const drawMoon = (ctx, s, _h, phase = 0.5) => {
  const c = s / 2;
  const r = s * 0.43;
  const lit = '#f3efe2';
  const dark = 'rgba(38, 46, 70, 0.92)';
  const k = Math.cos(phase * Math.PI * 2);
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, phase >= 0.5);
  ctx.fill();
  ctx.fillStyle = k > 0 ? dark : lit;
  ctx.beginPath();
  ctx.ellipse(c, c, r * Math.abs(k), r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#1b2033';
  [[0.38, 0.4, 0.09], [0.6, 0.62, 0.12], [0.55, 0.3, 0.06], [0.35, 0.68, 0.07]].forEach(([x, y, cr]) => {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * cr, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawTemp = (ctx, w, h, main = '--', sub = 'Loading weather') => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(14, 20, 32, 0.62)';
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 36);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f1ea';
  ctx.font = '700 104px "JetBrains Mono", monospace';
  ctx.fillText(main, w / 2, h * 0.56);
  ctx.fillStyle = 'rgba(244, 241, 234, 0.75)';
  ctx.font = '500 34px Outfit, sans-serif';
  ctx.fillText(sub.slice(0, 26), w / 2, h * 0.82);
};

const BOARD_W = 1024;
const BOARD_H = 680;
const boardRows = (n) => {
  const top = 160;
  const rh = Math.min(76, (BOARD_H - 48 - top) / Math.max(1, n));
  return Array.from({ length: n }, (_, i) => [top + i * rh, top + (i + 1) * rh]);
};

const drawBoard = (ctx, w, h, items = [], hover = -1) => {
  const ph = h / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#9a6535' : '#a8723f';
    ctx.fillRect(0, i * ph, w, ph);
    ctx.fillStyle = 'rgba(60, 32, 12, 0.35)';
    ctx.fillRect(0, i * ph + ph - 4, w, 4);
    ctx.strokeStyle = 'rgba(70, 38, 14, 0.18)';
    ctx.lineWidth = 2;
    for (let g = 0; g < 4; g++) {
      const y = i * ph + 14 + g * (ph / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.013 + i * 3 + g) * 4);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#5b3416';
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.fillStyle = '#3b2a1f';
  [[34, 34], [w - 34, 34], [34, h - 34], [w - 34, h - 34]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = '700 76px Outfit, sans-serif';
  ctx.fillText('Projects', 64, 98);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '500 30px Outfit, sans-serif';
  ctx.fillText('Click a row to open', w - 64, 102);
  boardRows(items.length).forEach(([y0, y1], i) => {
    const it = items[i];
    const mid = (y0 + y1) / 2;
    if (i === hover) {
      ctx.fillStyle = 'rgba(255, 240, 210, 0.24)';
      ctx.beginPath();
      ctx.roundRect(48, y0 + 4, w - 96, y1 - y0 - 8, 14);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = `${it.all ? 700 : 600} 40px Outfit, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(it.label, 72, mid);
    ctx.textAlign = 'right';
    ctx.fillText(it.all ? '→' : '↗', w - 72, mid);
  });
};

const TEMPLE = { x: 1.0, z: -4.3, rot: Math.atan2(-1.0, 4.3) };
const atTemple = (x, z) => {
  const c = Math.cos(TEMPLE.rot);
  const s = Math.sin(TEMPLE.rot);
  return [TEMPLE.x + x * c + z * s, TEMPLE.z - x * s + z * c];
};
const PRAY_AT = atTemple(0.55, 1.05);
const PRAY_LOOK = atTemple(-1.3, 1.8);

const WAYPOINTS = [
  { name: 'door', x: -1.9, z: 0.35, look: [-2.06, -0.26], wait: [3, 5], line: 'Welcome to my island!' },
  { name: 'pond', x: -2.4, z: 1.95, look: [-4, 1.6], wait: [3, 5], line: 'I like calm, simple code.' },
  { name: 'mailbox', x: -0.55, z: 2.75, look: [-1.1, 3.3], wait: [2, 3], line: 'Got an idea? Send me a message.' },
  { name: 'path', x: 0.6, z: 3.9 },
  { name: 'board', x: 2.3, z: 3.5, look: [1.9, 2.8], wait: [3, 5], line: 'These are sites I shipped.' },
  { name: 'windmill', x: 3.7, z: 1.7, look: [4.6, 1.2], wait: [2, 4], line: 'I also do computer vision.' },
  { name: 'bench', x: 2.0, z: -1.45, look: [2.0, 1], wait: [10, 16], sit: true, line: 'Building an AI agent in Rust...' },
  { name: 'temple', x: PRAY_AT[0], z: PRAY_AT[1], look: PRAY_LOOK, wait: [4, 6], pray: true, line: 'Jai Bajrang Bali!' },
  { name: 'yard', x: -0.2, z: -0.3 }
];

const OBSTACLES = [
  [-2.4, -1.2, 1.5], [3, -2.2, 0.55], [1.09, 3.29, 0.22], [1.9, 2.8, 0.25], [2.71, 2.31, 0.22], [-1.1, 3.3, 0.4], [0.9, 2.3, 0.2],
  [4.6, 1.2, 0.65], [-4, 1.6, 1.25], [2.0, -1.62, 0.3], [-5.6, 0.2, 0.4], [5.8, 0.4, 0.3], [-1.8, 1.7, 0.25], [5.2, -3.2, 0.45], [0.2, 5.6, 0.35],
  [-5.2, -1.2, 0.4], [-4.6, -3.4, 0.4], [2.4, -5.4, 0.4], [TEMPLE.x, TEMPLE.z, 0.85], [5.6, -1.4, 0.35], [-3.2, 4.8, 0.35], [4.6, 3.8, 0.3], [-0.8, -3.2, 0.3]
];

const POIS = [
  { action: 'about', label: 'About me', x: -1.9, z: 0.35, r: 1.1 },
  { action: 'stack', label: 'Tech stack', x: 2.0, z: -1.0, r: 1.1 },
  { action: 'projects', label: 'Projects', x: 2.3, z: 3.5, r: 1.2 },
  { action: 'contact', label: 'Contact', x: -0.55, z: 2.75, r: 1.0 },
  { action: 'windmill', label: 'Spin windmill', x: 3.7, z: 1.7, r: 0.9 },
  { action: 'lamp', label: 'Toggle lamp', x: 0.7, z: 1.8, r: 0.7 },
  { action: 'temple', label: 'Hanuman Mandir', x: PRAY_AT[0], z: PRAY_AT[1], r: 1.0 }
];

const KEYS = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
const blocked = (x, z) => Math.hypot(x, z) > 6.3 || OBSTACLES.some(([ox, oz, r]) => Math.hypot(x - ox, z - oz) < r + 0.18);

export function createScene(canvas, { onHover, onAction, onThunder, onFocus, onNear, onBell, projects = [], reducedMotion = false, lowPower = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.75));
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe0fb, 60, 160);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true,
    enablePan: false,
    minDistance: 12,
    maxDistance: 34,
    maxPolarAngle: 1.5,
    minPolarAngle: 0.35,
    autoRotate: !reducedMotion,
    autoRotateSpeed: 0.35
  });
  controls.target.set(0, 1.5, 0);

  const state = {
    lat: 26.9124,
    lng: 75.7873,
    offsetH: 0,
    target: { clouds: 0.2, rain: 0, snow: 0, fog: 0, storm: 0 },
    cur: { clouds: 0.2, rain: 0, snow: 0, fog: 0, storm: 0 },
    wind: 8,
    windDir: 270,
    temp: 20,
    snowCover: 0,
    lamp: null,
    spin: 0,
    flash: 0,
    nextStrike: 0,
    sky: { sunAlt: 0, moonAlt: 0, phase: 0, fraction: 0, day: 1, night: 0 },
    phaseDrawn: -1
  };

  // Sky
  const skyU = {
    top: { value: new THREE.Color() },
    bottom: { value: new THREE.Color() },
    glowDir: { value: new THREE.Vector3(0, 1, 0) },
    glow: { value: new THREE.Color('#ffd9a0') },
    glowAmt: { value: 1 }
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 glowDir; uniform vec3 glow; uniform float glowAmt; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          vec3 col = mix(bottom, top, smoothstep(-0.2, 0.55, d.y));
          float s = max(dot(d, glowDir), 0.0);
          col += glow * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.8) * glowAmt;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3(spread(2), Math.abs(spread(2)) + 0.03, spread(2)).normalize().multiplyScalar(110);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, fog: false, depthWrite: false }));
  scene.add(stars);

  const hoverables = [];
  const tag = (obj, action, label) => {
    obj.userData = { ...obj.userData, action, label };
    hoverables.push(obj);
    obj.traverse((m) => m.material?.emissive && !m.userData.noHover && (m.userData.base = m.material.emissive.clone()));
    return obj;
  };

  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(3, 24, 12), new THREE.MeshBasicMaterial({ color: '#fff4cc', fog: false })));
  sun.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,244,214,1)', 'rgba(255,190,110,0.45)'), fog: false, depthWrite: false, blending: THREE.AdditiveBlending })));
  sun.children[1].scale.setScalar(26);
  sun.children[1].raycast = () => {};
  scene.add(tag(sun, 'sun', 'Sun'));

  const moonTex = canvasTexture(256, 256, drawMoon);
  const moon = new THREE.Group();
  moon.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(200,215,255,0.55)', 'rgba(150,170,230,0.18)'), fog: false, depthWrite: false, blending: THREE.AdditiveBlending })));
  moon.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false })));
  moon.children[0].scale.setScalar(20);
  moon.children[0].raycast = () => {};
  moon.children[1].scale.setScalar(7);
  scene.add(tag(moon, 'moon', 'Moon'));

  // Lights
  const hemi = new THREE.HemisphereLight(0xbfe0fb, 0x4a3b2a, 1);
  const sunLight = new THREE.DirectionalLight(0xfff6e8, 2.2);
  sunLight.castShadow = !lowPower;
  sunLight.shadow.mapSize.setScalar(lowPower ? 512 : 1024);
  Object.assign(sunLight.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  sunLight.shadow.bias = -0.0008;
  const moonLight = new THREE.DirectionalLight(0x9fb6ff, 0.4);
  scene.add(hemi, sunLight, moonLight);

  // Island
  const island = new THREE.Group();
  scene.add(island);
  const grassBase = new THREE.Color('#6fbf5a');
  const grassDry = new THREE.Color('#b9b35e');
  const snowWhite = new THREE.Color('#f2f6fb');
  const grassMat = mat(grassBase.clone());
  island.add(mesh(new THREE.CylinderGeometry(7, 6.4, 1.2, 12), grassMat));
  island.add(mesh(new THREE.CylinderGeometry(6.4, 6.2, 0.7, 12), mat('#8a5a3c'), [0, -0.95, 0]));
  const rockGeo = new THREE.ConeGeometry(6.2, 7, 12, 4);
  jitter(rockGeo, 0.9, (y) => y < -3.49);
  rockGeo.rotateX(Math.PI);
  island.add(mesh(rockGeo, mat('#7b6650'), [0, -4.8, 0]));

  const foliageMats = [];
  const foliageBase = [];
  const tree = (x, z, s = 1, color = '#3f9b4a') => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 0.9 * s, 6), mat('#6b4a2f'), [0, 0.45 * s, 0]));
    const fm = mat(color);
    foliageMats.push(fm);
    foliageBase.push(fm.color.clone());
    [[0.9, 1.3, 1.1], [0.7, 1.1, 1.75], [0.45, 0.9, 2.3]].forEach(([r, h, y]) => g.add(mesh(new THREE.ConeGeometry(r * s, h * s, 7), fm, [0, y * s, 0])));
    g.position.set(x, 0.6, z);
    g.userData.sway = rand() * Math.PI * 2;
    return g;
  };

  const trees = [[-5.2, -1.2, 0.8], [-4.6, -3.4, 1], [2.4, -5.4, 0.9], [5.6, -1.4, 0.7], [-3.2, 4.8, 0.7], [4.6, 3.8, 0.6], [-0.8, -3.2, 0.6]].map(([x, z, s]) =>
    tree(x, z, s, rand() > 0.5 ? '#3f9b4a' : '#4fae58')
  );
  island.add(...trees);

  const bigTree = new THREE.Group();
  bigTree.add(mesh(new THREE.CylinderGeometry(0.25, 0.4, 2, 7), mat('#6b4a2f'), [0, 1, 0]));
  const bigLeaf = mat('#2f8a46');
  foliageMats.push(bigLeaf);
  foliageBase.push(bigLeaf.color.clone());
  [[0, 2.6, 0, 1.4], [0.8, 2.2, 0.3, 0.9], [-0.7, 2.3, -0.2, 1], [0.1, 3.4, -0.1, 0.9]].forEach(([x, y, z, r]) =>
    bigTree.add(mesh(new THREE.IcosahedronGeometry(r, 0), bigLeaf, [x, y, z]))
  );
  bigTree.position.set(3, 0.6, -2.2);
  bigTree.userData.sway = 1;
  island.add(tag(bigTree, 'stack', 'Tech stack'));
  trees.push(bigTree);

  const house = new THREE.Group();
  house.add(mesh(new THREE.BoxGeometry(2.4, 1.8, 2), mat('#efe2c8'), [0, 0.9, 0]));
  const roof = mesh(new THREE.ConeGeometry(2, 1.3, 4), mat('#c4553b'), [0, 2.45, 0]);
  roof.rotation.y = Math.PI / 4;
  house.add(roof);
  house.add(mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), mat('#9a8a7a'), [0.7, 2.6, -0.4]));
  const doorPivot = group(-0.25, 0, 1.01);
  doorPivot.add(mesh(new THREE.BoxGeometry(0.5, 0.9, 0.06), mat('#6b4226'), [0.25, 0.45, 0]), mesh(new THREE.IcosahedronGeometry(0.03, 0), mat('#f1c84b'), [0.42, 0.45, 0.05]));
  house.add(doorPivot);
  const windowMat = mat('#2c3a4f', { emissive: '#ffc96b', emissiveIntensity: 0 });
  [[-0.75, 1.15, 1.01], [0.75, 1.15, 1.01]].forEach((p) => house.add(mesh(new THREE.BoxGeometry(0.45, 0.45, 0.06), windowMat, p)));
  const sideWin = mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), windowMat, [1.21, 1.15, 0]);
  house.add(sideWin);
  house.traverse((m) => m.material === windowMat && (m.userData.noHover = true));
  house.position.set(-2.4, 0.6, -1.2);
  house.rotation.y = 0.35;
  island.add(tag(house, 'about', 'About me'));

  const boardItems = [...projects, { label: 'View all projects', url: '/project.html', all: true }];
  const rows = boardRows(boardItems.length);
  const boardTex = canvasTexture(BOARD_W, BOARD_H, (ctx, w, h, hover) => drawBoard(ctx, w, h, boardItems, hover));
  const board = group(1.9, 0.6, 2.8);
  board.rotation.y = 0.55;
  const post = mat('#6b4a2f');
  [-1.05, 1.05].forEach((x) => board.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 6), post, [x, 1.25, 0])));
  board.add(mesh(new THREE.BoxGeometry(2.2, 1.5, 0.08), mat('#5b3416'), [0, 1.6, -0.02]));
  const boardRoof = mesh(new THREE.BoxGeometry(2.5, 0.08, 0.45), mat('#c4553b'), [0, 2.42, 0.05]);
  boardRoof.rotation.x = 0.25;
  board.add(boardRoof);
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.33), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.85 }));
  boardFace.position.set(0, 1.6, 0.025);
  boardFace.receiveShadow = true;
  boardFace.userData.noHover = true;
  board.add(boardFace);
  island.add(tag(board, 'projects', 'Projects board'));
  let boardHover = -1;
  const rowAt = (uv) => {
    const py = (1 - uv.y) * BOARD_H;
    return rows.findIndex(([y0, y1]) => py >= y0 && py < y1);
  };
  const setBoardHover = (i) => {
    if (i === boardHover) return;
    boardHover = i;
    boardTex.userData.redraw(i);
  };

  const mailbox = new THREE.Group();
  mailbox.add(mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), mat('#6b4a2f'), [0, 0.55, 0]));
  mailbox.add(mesh(new THREE.BoxGeometry(0.55, 0.45, 0.85), mat('#d6453d'), [0, 1.3, 0]));
  const flag = group(0.3, 1.35, -0.25);
  const flagMat = mat('#f1c84b');
  flag.add(mesh(new THREE.BoxGeometry(0.04, 0.4, 0.06), flagMat, [0, 0.2, 0]), mesh(new THREE.BoxGeometry(0.2, 0.16, 0.04), flagMat, [0, 0.35, 0.08]));
  flag.rotation.x = -Math.PI / 2;
  mailbox.add(flag);
  mailbox.position.set(-1.1, 0.6, 3.3);
  mailbox.rotation.y = -0.3;
  island.add(tag(mailbox, 'contact', 'Contact'));

  const lamp = new THREE.Group();
  lamp.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.4, 6), mat('#2f3540'), [0, 1.2, 0]));
  const bulbMat = mat('#fff1c2', { emissive: '#ffcf70', emissiveIntensity: 0 });
  lamp.add(mesh(new THREE.IcosahedronGeometry(0.22, 0), bulbMat, [0, 2.5, 0]));
  lamp.children[1].userData.noHover = true;
  const lampLight = new THREE.PointLight(0xffc870, 0, 9, 1.6);
  lampLight.position.set(0, 2.5, 0);
  lamp.add(lampLight);
  lamp.position.set(0.9, 0.6, 2.3);
  island.add(tag(lamp, 'lamp', 'Toggle lamp'));

  const mill = new THREE.Group();
  mill.add(mesh(new THREE.CylinderGeometry(0.3, 0.6, 3, 8), mat('#e7dccb'), [0, 1.5, 0]));
  mill.add(mesh(new THREE.ConeGeometry(0.45, 0.6, 8), mat('#c4553b'), [0, 3.3, 0]));
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const bl = mesh(new THREE.BoxGeometry(0.22, 1.5, 0.04), mat('#f4efe6'), [0, 0.75, 0]);
    const arm = new THREE.Group();
    arm.add(bl);
    arm.rotation.z = (i * Math.PI) / 2;
    blades.add(arm);
  }
  blades.position.set(0, 2.9, 0.42);
  mill.add(blades);
  mill.position.set(4.6, 0.6, 1.2);
  mill.rotation.y = -0.6;
  island.add(tag(mill, 'windmill', 'Spin windmill'));

  const pondMat = mat('#4aa3d8', { roughness: 0.15, metalness: 0.1, flatShading: false });
  const pond = mesh(new THREE.CircleGeometry(1.3, 18), pondMat, [-4, 0.61, 1.6]);
  pond.rotation.x = -Math.PI / 2;
  island.add(pond);
  const water = new THREE.Color('#4aa3d8');
  const ice = new THREE.Color('#d4ecf7');

  [[-5.6, 0.75, 0.2, 0.35], [5.8, 0.7, 0.4, 0.25], [-1.8, 0.7, 1.7, 0.2], [5.2, 0.7, -3.2, 0.4], [0.2, 0.7, 5.6, 0.3]].forEach(([x, y, z, r]) =>
    island.add(mesh(new THREE.DodecahedronGeometry(r, 0), mat('#8d8a86'), [x, y, z]))
  );

  const bench = group(2.0, 0.6, -1.5);
  const benchWood = mat('#9c6a37');
  bench.add(mesh(new THREE.BoxGeometry(1.1, 0.07, 0.38), benchWood, [0, 0.29, 0]), mesh(new THREE.BoxGeometry(1.1, 0.26, 0.06), benchWood, [0, 0.5, -0.17]));
  [[-0.48, 0.13], [0.48, 0.13], [-0.48, -0.13], [0.48, -0.13]].forEach(([x, z]) => bench.add(mesh(new THREE.BoxGeometry(0.06, 0.27, 0.06), mat('#4a3424'), [x, 0.13, z])));
  island.add(bench);

  const temple = createTemple();
  temple.group.position.set(TEMPLE.x, 0.6, TEMPLE.z);
  temple.group.rotation.y = TEMPLE.rot;
  island.add(tag(temple.group, 'temple', 'Hanuman Mandir'));
  const ringBell = () => {
    temple.ring();
    onBell?.();
  };

  const doors = { open: false, flag: 0, pulse: 0 };
  const me = createCharacter({
    waypoints: WAYPOINTS,
    reduced: reducedMotion,
    onArrive: (name) => {
      if (name === 'door') doors.open = true;
      if (name === 'mailbox') doors.flag = 3;
      if (name === 'temple') ringBell();
    },
    onLeave: (name) => name === 'door' && (doors.open = false),
    blocked,
    start: { name: 'temple', timer: 7 }
  });
  island.add(tag(me.root, 'me', 'Say hi'));

  const skills = createSkills({ scene });
  skills.items.forEach((s) => tag(s, 'skill', s.userData.skill.name));
  const meWorld = new THREE.Vector3();
  document.fonts?.ready.then(() => boardTex.userData.redraw(boardHover));

  const props = createProps({
    scene,
    island,
    lowPower,
    chimney: new THREE.Vector3(0.7, 3.0, -0.4).applyEuler(house.rotation).add(house.position),
    pond: { x: -4, z: 1.6, r: 1.3, y: 0.61 },
    avoid: [
      [-2.4, -1.2, 1.9], [3, -2.2, 1.2], [TEMPLE.x, TEMPLE.z, 1.3], [PRAY_AT[0], PRAY_AT[1], 0.5], [1.9, 2.8, 1.3], [-1.1, 3.3, 0.6], [0.9, 2.3, 0.4], [4.6, 1.2, 0.9], [-4, 1.6, 1.6], [2, -1.5, 0.9],
      ...trees.map((g) => [g.position.x, g.position.z, 0.8])
    ]
  });
  island.add(tag(props.croc, 'croc', 'Crocodile'));

  const tempTex = canvasTexture(512, 256, drawTemp);
  const tempSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tempTex, depthWrite: false }));
  tempSprite.scale.set(4, 2, 1);
  tempSprite.position.set(0.4, 5.6, -3.4);
  island.add(tag(tempSprite, 'unit', 'Switch °C / °F'));

  // Fireflies
  const flyGeo = new THREE.BufferGeometry();
  const flyBase = Float32Array.from({ length: 40 * 3 }, (_, i) => (i % 3 === 1 ? 0.9 + rand() * 1.8 : spread(11)));
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#ffe27a', size: 0.14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  island.add(flies);

  // Clouds
  const puff = new THREE.IcosahedronGeometry(1, 0);
  const clouds = Array.from({ length: CLOUDS }, (_, i) => {
    const g = new THREE.Group();
    const m = mat('#ffffff', { transparent: true, opacity: 0, roughness: 1 });
    const n = 4 + Math.floor(rand() * 3);
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(puff, m);
      p.position.set((j - n / 2) * 0.9 + spread(0.4), spread(0.5), spread(0.9));
      p.scale.setScalar(0.8 + rand() * 0.7);
      p.castShadow = true;
      g.add(p);
    }
    const a = rand() * Math.PI * 2;
    const r = i < 3 ? 4 + rand() * 4 : 6 + rand() * 16;
    g.position.set(Math.cos(a) * r, 9 + rand() * 4, Math.sin(a) * r);
    g.scale.setScalar(0.8 + rand() * 0.8);
    g.userData = { mat: m, rank: i, burst: 0, rain: null };
    scene.add(tag(g, 'cloud', 'Make it rain'));
    return g;
  });

  const streaks = (n, box) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const drops = Array.from({ length: n }, () => [spread(box.w), box.y0 + rand() * (box.y1 - box.y0), spread(box.w)]);
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#b4cbe4', transparent: true, opacity: 0.55, depthWrite: false }));
    lines.frustumCulled = false;
    lines.userData = { drops, box, pos };
    return lines;
  };

  const stepStreaks = (lines, dt, count, speed, wx, wz) => {
    const { drops, box, pos } = lines.userData;
    for (let i = 0; i < count; i++) {
      const d = drops[i];
      d[0] += wx * dt;
      d[1] -= speed * dt;
      d[2] += wz * dt;
      if (d[1] < box.y0) [d[0], d[1], d[2]] = [spread(box.w), box.y1 + rand() * 3, spread(box.w)];
      pos.set([d[0], d[1], d[2], d[0] - wx * 0.035, d[1] + speed * 0.035, d[2] - wz * 0.035], i * 6);
    }
    lines.geometry.setDrawRange(0, count * 2);
    lines.geometry.attributes.position.needsUpdate = true;
  };

  const RAIN_N = lowPower ? 900 : 1800;
  const rain = streaks(RAIN_N, { w: 36, y0: -6, y1: 14 });
  scene.add(rain);

  const SNOW_N = lowPower ? 700 : 1400;
  const flake = canvasTexture(32, 32, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = Float32Array.from({ length: SNOW_N * 3 }, (_, i) => (i % 3 === 1 ? -6 + rand() * 20 : spread(36)));
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: flake, size: 0.22, transparent: true, depthWrite: false }));
  snow.frustumCulled = false;
  scene.add(snow);

  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: '#eef3ff', transparent: true, fog: false }));
  bolt.visible = false;
  scene.add(bolt);

  const strike = () => {
    const p = boltGeo.attributes.position;
    let [x, z] = [spread(30), -10 - rand() * 12];
    for (let i = 0; i < 10; i++) {
      p.setXYZ(i, x, 12 - i * 1.9, z);
      x += spread(1.6);
      z += spread(1.2);
    }
    p.needsUpdate = true;
    state.flash = 1;
    onThunder?.();
  };

  // Interaction
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const hoverAdd = new THREE.Color(0.2, 0.15, 0.08);
  let hovered = null;
  let pickPending = false;
  let lastPtr = null;
  let down = null;
  let idleAt = 0;

  const visibleChain = (o) => {
    for (let n = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };

  const pick = (x, y) => {
    ptr.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    for (const hit of ray.intersectObjects(hoverables, true)) {
      if (!visibleChain(hit.object)) continue;
      let o = hit.object;
      while (o && !o.userData.action) o = o.parent;
      if (o?.userData.action === 'cloud' && o.userData.mat.opacity < 0.2) continue;
      if (o) return { o, hit };
    }
    return null;
  };

  const view = { mode: 'orbit', tween: null, saved: null, k: 0 };

  const setHover = (res, x, y) => {
    const o = res?.o ?? null;
    const row = view.mode === 'focus' && res?.hit.object === boardFace ? rowAt(res.hit.uv) : -1;
    setBoardHover(row);
    if (o !== hovered) {
      hovered?.traverse((m) => m.userData.base && m.material.emissive.copy(m.userData.base));
      if (view.mode === 'orbit') o?.traverse((m) => m.userData.base && m.material.emissive.copy(m.userData.base).add(hoverAdd));
      hovered = view.mode === 'orbit' ? o : null;
    }
    const label = view.mode === 'orbit' ? o?.userData.label : row >= 0 ? `Open ${boardItems[row].label}` : null;
    canvas.style.cursor = label ? 'pointer' : '';
    onHover?.(label ?? null, x, y);
  };

  const tweenTo = (pos, tgt, dur, done) =>
    (view.tween = { fp: camera.position.clone(), tp: pos, ft: controls.target.clone(), tt: tgt, t0: performance.now(), dur: reducedMotion ? 1 : dur, done });

  const focusProjects = () => {
    if (view.mode !== 'orbit') return;
    if (view.intro) {
      view.tween = null;
      endIntro();
    }
    view.mode = 'focusing';
    view.saved = { pos: camera.position.clone(), tgt: controls.target.clone() };
    Object.assign(controls, { enabled: false, autoRotate: false, minDistance: 0.1 });
    setHover(null);
    const c = boardFace.getWorldPosition(new THREE.Vector3());
    c.y -= island.position.y;
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(boardFace.getWorldQuaternion(new THREE.Quaternion()));
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(0.78 / half, 1.12 / (half * camera.aspect));
    tweenTo(c.clone().addScaledVector(n, dist), c, 1400, () => (view.mode = 'focus'));
    onFocus?.(true);
  };

  const unfocus = () => {
    if (view.mode !== 'focus' && view.mode !== 'focusing') return;
    view.mode = 'leaving';
    setHover(null);
    tweenTo(view.saved.pos, view.saved.tgt, 1200, () => {
      view.mode = 'orbit';
      Object.assign(controls, { enabled: true, minDistance: 12 });
      idleAt = performance.now() + 8000;
    });
    onFocus?.(false);
  };

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    lastPtr = { x: e.clientX, y: e.clientY };
    pickPending = true;
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
  canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || performance.now() - down.t > 600) return;
    const res = pick(e.clientX, e.clientY);
    if (view.mode === 'leaving' || view.mode === 'focusing') return;
    if (view.mode === 'focus') {
      const row = res?.hit.object === boardFace ? rowAt(res.hit.uv) : -1;
      if (row >= 0) onAction?.('open', res.o, boardItems[row].url);
      else if (res?.o !== board) unfocus();
      return;
    }
    if (!res) return;
    const { o } = res;
    trigger(o.userData.action, o);
  });

  const trigger = (action, o) => {
    if (action === 'projects') return focusProjects();
    if (o) o.userData.pop = 1;
    if (action === 'cloud') burst(o);
    if (action === 'lamp') state.lamp = !(state.lamp ?? state.sky.night > 0.5);
    if (action === 'windmill') state.spin = 12;
    if (action === 'me') me.wave();
    if (action === 'contact') doors.flag = 3;
    if (action === 'about') doors.pulse = 2.5;
    if (action === 'croc') props.snap();
    if (action === 'temple') ringBell();
    onAction?.(action, o);
  };

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (view.intro) {
      view.tween = null;
      endIntro();
    }
    idleAt = Infinity;
  });
  controls.addEventListener('end', () => (idleAt = performance.now() + 15000));

  const held = new Set();
  let near = null;
  const typing = (e) => e.target.closest?.('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]');
  addEventListener('keydown', (e) => {
    if (typing(e) || view.mode !== 'orbit') return;
    if (KEYS[e.code]) {
      e.preventDefault();
      held.add(e.code);
      controls.autoRotate = false;
      idleAt = performance.now() + 15000;
    } else if ((e.code === 'Enter' || e.code === 'Space') && near && (e.target === document.body || e.target === canvas)) {
      e.preventDefault();
      trigger(near.action, null);
    }
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  const camF = new THREE.Vector3();
  const steer = () => {
    let f = 0;
    let r = 0;
    held.forEach((c) => {
      r += KEYS[c][0];
      f += KEYS[c][1];
    });
    if (!f && !r) return me.setInput(0, 0);
    camF.subVectors(controls.target, camera.position).setY(0).normalize();
    me.setInput(camF.x * f - camF.z * r, camF.z * f + camF.x * r);
  };

  const checkNear = () => {
    const p = me.pos;
    const hit = me.manual ? POIS.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < q.r) ?? null : null;
    if (hit !== near) {
      near = hit;
      onNear?.(near?.label ?? null);
    }
  };

  const burst = (cloud) => {
    if (!cloud.userData.rain) {
      cloud.userData.rain = streaks(160, { w: 3, y0: -10, y1: 0 });
      cloud.userData.rain.material.opacity = 0.7;
      cloud.add(cloud.userData.rain);
    }
    cloud.userData.burst = performance.now() + 7000;
  };

  // Frame
  const top = new THREE.Color();
  const bottom = new THREE.Color();
  const gray = new THREE.Color();
  const white = new THREE.Color(1, 1, 1);
  const tmpC = new THREE.Color();
  const dirV = new THREE.Vector3();
  const nightCloud = new THREE.Color('#3a4560');
  const stormCloud = new THREE.Color('#6b7280');
  const sunsetSun = new THREE.Color('#ffa868');
  const noonSun = new THREE.Color('#fff6e8');

  const skyAt = (alt) => {
    const k = SKY_KEYS;
    if (alt <= k[0][0]) return top.copy(k[0][1]), bottom.copy(k[0][2]);
    for (let i = 1; i < k.length; i++) {
      if (alt <= k[i][0]) {
        const f = (alt - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
        return top.lerpColors(k[i - 1][1], k[i][1], f), bottom.lerpColors(k[i - 1][2], k[i][2], f);
      }
    }
    top.copy(k.at(-1)[1]);
    bottom.copy(k.at(-1)[2]);
  };

  const updateSky = () => {
    const now = new Date(Date.now() + state.offsetH * 36e5);
    const sp = sunPosition(now, state.lat, state.lng);
    const mp = moonPosition(now, state.lat, state.lng);
    const ill = moonIllumination(now);
    const sunAlt = sp.altitude * DEG;
    Object.assign(state.sky, {
      sunAlt,
      moonAlt: mp.altitude * DEG,
      phase: ill.phase,
      fraction: ill.fraction,
      day: ease(-6, 10, sunAlt),
      night: 1 - ease(-12, 0, sunAlt),
      sunDir: toDirection(sp),
      moonDir: toDirection(mp),
      date: now
    });
    if (Math.abs(ill.phase - state.phaseDrawn) > 0.004) {
      moonTex.userData.redraw(ill.phase);
      state.phaseDrawn = ill.phase;
    }
  };

  const clock = new THREE.Clock();
  let skyTimer = 0;
  updateSky();

  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const motion = reducedMotion ? 0.3 : 1;
    const { cur, target, sky: s } = state;

    if ((skyTimer -= dt) <= 0) {
      updateSky();
      skyTimer = 0.5;
    }
    for (const k in cur) cur[k] = lerp(cur[k], target[k], 1 - Math.exp(-dt * 0.8));

    const overcast = clamp(cur.clouds * 0.75 + cur.fog * 0.3, 0, 0.85);
    skyAt(s.sunAlt);
    for (const c of [top, bottom]) {
      const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      c.lerp(gray.setRGB(l, l, l), overcast).multiplyScalar(1 - cur.storm * 0.35 - cur.rain * 0.15);
      c.lerp(white, state.flash * 0.5);
    }
    skyU.top.value.copy(top);
    skyU.bottom.value.copy(bottom);
    const glowFromSun = s.sunAlt > -8;
    const gd = glowFromSun ? s.sunDir : s.moonDir;
    skyU.glowDir.value.set(gd.x, gd.y, gd.z);
    skyU.glow.value.set(glowFromSun ? '#ffd9a0' : '#a9b9e6');
    skyU.glowAmt.value = (glowFromSun ? 1 : 0.35 * s.fraction) * (1 - overcast);
    scene.fog.color.copy(bottom);
    scene.fog.near = lerp(60, 4, cur.fog);
    scene.fog.far = lerp(170, 34, cur.fog);
    stars.material.opacity = s.night * (1 - cur.clouds * 0.9) * (0.75 + Math.sin(t * 3) * 0.05);
    stars.visible = stars.material.opacity > 0.01;

    sun.position.copy(dirV.set(s.sunDir.x, s.sunDir.y, s.sunDir.z).multiplyScalar(ORBIT_R));
    sun.visible = s.sunAlt > -4;
    sun.children[1].material.opacity = 1 - overcast * 0.8;
    sunLight.position.copy(dirV).multiplyScalar(0.4);
    sunLight.intensity = ease(-2, 8, s.sunAlt) * 2.4 * (1 - overcast * 0.65);
    sunLight.color.lerpColors(sunsetSun, noonSun, ease(0, 30, s.sunAlt));

    moon.position.set(s.moonDir.x, s.moonDir.y, s.moonDir.z).multiplyScalar(ORBIT_R);
    moon.visible = s.moonAlt > -4;
    moon.children.forEach((m) => (m.material.opacity = 1 - overcast * 0.75));
    moonLight.position.copy(moon.position).multiplyScalar(0.4);
    moonLight.intensity = moon.visible ? s.night * 0.6 * (0.3 + s.fraction * 0.7) * (1 - overcast * 0.6) : 0;

    hemi.color.copy(top).lerp(white, 0.3);
    hemi.groundColor.set('#4a3b2a');
    hemi.intensity = lerp(0.35, 1.1, s.day) * (1 - cur.storm * 0.3) + state.flash * 3;

    const lit = state.lamp ?? s.night > 0.5;
    lampLight.intensity = lerp(lampLight.intensity, lit ? 8 : 0, 1 - Math.exp(-dt * 6));
    bulbMat.emissiveIntensity = lampLight.intensity / 4;
    windowMat.emissiveIntensity = s.night * 1.4;

    const heat = clamp((state.temp - 30) / 8, 0, 1);
    const coverTarget = cur.snow > 0.1 ? 0.85 : state.temp < -2 ? 0.3 : 0;
    state.snowCover = lerp(state.snowCover, coverTarget, 1 - Math.exp(-dt * 0.25));
    grassMat.color.copy(grassBase).lerp(grassDry, heat).lerp(snowWhite, state.snowCover);
    foliageMats.forEach((m, i) => m.color.copy(foliageBase[i]).lerp(snowWhite, state.snowCover * 0.55));
    pondMat.color.copy(state.temp < 0 ? ice : water);
    pondMat.roughness = state.temp < 0 ? 0.6 : 0.15;

    const windK = clamp(state.wind / 40, 0, 1.5);
    const bearing = ((state.windDir + 180) * Math.PI) / 180;
    const wx = Math.sin(bearing);
    const wz = -Math.cos(bearing);

    view.k = lerp(view.k, view.mode === 'orbit' ? 0 : 1, 1 - Math.exp(-dt * 4));
    island.position.y = Math.sin(t * 0.5) * 0.15 * motion * (1 - view.k);
    trees.forEach((g) => (g.rotation.z = Math.sin(t * (1 + windK) + g.userData.sway) * 0.03 * (0.3 + windK) * motion));
    state.spin = Math.max(0, state.spin - dt * 3);
    blades.rotation.z -= dt * (0.4 + state.wind * 0.06 + state.spin) * motion;
    tempSprite.position.y = 5.6 + Math.sin(t * 1.2) * 0.12 * motion;

    doors.flag = Math.max(0, doors.flag - dt);
    doors.pulse = Math.max(0, doors.pulse - dt);
    const k6 = 1 - Math.exp(-dt * 6);
    doorPivot.rotation.y = lerp(doorPivot.rotation.y, doors.open || doors.pulse > 0 ? -1.3 : 0, k6);
    flag.rotation.x = lerp(flag.rotation.x, doors.flag > 0 ? 0 : -Math.PI / 2, k6);
    steer();
    me.update(dt, { t, motion, rain: cur.rain, snow: cur.snow, temp: state.temp, cam: camera.position });
    checkNear();
    skills.update(dt, { t, motion, target: me.root.getWorldPosition(meWorld) });
    temple.update(dt, { t, night: s.night, motion, windK });
    props.update(dt, { t, motion, day: s.day, night: s.night, rain: cur.rain, snow: cur.snow, storm: cur.storm, windX: wx * windK, windZ: wz * windK, windK, temp: state.temp, snowCover: state.snowCover });

    const fp = flyGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      fp.setXYZ(i, flyBase[i * 3] + Math.sin(t * 0.7 + i) * 0.4, flyBase[i * 3 + 1] + Math.sin(t * 1.3 + i * 2) * 0.25, flyBase[i * 3 + 2] + Math.cos(t * 0.6 + i) * 0.4);
    }
    fp.needsUpdate = true;
    flies.material.opacity = s.night * (1 - cur.rain) * (1 - cur.snow) * (0.6 + Math.sin(t * 4) * 0.3);

    const shown = Math.max(3, cur.clouds * CLOUDS);
    const nowMs = performance.now();
    tmpC.copy(white).lerp(stormCloud, clamp(cur.storm + cur.rain * 0.5, 0, 1)).lerp(nightCloud, s.night * 0.8);
    clouds.forEach((c) => {
      const d = c.userData;
      const op = clamp(shown - d.rank, 0, 1) * 0.92;
      d.mat.opacity = lerp(d.mat.opacity, op, 1 - Math.exp(-dt * 1.5));
      d.mat.color.copy(tmpC);
      c.visible = d.mat.opacity > 0.02;
      c.position.x += wx * state.wind * 0.02 * dt * motion;
      c.position.z += wz * state.wind * 0.02 * dt * motion;
      if (Math.abs(c.position.x) > 26) c.position.x *= -0.98;
      if (Math.abs(c.position.z) > 26) c.position.z *= -0.98;
      if (d.rain) {
        d.rain.visible = d.burst > nowMs;
        if (d.rain.visible) stepStreaks(d.rain, dt, 160, 14, 0, 0);
      }
    });

    const rainN = Math.floor(RAIN_N * cur.rain);
    rain.visible = rainN > 0;
    if (rain.visible) stepStreaks(rain, dt, rainN, 22 * (reducedMotion ? 0.5 : 1), wx * state.wind * 0.12, wz * state.wind * 0.12);

    const snowN = Math.floor(SNOW_N * cur.snow);
    snow.visible = snowN > 0;
    if (snow.visible) {
      const p = snowGeo.attributes.position;
      for (let i = 0; i < snowN; i++) {
        let y = p.getY(i) - dt * 1.6 * motion;
        let x = p.getX(i) + (Math.sin(t + i) * 0.3 + wx * state.wind * 0.04) * dt;
        let z = p.getZ(i) + wz * state.wind * 0.04 * dt;
        if (y < -6) [x, y, z] = [spread(36), 14, spread(36)];
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
      snowGeo.setDrawRange(0, snowN);
    }

    if (target.storm > 0.5 && t > state.nextStrike) {
      strike();
      state.nextStrike = t + 4 + rand() * 9;
    }
    state.flash = Math.max(0, state.flash - dt * 2.5);
    bolt.visible = state.flash > 0.55;

    hoverables.forEach((o) => {
      if (!o.userData.pop) return;
      o.userData.pop = Math.max(0, o.userData.pop - dt * 3);
      const k = 1 + Math.sin(o.userData.pop * Math.PI) * 0.08;
      o.scale.copy((o.userData.baseScale ??= o.scale.clone())).multiplyScalar(k);
    });

    if (pickPending && lastPtr) {
      setHover(pick(lastPtr.x, lastPtr.y), lastPtr.x, lastPtr.y);
      pickPending = false;
    }
    if (view.tween) {
      const tw = view.tween;
      const k = Math.min(1, (performance.now() - tw.t0) / tw.dur);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      camera.position.lerpVectors(tw.fp, tw.tp, e);
      controls.target.lerpVectors(tw.ft, tw.tt, e);
      if (k === 1) {
        view.tween = null;
        tw.done?.();
      }
    }
    if (view.mode === 'orbit' && !controls.autoRotate && !reducedMotion && performance.now() > idleAt) controls.autoRotate = true;
    controls.update(dt);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const endIntro = () => {
    if (!view.intro) return;
    view.intro = false;
    clearTimeout(view.introTimer);
    controls.minDistance = 12;
    idleAt = performance.now() + 6000;
  };

  const start = () => {
    resize();
    const far = innerWidth < 700 ? 30 : 22;
    const end = new THREE.Vector3(far * 0.62, far * 0.38, far * 0.78);
    const home = new THREE.Vector3(0, 1.5, 0);
    const [fx, fz] = atTemple(0.2, 0.4);
    const focus = new THREE.Vector3(fx, 1.35, fz);
    const [cx, cz] = atTemple(-1.0, 4.2);
    const near = new THREE.Vector3(cx, 2.1, cz);
    if (innerWidth < 700) near.sub(focus).multiplyScalar(1.45).add(focus);
    camera.position.copy(near.clone().add(new THREE.Vector3(6, 9, 14)));
    controls.target.copy(focus);
    Object.assign(controls, { autoRotate: false, minDistance: 0.5 });
    Object.assign(view, { intro: true });
    idleAt = Infinity;
    tweenTo(near, focus, 2400, () => {
      view.introTimer = setTimeout(() => {
        if (!view.intro || view.mode !== 'orbit') return endIntro();
        tweenTo(end, home, 2800, endIntro);
      }, 4200);
    });
    renderer.setAnimationLoop(loop);
  };

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    renderer.setAnimationLoop(document.hidden ? null : loop);
    clock.getDelta();
  });
  start();

  return {
    setPlace(lat, lng) {
      Object.assign(state, { lat, lng });
      updateSky();
    },
    setWeather({ cond, wind, windDir, temp }) {
      Object.assign(state.target, { clouds: cond.clouds, rain: cond.rain, snow: cond.snow, fog: cond.fog, storm: cond.thunder ? 1 : 0 });
      Object.assign(state, { wind: wind ?? state.wind, windDir: windDir ?? state.windDir, temp: temp ?? state.temp });
      if (cond.thunder) state.nextStrike = clock.elapsedTime + 1.5;
    },
    setTimeOffset(h) {
      state.offsetH = h;
      updateSky();
    },
    setTempLabel(main, sub) {
      tempTex.userData.redraw(main, sub);
    },
    focusProjects,
    unfocus,
    interact: () => near && trigger(near.action, null),
    focused: () => view.mode !== 'orbit',
    sky: () => ({ ...state.sky }),
    lampOn: () => state.lamp ?? state.sky.night > 0.5
  };
}
