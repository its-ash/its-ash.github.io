import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sunPosition, moonPosition, moonIllumination, toDirection } from './astro.js';
import { rand, spread, mat, mesh, group, jitter, smooth, canvasTexture } from './kit.js';
import { createCharacter } from './character.js';
import { createProps } from './props.js';
import { createSkills } from './skills.js';
import { createTemple } from './temple.js';
import { createArena, pillarSpots, createHunt, createShenron } from './arena.js';
import { fetchActivity } from './github.js';
import { createAbout, createContact } from './sheets.js';

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

const drawTemp = (ctx, w, h, main = '--', sub = 'Loading weather', wind = '') => {
  ctx.fillStyle = '#5b3416';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#121a28';
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 22);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7cffb2';
  ctx.font = '600 28px "JetBrains Mono", monospace';
  ctx.fillText('WEATHER', w / 2, h * 0.16);
  ctx.fillStyle = '#f4f1ea';
  ctx.font = '700 112px "JetBrains Mono", monospace';
  ctx.fillText(main, w / 2, h * 0.44);
  ctx.fillStyle = 'rgba(244, 241, 234, 0.8)';
  ctx.font = '500 36px Outfit, sans-serif';
  ctx.fillText(sub.slice(0, 22), w / 2, h * 0.7);
  ctx.fillStyle = 'rgba(244, 241, 234, 0.6)';
  ctx.font = '500 28px "JetBrains Mono", monospace';
  ctx.fillText(wind, w / 2, h * 0.86);
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

const MAIN_R = 7;
const VIEW = { x: 13.6, z: 17.2 };
const along = ({ x, z }, d) => [(x / Math.hypot(x, z)) * d, (z / Math.hypot(x, z)) * d];
const rotXZ = ({ x: cx, z: cz, rot }, x, z) => [cx + x * Math.cos(rot) + z * Math.sin(rot), cz - x * Math.sin(rot) + z * Math.cos(rot)];
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

const TISLE = { x: 1.0, z: -12.4, r: 3.2 };
const TECH = { x: -10.4, z: 8.3, r: 4.2 };
TECH.rot = Math.atan2(VIEW.x - TECH.x, VIEW.z - TECH.z);
const SAIYAN = { x: 12.4, z: -2.0, r: 3.2 };
SAIYAN.rot = Math.atan2(VIEW.x - SAIYAN.x, VIEW.z - SAIYAN.z);
const PAD_R = 1.25;
const PAN_R = 18;
const bridgeTo = (I) => ({ a: along(I, MAIN_R - 0.5), b: along(I, Math.hypot(I.x, I.z) - I.r + 0.5) });
const T_BRIDGE = bridgeTo(TISLE);
const K_BRIDGE = bridgeTo(TECH);
const S_BRIDGE = bridgeTo(SAIYAN);
const BRIDGES = [T_BRIDGE, K_BRIDGE, S_BRIDGE];
const atSaiyan = (x, z) => rotXZ(SAIYAN, x, z);
const onPad = (x, z) => Math.hypot(x - SAIYAN.x, z - SAIYAN.z) < PAD_R - 0.2;

const [templeX, templeZ] = along(TISLE, Math.hypot(TISLE.x, TISLE.z) + 0.5);
const TEMPLE = { x: templeX, z: templeZ, rot: Math.atan2(-templeX, -templeZ) };
const atTemple = (x, z) => rotXZ(TEMPLE, x, z);
const atTech = (x, z) => rotXZ(TECH, x, z);
const PRAY_AT = atTemple(0.55, 1.05);
const PRAY_LOOK = atTemple(-1.3, 1.8);
const PEEPAL = atTemple(-1.8, -0.5);
const techPose = (x, z, rot) => {
  const [px, pz] = atTech(x, z);
  return { x: px, z: pz, rot: TECH.rot + rot };
};
const SERVER = techPose(-2.1, -1.3, 0.6);
const WALL = techPose(1.6, -1.6, -0.5);
const TECH_AT = atTech(0.9, -0.1);
const TECH_LOOK = rotXZ(WALL, 0, 0);
const HOME = new THREE.Vector3(0, 1.5, 0);
const GH_TREE = [4.0, -3.9];
const GH_SIGN = [3.3, -3.3];
const GH_GREENS = ['#9be9a8', '#40c463', '#30a14e', '#216e39'];
const GITHUB_URL = 'https://github.com/its-ash';
const RESUME_URL = '/resume.pdf';
const BALL_KEY = 'itsash.balls';
const BALL_SPOTS = [[-3.6, -2.6], [-3.2, 3.0], [1.4, 5.0], [4.8, -2.4], atTemple(-1.2, -2.0), atTech(-2.6, 1.4), atSaiyan(0.4, -2.3)];
const ISLANDS = [
  { x: 0, z: 0, r: MAIN_R, stop: [0.9, 4.6] },
  { ...TISLE, stop: atTemple(1.6, 1.4) },
  { ...TECH, stop: atTech(2.2, 1.6) },
  { ...SAIYAN, stop: atSaiyan(-1.9, 0.9) }
];
const islandAt = (x, z) => ISLANDS.reduce((best, I, i) => (Math.hypot(x - I.x, z - I.z) - I.r < Math.hypot(x - ISLANDS[best].x, z - ISLANDS[best].z) - ISLANDS[best].r ? i : best), 0);
const xz = ([x, z]) => ({ x, z });

const WAYPOINTS = [
  { name: 'door', x: -1.9, z: 0.35, look: [-2.06, -0.26], wait: [3, 5], line: 'Welcome to my island!' },
  { name: 'pond', x: -2.4, z: 1.95, look: [-4, 1.6], wait: [3, 5], line: 'Meet my crocodile.' },
  { name: 'tw1', x: -3.0, z: 3.2 },
  { name: 'techHead', ...xz(K_BRIDGE.a) },
  { name: 'techEnd', ...xz(K_BRIDGE.b) },
  { name: 'tech', ...xz(TECH_AT), look: TECH_LOOK, wait: [4, 6], line: 'This is my tech stack.' },
  { name: 'techEnd', ...xz(K_BRIDGE.b) },
  { name: 'techHead', ...xz(K_BRIDGE.a) },
  { name: 'tw2', x: -1.6, z: 2.3 },
  { name: 'mailbox', x: -0.55, z: 2.75, look: [-1.1, 3.3], wait: [2, 3], line: 'Got an idea? Send me a message.' },
  { name: 'path', x: 0.6, z: 3.9 },
  { name: 'board', x: 2.3, z: 3.5, look: [1.9, 2.8], wait: [3, 5], line: 'These are sites I shipped.' },
  { name: 'windmill', x: 3.7, z: 1.7, look: [4.6, 1.2], wait: [2, 4], line: 'I also do computer vision.' },
  { name: 'sw1', x: 4.0, z: -0.2 },
  { name: 'saiyanHead', ...xz(S_BRIDGE.a) },
  { name: 'saiyanEnd', ...xz(S_BRIDGE.b) },
  { name: 'saiyan', x: SAIYAN.x, z: SAIYAN.z, look: atSaiyan(0, 2), wait: [8, 10], blast: true },
  { name: 'saiyanEnd', ...xz(S_BRIDGE.b) },
  { name: 'saiyanHead', ...xz(S_BRIDGE.a) },
  { name: 'sw2', x: 5.0, z: -0.6 },
  { name: 'bench', x: 2.0, z: -1.45, look: [2.0, 1], wait: [10, 16], sit: true, line: 'Building an AI agent in Rust...' },
  { name: 'templeHead', ...xz(T_BRIDGE.a) },
  { name: 'templeEnd', ...xz(T_BRIDGE.b) },
  { name: 'temple', ...xz(PRAY_AT), look: PRAY_LOOK, wait: [4, 6], pray: true, line: 'Jai Bajrang Bali!' },
  { name: 'templeEnd', ...xz(T_BRIDGE.b) },
  { name: 'templeHead', ...xz(T_BRIDGE.a) },
  { name: 'yard', x: -0.2, z: -0.3 }
];

const OBSTACLES = [
  [-2.4, -1.2, 1.5], [3, -2.2, 0.55], [1.09, 3.29, 0.22], [1.9, 2.8, 0.25], [2.71, 2.31, 0.22], [-1.1, 3.3, 0.4], [0.9, 2.3, 0.2],
  [4.6, 1.2, 0.65], [-4, 1.6, 1.25], [2.0, -1.62, 0.3], [-5.6, 0.2, 0.4], [5.8, 0.4, 0.3], [-1.8, 1.7, 0.25], [5.2, -3.2, 0.45], [0.2, 5.6, 0.35],
  [-5.2, -1.2, 0.4], [-4.6, -3.4, 0.4], [2.4, -5.4, 0.4], [5.6, -1.4, 0.35], [-3.2, 4.8, 0.35], [4.6, 3.8, 0.3], [-0.8, -3.2, 0.3],
  [TEMPLE.x, TEMPLE.z, 0.85], [...PEEPAL, 0.5], ...[-0.8, 0, 0.8].map((x) => [...rotXZ(SERVER, x, 0), 0.55]),
  ...[-1.1, -0.37, 0.37, 1.1].map((x) => [...rotXZ(WALL, x, 0.1), 0.42]),
  ...pillarSpots(PAD_R).map(([x, z]) => [...atSaiyan(x, z), 0.2]),
  [...GH_TREE, 0.35], [...GH_SIGN, 0.15]
];

const POIS = [
  { action: 'about', label: 'About me', x: -1.9, z: 0.35, r: 1.1 },
  { action: 'projects', label: 'Projects', x: 2.3, z: 3.5, r: 1.2 },
  { action: 'contact', label: 'Contact', x: -0.55, z: 2.75, r: 1.0 },
  { action: 'windmill', label: 'Spin windmill', x: 3.7, z: 1.7, r: 0.9 },
  { action: 'lamp', label: 'Toggle lamp', x: 0.7, z: 1.8, r: 0.7 },
  { action: 'temple', label: 'Hanuman Mandir', ...xz(PRAY_AT), r: 1.1 },
  { action: 'stack', label: 'Tech stack', ...xz(TECH_AT), r: 1.4 },
  { action: 'saiyan', label: 'Power up', x: SAIYAN.x, z: SAIYAN.z, r: PAD_R }
];

const KEYS = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
const walkable = (x, z) =>
  Math.hypot(x, z) < MAIN_R - 0.7 ||
  [TISLE, TECH, SAIYAN].some((I) => Math.hypot(x - I.x, z - I.z) < I.r - 0.45) ||
  BRIDGES.some(({ a, b }) => segDist(x, z, a, b) < 0.3);
const blocked = (x, z) => !walkable(x, z) || OBSTACLES.some(([ox, oz, r]) => Math.hypot(x - ox, z - oz) < r + 0.18);

export function createScene(canvas, { onHover, onAction, onThunder, onFocus, onNear, onBell, projects = [], reducedMotion = false, lowPower = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe0fb, 60, 160);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true,
    enablePan: true,
    screenSpacePanning: false,
    minDistance: 12,
    maxDistance: 42,
    maxPolarAngle: 1.5,
    minPolarAngle: 0.35,
    autoRotate: !reducedMotion,
    autoRotateSpeed: 0.35
  });
  controls.target.copy(HOME);

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
    phaseDrawn: -1,
    summonK: 0
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
  sunLight.shadow.mapSize.setScalar(lowPower ? 1024 : 2048);
  Object.assign(sunLight.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
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
  const frame = mat('#fbf6ec');
  [-0.75, 0.75].forEach((x) => {
    house.add(mesh(new THREE.BoxGeometry(0.56, 0.56, 0.04), frame, [x, 1.15, 1.0]));
    house.add(mesh(new THREE.BoxGeometry(0.52, 0.1, 0.14), mat('#7a4e2c'), [x, 0.84, 1.08]));
    [-0.15, 0, 0.15].forEach((dx, i) => house.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(['#f25f5c', '#ffd23f', '#c77dff'][i]), [x + dx, 0.93, 1.08])));
  });
  house.add(mesh(new THREE.BoxGeometry(0.04, 0.56, 0.56), frame, [1.2, 1.15, 0]));
  house.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), mat('#6f6358'), [0.7, 3.02, -0.4]));
  house.add(mesh(new THREE.BoxGeometry(0.8, 0.08, 0.32), mat('#b9b2a6'), [0, 0.04, 1.16]));
  house.add(mesh(new THREE.BoxGeometry(2.5, 0.12, 2.1), mat('#d9c9a8'), [0, 0.06, 0]));
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

  const aboutSheet = createAbout({ reduced: reducedMotion });
  aboutSheet.root.position.set(-2.4 + Math.sin(0.35) * 2.0, 2.9, -1.2 + Math.cos(0.35) * 2.0);
  aboutSheet.root.rotation.y = 0.35;
  island.add(tag(aboutSheet.root, 'about', 'About me'));
  const contactSheet = createContact({ reduced: reducedMotion });
  contactSheet.root.position.set(-1.1 + Math.sin(-0.3) * 1.2, 0.6, 3.3 + Math.cos(-0.3) * 1.2);
  contactSheet.root.rotation.y = -0.3;
  island.add(tag(contactSheet.root, 'contact', 'Contact'));

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
  const tempTex = canvasTexture(512, 360, drawTemp);
  const tempPanel = mesh(new THREE.CylinderGeometry(0.485, 0.555, 0.7, 32, 1, true, -1.0, 2.0), new THREE.MeshBasicMaterial({ map: tempTex, toneMapped: false }), [0, 0.9, 0]);
  tempPanel.castShadow = false;
  mill.add(tag(tempPanel, 'unit', 'Switch °C / °F'));
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

  const satellite = (I, rockColor = '#7b6650') => {
    const g = group(I.x, 0, I.z);
    g.add(mesh(new THREE.CylinderGeometry(I.r, I.r * 0.93, 1.0, 14), grassMat, [0, 0.1, 0]));
    g.add(mesh(new THREE.CylinderGeometry(I.r * 0.93, I.r * 0.9, 0.5, 14), mat('#8a5a3c'), [0, -0.65, 0]));
    const rock = new THREE.ConeGeometry(I.r * 0.9, I.r * 1.5, 14, 3);
    jitter(rock, 0.6, (y) => y < -I.r * 0.75 + 0.01);
    rock.rotateX(Math.PI);
    g.add(mesh(rock, mat(rockColor), [0, -0.9 - I.r * 0.75, 0]));
    island.add(g);
    return g;
  };
  satellite(TISLE, '#8a7a6a');
  satellite(TECH, '#6f6a72');
  satellite(SAIYAN, '#7a6a8a');

  const lanternMat = mat('#fff1c2', { emissive: '#ffb347', emissiveIntensity: 0 });
  const bridge = ({ a: [ax, az], b: [bx, bz] }) => {
    const len = Math.hypot(bx - ax, bz - az);
    const g = group((ax + bx) / 2, 0.6, (az + bz) / 2);
    g.rotation.y = Math.atan2(bx - ax, bz - az);
    const plank = new THREE.BoxGeometry(0.9, 0.06, 0.18);
    const woods = ['#9c6a37', '#8d5f31', '#a8743f'].map((c) => mat(c));
    const n = Math.max(2, Math.floor(len / 0.21));
    for (let i = 0; i <= n; i++) {
      const p = mesh(plank, woods[i % 3], [spread(0.04), 0.015, -len / 2 + (i * len) / n]);
      p.rotation.y = spread(0.06);
      g.add(p);
    }
    const postMat = mat('#6b4a2f');
    const ropeMat = mat('#d8c39a');
    const posts = Math.max(2, Math.round(len / 0.9) + 1);
    [1, -1].forEach((s) => {
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.1, len + 0.3), mat('#5b3a22'), [s * 0.4, -0.11, 0]));
      for (let i = 0; i < posts; i++) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.55, 6), postMat, [s * 0.45, 0.25, -len / 2 + (i * len) / (posts - 1)]));
      const rope = mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5), ropeMat, [s * 0.45, 0.46, 0]);
      rope.rotation.x = Math.PI / 2;
      g.add(rope);
      [-1, 1].forEach((e) => g.add(mesh(new THREE.BoxGeometry(0.09, 0.12, 0.09), lanternMat, [s * 0.45, 0.6, (e * len) / 2])));
    });
    island.add(g);
  };
  BRIDGES.forEach(bridge);

  const stoneGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.05, 7);
  const stoneMat = mat('#b9b2a6');
  const path = (pts) => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const steps = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / 0.42));
      for (let j = 0; j < steps; j++) {
        const u = (j + 0.5) / steps;
        const st = mesh(stoneGeo, stoneMat, [lerp(ax, bx, u) + spread(0.08), 0.615, lerp(az, bz, u) + spread(0.08)]);
        st.rotation.y = rand() * Math.PI;
        st.castShadow = false;
        island.add(st);
      }
    }
  };
  path([[-1.9, 0.6], [-0.2, -0.3], T_BRIDGE.a]);
  path([[-2.4, 2.2], [-3.0, 3.2], K_BRIDGE.a]);
  path([[-0.3, 2.6], [0.6, 3.9], [2.1, 3.7]]);
  path([T_BRIDGE.b, atTemple(0.2, 1.3)]);
  path([K_BRIDGE.b, TECH_AT]);
  path([[3.8, 0.8], [4.0, -0.2], S_BRIDGE.a]);
  path([S_BRIDGE.b, [lerp(SAIYAN.x, S_BRIDGE.b[0], 0.6), lerp(SAIYAN.z, S_BRIDGE.b[1], 0.6)]]);

  const peepal = group(PEEPAL[0], 0.6, PEEPAL[1]);
  peepal.add(mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.6, 7), mat('#6b4a2f'), [0, 0.8, 0]));
  const peepalLeaf = mat('#3d8f3f');
  foliageMats.push(peepalLeaf);
  foliageBase.push(peepalLeaf.color.clone());
  [[0, 2.1, 0, 1.0], [0.7, 1.8, 0.2, 0.7], [-0.6, 1.9, -0.2, 0.75], [0.1, 2.6, -0.1, 0.7], [-0.2, 1.7, 0.6, 0.6]].forEach(([x, y, z, r]) =>
    peepal.add(mesh(new THREE.IcosahedronGeometry(r, 0), peepalLeaf, [x, y, z]))
  );
  peepal.add(mesh(new THREE.TorusGeometry(0.33, 0.03, 4, 14), mat('#e2572b'), [0, 0.9, 0]));
  peepal.children.at(-1).rotation.x = Math.PI / 2;
  peepal.userData.sway = 2;
  island.add(peepal);
  trees.push(peepal);
  [[-1.2, 1.4], [1.3, 1.5], [1.6, -0.9], [-0.4, -1.6]].forEach(([x, z], i) => {
    const [px, pz] = atTemple(x, z);
    const bush = group(px, 0.6, pz);
    bush.add(mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#3f8f3f'), [0, 0.18, 0]));
    for (let k = 0; k < 5; k++) bush.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(i % 2 ? '#ff9f1c' : '#ffd23f'), [spread(0.3), 0.28 + rand() * 0.1, spread(0.3)]));
    island.add(bush);
  });

  [[-3.3, 1.0, 0.35], [3.3, 0.2, 0.28], [-2.4, 2.4, 0.3]].forEach(([x, z, r]) => {
    const [px, pz] = atTech(x, z);
    island.add(mesh(new THREE.DodecahedronGeometry(r, 0), mat('#8d8a86'), [px, 0.7, pz]));
  });
  const techTree = tree(...atTech(-0.5, -3.3), 0.8, '#4fae58');
  island.add(techTree);
  trees.push(techTree);

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
    powered: onPad,
    onBlast: (p) => {
      boom.position.copy(p);
      boomT = 0;
      shake = reducedMotion ? 0 : 0.7;
      state.flash = Math.max(state.flash, 0.5);
    },
    start: { name: 'temple', timer: 7 }
  });
  island.add(tag(me.root, 'me', 'Say hi'));

  const arena = createArena({ padR: PAD_R });
  arena.group.position.set(SAIYAN.x, 0.6, SAIYAN.z);
  arena.group.rotation.y = SAIYAN.rot;
  island.add(tag(arena.group, 'saiyan', 'Super Saiyan platform'));

  const skills = createSkills({ parent: island, server: SERVER, wall: WALL });
  skills.items.forEach((s) => tag(s, 'skill', s.userData.skill.name));
  tag(skills.server, 'stack', 'Tech stack');
  const meWorld = new THREE.Vector3();

  // GitHub tree
  const ghTree = group(GH_TREE[0], 0.6, GH_TREE[1]);
  const bark = mat('#5b3a22');
  ghTree.add(mesh(new THREE.CylinderGeometry(0.13, 0.24, 1.7, 8), bark, [0, 0.85, 0]));
  [[0.18, 1.45, -0.7], [-0.2, 1.3, 0.75]].forEach(([x, y, r]) => {
    const br = mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.7, 6), bark, [x, y, 0]);
    br.rotation.z = r;
    ghTree.add(br);
  });
  const LEAF_MAX = 160;
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 1), mat('#ffffff', { roughness: 0.6 }), LEAF_MAX);
  const leafSpots = Array.from({ length: LEAF_MAX }, (_, i) => {
    const v = new THREE.Vector3(spread(2), spread(2), spread(2)).normalize().multiplyScalar(0.45 + rand() * 0.45);
    leaves.setColorAt(i, new THREE.Color(GH_GREENS[i % GH_GREENS.length]));
    return new THREE.Vector3(v.x, 2.05 + v.y * 0.75, v.z);
  });
  leaves.count = 0;
  leaves.castShadow = true;
  leaves.frustumCulled = false;
  ghTree.add(leaves);
  ghTree.userData.sway = 3;
  island.add(tag(ghTree, 'github', 'GitHub activity'));
  ghTree.userData.info = 'Loading GitHub activity...';
  trees.push(ghTree);
  const gh = { target: 0, shown: 0 };
  const leafM = new THREE.Matrix4();
  const leafQ = new THREE.Quaternion();
  const leafS = new THREE.Vector3();
  const growLeaves = (dt) => {
    if (gh.shown >= gh.target) return;
    gh.shown = Math.min(gh.target, gh.shown + dt * 45);
    const n = Math.ceil(gh.shown);
    for (let i = 0; i < n; i++) leaves.setMatrixAt(i, leafM.compose(leafSpots[i], leafQ, leafS.setScalar(clamp(gh.shown - i, 0.001, 1))));
    leaves.count = n;
    leaves.instanceMatrix.needsUpdate = true;
    leaves.boundingSphere = null;
  };

  const ghSignTex = canvasTexture(512, 256, (ctx, w, h, n) => {
    ctx.fillStyle = '#24292f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#40c463';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 64px Outfit, sans-serif';
    ctx.fillText('GitHub', w / 2, 70);
    ctx.fillStyle = '#9be9a8';
    ctx.font = '600 40px "JetBrains Mono", monospace';
    ctx.fillText(typeof n === 'number' ? `${n} commits` : (n ?? 'loading...'), w / 2, 145);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '500 30px Outfit, sans-serif';
    ctx.fillText('Tap to open profile', w / 2, 205);
  });
  const ghSign = group(GH_SIGN[0], 0.6, GH_SIGN[1]);
  ghSign.rotation.y = Math.atan2(VIEW.x - GH_SIGN[0], VIEW.z - GH_SIGN[1]);
  ghSign.add(mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), bark, [0, 0.55, 0]));
  ghSign.add(mesh(new THREE.BoxGeometry(0.9, 0.48, 0.05), mat('#24292f'), [0, 1.15, 0]));
  const ghFace = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.42), new THREE.MeshBasicMaterial({ map: ghSignTex, toneMapped: false }));
  ghFace.position.set(0, 1.15, 0.03);
  ghSign.add(ghFace);
  ghSign.userData.url = GITHUB_URL;
  island.add(tag(ghSign, 'link', 'Open my GitHub'));

  fetchActivity()
    .then(({ commits, logs }) => {
      gh.target = Math.min(LEAF_MAX, commits);
      gh.label = commits;
      ghTree.userData.info = `${commits} commits pushed to public GitHub repos recently. One leaf per commit.`;
      ghSignTex.userData.redraw(gh.label);
      skills.setLogs(logs);
    })
    .catch(() => {
      gh.label = 'offline';
      ghTree.userData.info = 'GitHub activity is not available right now.';
      ghSignTex.userData.redraw(gh.label);
      skills.setLogs(['github api unavailable', 'try again later']);
    });
  document.fonts?.ready.then(() => ghSignTex.userData.redraw(gh.label));

  // Dragon Balls
  const found = Array(7).fill(false);
  try {
    const saved = JSON.parse(localStorage.getItem(BALL_KEY));
    if (Array.isArray(saved)) saved.forEach((i) => Number.isInteger(i) && i >= 0 && i < 7 && (found[i] = true));
  } catch {}
  const saveBalls = () => {
    try {
      localStorage.setItem(BALL_KEY, JSON.stringify(found.flatMap((f, i) => (f ? [i] : []))));
    } catch {}
  };
  const hunt = createHunt({ spots: BALL_SPOTS });
  hunt.balls.forEach((b) => island.add(tag(b, 'ball', 'Dragon Ball')));
  hunt.reset(found);
  const shenron = createShenron();
  arena.group.add(shenron.group);
  tag(shenron.head, 'wish', 'Make a wish: open my resume');
  const summon = { phase: found.every(Boolean) ? 'rise' : 'none', k: 0, t: 0 };
  const ballTarget = new THREE.Vector3();
  const collectBall = (i) => {
    if (!Number.isInteger(i) || found[i] || summon.phase !== 'none' || !hunt.collect(i)) return;
    found[i] = true;
    saveBalls();
    const n = found.filter(Boolean).length;
    me.say(n === 7 ? 'All seven! Come forth, Shenron!' : `Dragon Ball ${n}/7!`, 2.5);
    onAction?.('ball', null, n);
    if (n === 7)
      setTimeout(() => {
        Object.assign(summon, { phase: 'rise', k: 0 });
        onAction?.('summon');
      }, 1800);
  };
  const stepSummon = (dt, t) => {
    if (summon.phase === 'rise') {
      summon.k = Math.min(1, summon.k + dt / 4);
      if (summon.k === 1) Object.assign(summon, { phase: 'wish', t: 0 });
    } else if (summon.phase === 'wish') {
      if ((summon.t += dt) > 45) summon.phase = 'leave';
    } else if (summon.phase === 'leave') {
      summon.k = Math.max(0, summon.k - dt / 3);
      if (summon.k === 0) {
        summon.phase = 'none';
        found.fill(false);
        saveBalls();
        hunt.reset(found);
      }
    }
    state.summonK = lerp(state.summonK, summon.phase === 'rise' || summon.phase === 'wish' ? 1 : 0, 1 - Math.exp(-dt * 1.5));
    shenron.update(dt, { t, k: summon.k });
  };

  // Flying Nimbus
  const nimbus = group();
  const nimbusMat = mat('#ffe27a', { emissive: '#ffc93c', emissiveIntensity: 0.35, roughness: 0.9 });
  [[0, 0, 0, 0.42], [0.42, 0.02, 0.05, 0.32], [-0.42, 0.02, -0.05, 0.32], [0.18, 0.1, -0.26, 0.28], [-0.18, 0.08, 0.26, 0.28], [-0.78, -0.02, 0.05, 0.2], [-1.02, -0.04, 0.08, 0.13]].forEach(([x, y, z, r]) => {
    const p = mesh(new THREE.IcosahedronGeometry(r, 1), nimbusMat, [x, y, z]);
    p.scale.y = 0.55;
    nimbus.add(p);
  });
  const ride = { phase: 'idle', t: 0, dur: 1, dest: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), mid: new THREE.Vector3(), park: new THREE.Vector3(ISLANDS[0].stop[0] + 0.9, 0.95, ISLANDS[0].stop[1]) };
  nimbus.position.copy(ride.park);
  island.add(tag(nimbus, 'nimbus', 'Ride Flying Nimbus'));
  const ridePos = new THREE.Vector3();
  const rideNext = new THREE.Vector3();
  const bezier = (u, out) => out.copy(ride.from).multiplyScalar((1 - u) ** 2).addScaledVector(ride.mid, 2 * u * (1 - u)).addScaledVector(ride.to, u * u);
  const startRide = () => {
    if (ride.phase !== 'idle' || view.mode !== 'orbit') return;
    const p = me.pos;
    ride.dest = (islandAt(p.x, p.z) + 1) % ISLANDS.length;
    Object.assign(ride, { phase: 'fetch', t: 0, dur: 0.9 });
    ride.from.copy(nimbus.position);
    ride.to.set(p.x, 0.48, p.z);
    ride.mid.lerpVectors(ride.from, ride.to, 0.5).setY(Math.max(ride.from.y, ride.to.y) + 1);
  };
  const stepRide = (dt, t, motion) => {
    if (ride.phase === 'idle') {
      ridePos.copy(ride.park);
      ridePos.y += Math.sin(t * 1.6) * 0.08 * motion;
      nimbus.position.lerp(ridePos, 1 - Math.exp(-dt * 3));
      nimbus.rotation.y += dt * 0.2 * motion;
      return;
    }
    ride.t = Math.min(1, ride.t + dt / ride.dur);
    const u = ride.t < 0.5 ? 2 * ride.t ** 2 : 1 - (-2 * ride.t + 2) ** 2 / 2;
    bezier(u, ridePos);
    bezier(Math.min(1, u + 0.02), rideNext);
    const moving = rideNext.distanceToSquared(ridePos) > 1e-6;
    const heading = Math.atan2(rideNext.x - ridePos.x, rideNext.z - ridePos.z);
    if (moving) nimbus.rotation.y = heading - Math.PI / 2;
    nimbus.position.copy(ridePos);
    if (ride.phase === 'fly') {
      me.root.position.set(ridePos.x, ridePos.y + 0.12, ridePos.z);
      if (moving) me.root.rotation.y = heading;
    }
    if (ride.t < 1) return;
    if (ride.phase === 'fetch') {
      me.mount();
      me.say('Nimbus!', 1.5);
      const [sx, sz] = ISLANDS[ride.dest].stop;
      Object.assign(ride, { phase: 'fly', t: 0 });
      ride.from.copy(nimbus.position);
      ride.to.set(sx, 0.48, sz);
      const d = ride.from.distanceTo(ride.to);
      ride.dur = 1.4 + d / 7;
      ride.mid.lerpVectors(ride.from, ride.to, 0.5).setY(3 + d * 0.15);
      return;
    }
    me.root.position.set(ride.to.x, 0.6, ride.to.z);
    me.dismount();
    ride.phase = 'idle';
    ride.park.set(ride.to.x + 0.9, 0.95, ride.to.z);
  };

  // Kamehameha impact
  const boomMat = new THREE.MeshBasicMaterial({ color: '#bdf0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const boom = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), boomMat);
  boom.visible = false;
  boom.raycast = () => {};
  scene.add(boom);
  let boomT = -1;
  let shake = 0;
  const shakeV = new THREE.Vector3();
  const stepBoom = (dt) => {
    if (boomT < 0) return;
    boomT += dt;
    const u = Math.min(1, boomT / 0.9);
    boom.visible = u < 1;
    boom.scale.setScalar(0.3 + (1 - (1 - u) ** 3) * 3.2);
    boomMat.opacity = (1 - u) * 0.9;
    if (u === 1) boomT = -1;
  };
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

  // Fireflies
  const flyGeo = new THREE.BufferGeometry();
  const flyBase = Float32Array.from({ length: 40 * 3 }, (_, i) => (i % 3 === 1 ? 0.9 + rand() * 1.8 : spread(11)));
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#ffe27a', size: 0.14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  island.add(flies);

  // Clouds
  const puff = smooth(new THREE.IcosahedronGeometry(1, 0));
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

  const spots = {
    projects: { root: board, face: boardFace, anchor: boardFace, halfW: 1.12, halfH: 0.78, regionAt: rowAt, hover: setBoardHover, item: (i) => boardItems[i] },
    about: aboutSheet,
    contact: contactSheet
  };
  const spotRow = (res) => (view.mode === 'focus' && res?.hit.object === view.spot?.face ? view.spot.regionAt(res.hit.uv) : -1);

  const setHover = (res, x, y) => {
    const o = res?.o ?? null;
    const row = spotRow(res);
    view.spot?.hover(row);
    if (o !== hovered) {
      hovered?.traverse((m) => m.userData.base && m.material.emissive.copy(m.userData.base));
      if (view.mode === 'orbit') o?.traverse((m) => m.userData.base && m.material.emissive.copy(m.userData.base).add(hoverAdd));
      hovered = view.mode === 'orbit' ? o : null;
    }
    const label = view.mode === 'orbit' ? o?.userData.label : row >= 0 ? `Open ${view.spot.item(row).label}` : null;
    canvas.style.cursor = label ? 'pointer' : '';
    onHover?.(label ?? null, x, y);
  };

  const tweenTo = (pos, tgt, dur, done) =>
    (view.tween = { fp: camera.position.clone(), tp: pos, ft: controls.target.clone(), tt: tgt, t0: performance.now(), dur: reducedMotion ? 1 : dur, done });

  const focusOn = (name) => {
    const spot = spots[name];
    if (!spot || view.mode === 'focusing' || view.mode === 'leaving' || view.spot === spot) return;
    if (view.intro) {
      view.tween = null;
      endIntro();
    }
    setHover(null);
    if (view.mode === 'orbit') {
      view.saved = { pos: camera.position.clone(), tgt: controls.target.clone() };
      Object.assign(controls, { enabled: false, autoRotate: false, minDistance: 0.1 });
    }
    view.mode = 'focusing';
    view.spot = spot;
    frameSpot(spot, 1400);
    onFocus?.(true, name);
  };

  const frameSpot = (spot, dur) => {
    view.tall = camera.aspect < 1;
    spot.layout?.(view.tall);
    island.updateMatrixWorld(true);
    const c = spot.anchor.getWorldPosition(new THREE.Vector3());
    c.y -= island.position.y;
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(spot.anchor.getWorldQuaternion(new THREE.Quaternion()));
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const chrome = innerHeight / Math.max(1, innerHeight - (innerWidth < 700 ? 150 : 110));
    const dist = Math.max((spot.halfH * chrome) / half, spot.halfW / (half * camera.aspect));
    tweenTo(c.clone().addScaledVector(n, dist), c, dur, () => view.mode !== 'leaving' && (view.mode = 'focus'));
  };

  const unfocus = () => {
    if (view.mode !== 'focus' && view.mode !== 'focusing') return;
    setHover(null);
    view.mode = 'leaving';
    tweenTo(view.saved.pos, view.saved.tgt, 1200, () => {
      view.mode = 'orbit';
      view.spot = null;
      Object.assign(controls, { enabled: true, minDistance: 12 });
      idleAt = performance.now() + 8000;
    });
    onFocus?.(false);
  };

  const openItem = (it) => (it.focus ? focusOn(it.focus) : onAction?.('open', null, it.url));

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
      const row = spotRow(res);
      if (row >= 0) openItem(view.spot.item(row));
      else if (res?.o !== view.spot.root) unfocus();
      return;
    }
    if (!res) return;
    const { o } = res;
    trigger(o.userData.action, o);
  });

  const trigger = (action, o) => {
    if (action === 'projects') return focusOn('projects');
    if (action === 'about' || action === 'stack') {
      doors.pulse = 2.5;
      return focusOn('about');
    }
    if (action === 'contact') {
      doors.flag = 3;
      return focusOn('contact');
    }
    if (action === 'ball') return collectBall(o?.userData.index);
    if (action === 'nimbus') return startRide();
    if (action === 'link') return onAction?.('open', o, o.userData.url);
    if (action === 'wish') {
      if (summon.phase !== 'wish') return;
      summon.phase = 'leave';
      me.say('Your wish is granted!', 3);
      return onAction?.('open', o, RESUME_URL);
    }
    if (o) o.userData.pop = 1;
    if (action === 'cloud') burst(o);
    if (action === 'lamp') state.lamp = !(state.lamp ?? state.sky.night > 0.5);
    if (action === 'windmill') state.spin = 12;
    if (action === 'me') me.wave();
    if (action === 'croc') props.snap();
    if (action === 'temple') ringBell();
    if (action === 'saiyan' && !me.blast() && me.power < 0.6) me.say('Walk me onto the platform to power up!', 3);
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
  const panFix = new THREE.Vector3();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 1 || e.button === 2 || e.ctrlKey || e.metaKey || e.shiftKey) view.panned = true;
  });
  canvas.addEventListener('touchstart', (e) => e.touches.length > 1 && (view.panned = true), { passive: true });

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

  const perf = { low: lowPower, last: 0 };

  const loop = () => {
    if (perf.low) {
      const now = performance.now();
      if (now - perf.last < 30) return;
      perf.last = now;
    }
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
      c.lerp(white, state.flash * 0.5).multiplyScalar(1 - 0.75 * state.summonK);
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
    sunLight.intensity = ease(-2, 8, s.sunAlt) * 2.4 * (1 - overcast * 0.65) * (1 - 0.7 * state.summonK);
    sunLight.color.lerpColors(sunsetSun, noonSun, ease(0, 30, s.sunAlt));

    moon.position.set(s.moonDir.x, s.moonDir.y, s.moonDir.z).multiplyScalar(ORBIT_R);
    moon.visible = s.moonAlt > -4;
    moon.children.forEach((m) => (m.material.opacity = 1 - overcast * 0.75));
    moonLight.position.copy(moon.position).multiplyScalar(0.4);
    moonLight.intensity = moon.visible ? s.night * 0.6 * (0.3 + s.fraction * 0.7) * (1 - overcast * 0.6) : 0;

    hemi.color.copy(top).lerp(white, 0.3);
    hemi.groundColor.set('#4a3b2a');
    hemi.intensity = lerp(0.35, 1.1, s.day) * (1 - cur.storm * 0.3) * (1 - 0.5 * state.summonK) + state.flash * 3;

    const lit = state.lamp ?? s.night > 0.5;
    lampLight.intensity = lerp(lampLight.intensity, lit ? 8 : 0, 1 - Math.exp(-dt * 6));
    bulbMat.emissiveIntensity = lampLight.intensity / 4;
    windowMat.emissiveIntensity = s.night * 1.4;
    lanternMat.emissiveIntensity = s.night * 1.6;

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

    doors.flag = Math.max(0, doors.flag - dt);
    doors.pulse = Math.max(0, doors.pulse - dt);
    const k6 = 1 - Math.exp(-dt * 6);
    doorPivot.rotation.y = lerp(doorPivot.rotation.y, doors.open || doors.pulse > 0 ? -1.3 : 0, k6);
    flag.rotation.x = lerp(flag.rotation.x, doors.flag > 0 ? 0 : -Math.PI / 2, k6);
    steer();
    me.update(dt, { t, motion, rain: cur.rain, snow: cur.snow, temp: state.temp, cam: camera.position });
    checkNear();
    skills.update(dt, { t, motion, target: me.root.getWorldPosition(meWorld) });
    stepRide(dt, t, motion);
    stepBoom(dt);
    growLeaves(dt);
    ballTarget.copy(me.root.position).setY(me.root.position.y + 1.6);
    hunt.update(dt, { t, motion, target: ballTarget });
    hunt.balls.forEach((b, i) => b.visible && b.userData.fly < 0 && Math.hypot(b.userData.home.x - me.pos.x, b.userData.home.z - me.pos.z) < 0.6 && collectBall(i));
    stepSummon(dt, t);
    arena.update(dt, { t, motion, power: me.power, found, summon: state.summonK });
    aboutSheet.update(dt, view.spot === aboutSheet && view.mode !== 'leaving');
    contactSheet.update(dt, view.spot === contactSheet && view.mode !== 'leaving');
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
    if (view.mode === 'orbit' && !view.intro && !view.tween && !view.panned) controls.target.lerp(HOME, 1 - Math.exp(-dt * 2));
    if (view.mode === 'orbit' && !controls.autoRotate && !reducedMotion && performance.now() > idleAt) {
      controls.autoRotate = true;
      view.panned = false;
    }
    const off = Math.hypot(controls.target.x, controls.target.z);
    if (off > PAN_R) {
      panFix.set(controls.target.x, 0, controls.target.z).multiplyScalar(PAN_R / off - 1);
      controls.target.add(panFix);
      camera.position.add(panFix);
    }
    controls.update(dt);
    if (shake > 0) {
      shakeV.set(spread(1), spread(1), spread(1)).multiplyScalar(shake * 0.25);
      camera.position.add(shakeV);
      renderer.render(scene, camera);
      camera.position.sub(shakeV);
      shake = Math.max(0, shake - dt);
    } else renderer.render(scene, camera);
  };

  const setLowPower = (on) => {
    perf.low = on;
    renderer.setPixelRatio(Math.min(devicePixelRatio, on ? 1 : 1.75));
    sunLight.castShadow = !on;
    sunLight.shadow.mapSize.setScalar(on ? 1024 : 2048);
    sunLight.shadow.map?.dispose();
    sunLight.shadow.map = null;
    flies.visible = !on;
    resize();
  };

  const snapshot = (w = 1200, h = 630) =>
    new Promise((resolve, reject) => {
      const ratio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      renderer.domElement.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Snapshot failed'))), 'image/png');
      renderer.setPixelRatio(ratio);
      resize();
    });

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (view.mode === 'focus' && view.spot && view.tall !== camera.aspect < 1) {
      view.spot.hover(-1);
      view.mode = 'focusing';
      frameSpot(view.spot, 500);
    }
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
    const far = innerWidth < 700 ? 36 : 27;
    const end = new THREE.Vector3(far * 0.62, far * 0.38, far * 0.78);
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
        tweenTo(end, HOME, 2800, endIntro);
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
    setTempLabel(main, sub, wind) {
      tempTex.userData.redraw(main, sub, wind);
    },
    focus: focusOn,
    unfocus,
    setLowPower,
    snapshot,
    interact: () => near && trigger(near.action, null),
    focused: () => view.mode !== 'orbit',
    sky: () => ({ ...state.sky }),
    lampOn: () => state.lamp ?? state.sky.night > 0.5
  };
}
