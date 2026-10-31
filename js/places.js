import * as THREE from 'three';
import { mat, mesh, group, canvasTexture, rand, spread } from './kit.js';

const { lerp, clamp } = THREE.MathUtils;
const PINK = '#e8967a';
const LIME = '#fbf1dc';
const noPick = () => {};

const sign = (w, h, draw) => {
  const tex = canvasTexture(w, h, draw);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
};

const between = (a, b, r, m) => {
  const dir = new THREE.Vector3().subVectors(b, a);
  const c = mesh(new THREE.CylinderGeometry(r * 0.8, r, dir.length(), 8), m);
  c.position.copy(a).addScaledVector(dir, 0.5);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return c;
};

// Hometown corner (Jaipur). Local +x faces the bridge from home.
export const HOMETOWN = {
  banyan: [-2.2, -1.4],
  pivot: [-0.85, -0.45],
  pivotY: 3.1,
  rope: 2.0,
  stall: [0.7, -2.7],
  house: [-1.9, 1.75],
  auto: [0.9, 2.5],
  autoScale: 1.25,
  autoLoop: [[0.9, 2.5], [2.6, 1.6], [2.75, 0.6], [3.9, 0.0], [3.9, -1.3], [3.3, -2.6], [1.9, -3.7], [0.2, -4.0], [-1.2, -3.6], [-2.9, -2.9], [-3.9, -1.0], [-3.9, 0.8], [-3.3, 2.5], [-1.9, 3.7], [-0.4, 3.7]],
  cow: [2.4, -1.6],
  gate: [3.45, 0]
};
HOMETOWN.obstacles = [
  [...HOMETOWN.banyan, 0.7],
  [...HOMETOWN.stall, 0.85],
  [...HOMETOWN.house, 1.05],
  [...HOMETOWN.auto, 0.95],
  [...HOMETOWN.cow, 0.5],
  [HOMETOWN.gate[0], 0.95, 0.18],
  [HOMETOWN.gate[0], -0.95, 0.18]
];

const sideExtrude = (pts, width, m, bevel = 0.035) => {
  const shape = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const depth = width - bevel * 2;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(-Math.PI / 2);
  return mesh(geo, m);
};

const plateTexture = () =>
  canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1b1d21';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#1b1d21';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 40px "JetBrains Mono", monospace';
    ctx.fillText('RJ14 PA 2026', w / 2, h / 2 + 2);
  });

// Bajaj-style auto-rickshaw. Front is +z, ground is y = 0.
const buildAuto = () => {
  const g = group();
  const body = group();
  g.add(body);
  const green = mat('#1f8a4c', { roughness: 0.35, metalness: 0.15 });
  const yellow = mat('#ffcc1f', { roughness: 0.55 });
  const black = mat('#1b1d21', { roughness: 0.7 });
  const seatMat = mat('#2b2f36', { roughness: 0.6 });
  const chrome = mat('#d4d9e0', { metalness: 0.9, roughness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: 0.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: '#7a1010', emissive: '#ff2a2a', emissiveIntensity: 0.3 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ff9f1c', emissive: '#ff8c00', emissiveIntensity: 0.2 });

  body.add(sideExtrude([[-0.74, 0.3], [0.05, 0.3], [0.05, 0.56], [-0.55, 0.56], [-0.6, 0.8], [-0.74, 0.8]], 1.0, green));
  body.add(sideExtrude([[0.05, 0.3], [0.62, 0.3], [0.86, 0.45], [0.9, 0.62], [0.64, 1.0], [0.42, 1.02], [0.36, 0.62], [0.05, 0.62]], 0.66, green));
  body.add(mesh(new THREE.BoxGeometry(1.04, 0.05, 1.5), black, [0, 0.3, -0.05]));

  const roof = new THREE.Shape();
  roof.moveTo(0.48, 1.36);
  roof.lineTo(0.5, 1.44);
  roof.quadraticCurveTo(0.1, 1.64, -0.55, 1.57);
  roof.quadraticCurveTo(-0.8, 1.5, -0.8, 1.2);
  roof.lineTo(-0.8, 0.84);
  roof.lineTo(-0.74, 0.84);
  roof.lineTo(-0.74, 1.2);
  roof.quadraticCurveTo(-0.74, 1.46, -0.53, 1.5);
  roof.quadraticCurveTo(0.08, 1.56, 0.44, 1.37);
  roof.closePath();
  body.add(sideExtrude(roof, 1.06, yellow, 0.025));
  [-0.47, 0.47].forEach((x) => {
    body.add(between(new THREE.Vector3(x, 0.58, 0.0), new THREE.Vector3(x, 1.52, 0.0), 0.022, black));
    body.add(between(new THREE.Vector3(x * 0.68, 1.0, 0.44), new THREE.Vector3(x, 1.4, 0.46), 0.02, black));
  });

  const shield = mesh(new THREE.BoxGeometry(0.62, 0.36, 0.02), glass, [0, 1.19, 0.45]);
  shield.rotation.x = -0.15;
  shield.castShadow = false;
  body.add(shield);
  body.add(mesh(new THREE.BoxGeometry(0.66, 0.03, 0.04), black, [0, 1.37, 0.47]));
  const wiper = mesh(new THREE.BoxGeometry(0.28, 0.012, 0.012), black, [0.06, 1.05, 0.47]);
  wiper.rotation.z = 0.35;
  body.add(wiper);
  [-1, 1].forEach((s) => {
    body.add(between(new THREE.Vector3(s * 0.31, 1.15, 0.46), new THREE.Vector3(s * 0.46, 1.22, 0.52), 0.01, black));
    body.add(mesh(new THREE.BoxGeometry(0.03, 0.1, 0.07), chrome, [s * 0.48, 1.24, 0.53]));
  });

  body.add(mesh(new THREE.BoxGeometry(0.3, 0.12, 0.26), seatMat, [0, 0.67, 0.14]));
  body.add(mesh(new THREE.BoxGeometry(0.42, 0.09, 0.32), seatMat, [0, 0.74, 0.14]));
  body.add(mesh(new THREE.BoxGeometry(0.92, 0.12, 0.36), seatMat, [0, 0.7, -0.42]));
  body.add(mesh(new THREE.BoxGeometry(0.92, 0.36, 0.08), seatMat, [0, 0.95, -0.64]));
  body.add(between(new THREE.Vector3(0, 0.95, 0.44), new THREE.Vector3(0, 1.03, 0.37), 0.018, chrome));
  const bar = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.54, 10), chrome, [0, 1.03, 0.37]);
  bar.rotation.z = Math.PI / 2;
  body.add(bar);
  [-0.24, 0.24].forEach((x) => {
    const grip = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10), black, [x, 1.03, 0.37]);
    grip.rotation.z = Math.PI / 2;
    body.add(grip);
  });
  const meter = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#0b1a2a', emissive: '#7fd1ff', emissiveIntensity: 0.4 }), [0, 1.04, 0.47]);
  meter.rotation.x = Math.PI / 2 - 0.4;
  body.add(meter);

  const rim = mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 20), chrome, [0, 0.76, 0.86]);
  body.add(rim);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), headMat);
  lens.position.set(0, 0.76, 0.865);
  body.add(lens);
  [-0.24, 0.24].forEach((x) => body.add(mesh(new THREE.BoxGeometry(0.07, 0.045, 0.03), amber, [x, 0.66, 0.82])));
  body.add(mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 18, Math.PI), green, [0, 0.2, 0.66]));
  body.children.at(-1).rotation.y = Math.PI / 2;

  [-0.36, 0.36].forEach((x) => body.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), tailMat, [x, 0.62, -0.78])));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.6 }));
  plate.position.set(0, 0.44, -0.79);
  plate.rotation.y = Math.PI;
  body.add(plate);

  const fringeCols = ['#e63946', '#ffd23f', '#2a9d8f'];
  for (let i = 0; i < 9; i++) {
    const f = mesh(new THREE.ConeGeometry(0.025, 0.07, 4), mat(fringeCols[i % 3]), [-0.4 + i * 0.1, 1.33, 0.49]);
    f.rotation.x = Math.PI;
    f.castShadow = false;
    body.add(f);
  }
  const charm = group(0, 0.5, 0.9);
  charm.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4), black, [0, -0.06, 0]));
  charm.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), mat('#f2d24b'), [0, -0.13, 0]));
  [-0.02, 0, 0.02].forEach((x, i) => {
    const chili = mesh(new THREE.ConeGeometry(0.009, 0.08, 6), mat('#2f8f3a'), [x, -0.2 - i * 0.01, 0]);
    chili.rotation.x = Math.PI;
    charm.add(chili);
  });
  body.add(charm);

  const tyreGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.13, 20);
  const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.14, 14);
  const wheels = [[0, 0.66], [-0.52, -0.45], [0.52, -0.45]].map(([x, z]) => {
    const w = group(x, 0.2, z);
    const t = mesh(tyreGeo, black);
    t.rotation.z = Math.PI / 2;
    const h = mesh(hubGeo, chrome);
    h.rotation.z = Math.PI / 2;
    w.add(t, h, mesh(new THREE.BoxGeometry(0.15, 0.05, 0.16), chrome));
    g.add(w);
    return w;
  });
  [-0.52, 0.52].forEach((x) => {
    const guard = mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 18, Math.PI), black, [x, 0.2, -0.45]);
    guard.rotation.y = Math.PI / 2;
    body.add(guard);
  });

  return { g, body, wheels, headMat, tailMat, amber, seatTop: new THREE.Vector3(0, 0.79, 0.14) };
};

export function createHometown() {
  const g = group();
  const leafMats = [mat('#2f7d3a'), mat('#3d8f45')];
  const bark = mat('#6b4a2f');
  const pink = mat(PINK, { roughness: 0.85 });
  const lime = mat(LIME, { roughness: 0.7 });
  const dark = mat('#2c3a4f', { emissive: '#ffc96b', emissiveIntensity: 0 });

  g.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.04, 40), mat('#d9c3a0', { roughness: 0.95 }), [0, 0.02, 0]));

  // Banyan with aerial roots
  const [bx, bz] = HOMETOWN.banyan;
  const tree = group(bx, 0, bz);
  tree.add(mesh(new THREE.CylinderGeometry(0.38, 0.6, 2.9, 12), bark, [0, 1.45, 0]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    tree.add(between(new THREE.Vector3(Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.3), new THREE.Vector3(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8), 0.12, bark));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    tree.add(between(new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(Math.cos(a) * 1.5, 3.1, Math.sin(a) * 1.5), 0.13, bark));
  }
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * 1.9;
    const leaf = mesh(new THREE.IcosahedronGeometry(0.75 + rand() * 0.4, 1), leafMats[i % 2], [Math.cos(a) * d, 3.2 + rand() * 0.7, Math.sin(a) * d]);
    leaf.scale.y = 0.6;
    tree.add(leaf);
  }
  const rootMat = mat('#7a5a3a');
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = 1.1 + rand() * 0.9;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(bx + x - HOMETOWN.pivot[0], bz + z - HOMETOWN.pivot[1]) < 1.6) continue;
    tree.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 2.8, 5), rootMat, [x, 1.5, z]));
  }
  g.add(tree);

  // Swing on a branch
  const [px, pz] = HOMETOWN.pivot;
  const top = new THREE.Vector3(px, HOMETOWN.pivotY + 0.05, pz);
  g.add(between(new THREE.Vector3(bx, 2.8, bz), top.clone().add(new THREE.Vector3(px - bx, 0, pz - bz).setLength(0.4)), 0.11, bark));
  const swing = group(px, HOMETOWN.pivotY, pz);
  swing.rotation.y = Math.atan2(px - bx, pz - bz) + Math.PI / 2;
  const arm = group();
  const ropeMat = mat('#d8c39a');
  [-0.24, 0.24].forEach((x) => arm.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, HOMETOWN.rope, 5), ropeMat, [x, -HOMETOWN.rope / 2, 0])));
  arm.add(mesh(new THREE.BoxGeometry(0.62, 0.06, 0.28), mat('#8b5a2b'), [0, -HOMETOWN.rope, 0]));
  swing.add(arm);
  g.add(swing);
  const swingSt = { amp: 0.08, phase: 0 };

  // Chai stall
  const [sx, sz] = HOMETOWN.stall;
  const stall = group(sx, 0, sz);
  stall.rotation.y = Math.atan2(-sx, -sz);
  const wood = mat('#8b5a2b');
  stall.add(mesh(new THREE.BoxGeometry(1.3, 0.7, 0.6), wood, [0, 0.55, 0]));
  stall.add(mesh(new THREE.BoxGeometry(1.42, 0.06, 0.72), mat('#d9c3a0'), [0, 0.93, 0]));
  [-0.55, 0.55].forEach((x) => {
    const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), mat('#2b2f36'), [x, 0.2, 0.33]);
    w.rotation.x = Math.PI / 2;
    stall.add(w);
  });
  [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(([x, z]) => stall.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), wood, [x, 1.42, z])));
  const roof = mesh(new THREE.BoxGeometry(1.7, 0.04, 1.0), mat('#9aa3ab', { metalness: 0.5, roughness: 0.5 }), [0, 1.95, 0.05]);
  roof.rotation.x = 0.12;
  stall.add(roof);
  const chaiSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.32),
    sign(256, 82, (ctx, w, h) => {
      ctx.fillStyle = '#b3261e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd23f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 40px Outfit, sans-serif';
      ctx.fillText('CHAI ₹10', w / 2, h / 2 + 2);
    })
  );
  chaiSign.position.set(0, 1.72, 0.47);
  stall.add(chaiSign);
  stall.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.26), mat('#1f2328'), [-0.35, 1.01, 0]));
  const kettle = group(-0.35, 1.06, 0);
  kettle.add(mesh(new THREE.SphereGeometry(0.11, 16, 10), mat('#c9ced8', { metalness: 0.8, roughness: 0.25 }), [0, 0.09, 0]));
  const spout = mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.14, 8), mat('#c9ced8', { metalness: 0.8 }), [0.12, 0.12, 0]);
  spout.rotation.z = -0.9;
  kettle.add(spout);
  stall.add(kettle);
  const cupMat = mat('#f2e6c9', { roughness: 0.3 });
  [0.05, 0.2, 0.35, 0.5].forEach((x) => stall.add(mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.08, 10), cupMat, [x, 1.0, 0.12])));
  [-0.4, 0.4].forEach((x) => stall.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 12), mat('#2f7f8f'), [x, 0.22, 0.85])));
  g.add(stall);
  const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  const steam = Array.from({ length: 6 }, (_, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), steamMat.clone());
    s.userData = { life: i / 6 };
    s.raycast = noPick;
    stall.add(s);
    return s;
  });
  let steamBoost = 0;

  // Pink rooftop house with kites
  const [hx, hz] = HOMETOWN.house;
  const house = group(hx, 0, hz);
  house.rotation.y = Math.atan2(-hx, -hz);
  house.add(mesh(new THREE.BoxGeometry(1.6, 2.3, 1.4), pink, [0, 1.15, 0]));
  [0.95, 2.0].forEach((y) => house.add(mesh(new THREE.BoxGeometry(1.66, 0.07, 1.46), lime, [0, y, 0])));
  house.add(mesh(new THREE.BoxGeometry(0.4, 0.75, 0.04), mat('#6b3a1c'), [0, 0.38, 0.71]));
  [-0.45, 0.45].forEach((x) => {
    house.add(mesh(new THREE.BoxGeometry(0.3, 0.42, 0.04), dark, [x, 1.45, 0.71]));
    const ar = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16, Math.PI), lime, [x, 1.66, 0.72]);
    house.add(ar);
  });
  for (let x = -0.7; x <= 0.71; x += 0.28) [0.68, -0.68].forEach((z) => house.add(mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), lime, [x, 2.38, z])));
  house.add(mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), pink, [-0.45, 2.52, -0.35]));
  house.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 14), mat('#1f2328'), [0.45, 2.46, -0.4]));
  g.add(house);

  const kiteColors = ['#e63946', '#ffd23f', '#2a9d8f'];
  const kites = kiteColors.map((color, i) => {
    const k = group();
    const shape = new THREE.Shape([new THREE.Vector2(0, 0.26), new THREE.Vector2(0.2, 0), new THREE.Vector2(0, -0.3), new THREE.Vector2(-0.2, 0)]);
    k.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.6 })));
    k.add(mesh(new THREE.BoxGeometry(0.4, 0.008, 0.008), mat('#6b4a2f')));
    for (let j = 0; j < 4; j++) k.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.005), mat(kiteColors[(i + j + 1) % 3]), [0, -0.36 - j * 0.1, 0]));
    const base = new THREE.Vector3(spread(2.6), 5 + i * 0.9, spread(2.2));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: 0.6 }));
    line.raycast = noPick;
    house.add(k, line);
    k.userData = { base, line, cut: -1, seed: rand() * 6, index: i };
    return k;
  });
  const anchor = new THREE.Vector3(0.2, 2.45, 0.2);

  // Auto-rickshaw on a loop around the square
  const autoModel = buildAuto();
  const auto = autoModel.g;
  auto.scale.setScalar(HOMETOWN.autoScale);
  const autoLight = autoModel.headMat;
  const loop = new THREE.CatmullRomCurve3(HOMETOWN.autoLoop.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const loopLen = loop.getLength();
  const lp = new THREE.Vector3();
  const lt = new THREE.Vector3();
  loop.getPointAt(0, lp);
  loop.getTangentAt(0, lt);
  auto.position.copy(lp);
  auto.rotation.y = Math.atan2(lt.x, lt.z);
  g.add(auto);
  const ride = { on: false, t: 0, dur: loopLen / 3.2 };
  let hop = 0;

  // Cow resting in the square
  const [cx, cz] = HOMETOWN.cow;
  const cow = group(cx, 0, cz);
  cow.rotation.y = 2.2;
  const hide = mat('#f4f1ea');
  const cowBody = mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), hide, [0, 0.28, 0]);
  cowBody.rotation.x = Math.PI / 2;
  cow.add(cowBody);
  cow.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), hide, [0, 0.48, -0.08]));
  const cowHead = group(0, 0.4, 0.48);
  cowHead.add(mesh(new THREE.BoxGeometry(0.18, 0.2, 0.26), hide));
  cowHead.add(mesh(new THREE.BoxGeometry(0.14, 0.09, 0.08), mat('#e8b4a0'), [0, -0.05, 0.15]));
  [1, -1].forEach((s) => {
    const horn = mesh(new THREE.ConeGeometry(0.025, 0.14, 6), mat('#c9a27a'), [s * 0.08, 0.14, -0.04]);
    horn.rotation.z = -s * 0.5;
    cowHead.add(horn);
    cowHead.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), mat('#1d1714'), [s * 0.07, 0.03, 0.12]));
  });
  cow.add(cowHead);
  [[-0.12, 0.25], [0.12, 0.25], [-0.12, -0.25], [0.12, -0.25]].forEach(([x, z]) => {
    const leg = mesh(new THREE.CapsuleGeometry(0.04, 0.12, 2, 6), hide, [x, 0.08, z]);
    leg.rotation.x = Math.PI / 2;
    cow.add(leg);
  });
  g.add(cow);

  // Jaipur gate facing the bridge
  const gate = group(HOMETOWN.gate[0], 0, HOMETOWN.gate[1]);
  gate.rotation.y = Math.PI / 2;
  [-0.95, 0.95].forEach((x) => {
    gate.add(mesh(new THREE.BoxGeometry(0.32, 2.4, 0.32), pink, [x, 1.2, 0]));
    gate.add(mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lime, [x, 2.65, 0]));
  });
  gate.add(mesh(new THREE.BoxGeometry(2.3, 0.42, 0.36), pink, [0, 2.45, 0]));
  const gateSign = sign(512, 128, (ctx, w, h) => {
    ctx.fillStyle = LIME;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b5541c';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#b5541c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px Outfit, sans-serif';
    ctx.fillText('JAIPUR', w / 2, h / 2 + 4);
  });
  [0.185, -0.185].forEach((z, i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), gateSign);
    p.position.set(0, 2.45, z);
    p.rotation.y = i ? Math.PI : 0;
    gate.add(p);
  });
  g.add(gate);

  const potMat = mat('#b5552b');
  [[1.6, 1.3], [1.6, -1.3], [-0.4, 1.6]].forEach(([x, z], i) => {
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.26, 12), potMat, [x, 0.13, z]));
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), mat(i % 2 ? '#ff9f1c' : '#ffd23f'), [x + spread(0.18), 0.3 + rand() * 0.06, z + spread(0.18)]));
  });

  const seatV = new THREE.Vector3();
  return {
    group: g,
    leafMats,
    lights: [dark, autoLight, autoModel.tailMat],
    swing,
    swingFacing: swing.rotation.y,
    stall,
    auto,
    kites,
    seat: (out) => arm.localToWorld(out.set(0, -HOMETOWN.rope + 0.03, 0)),
    pushSwing(a) {
      swingSt.amp = Math.max(swingSt.amp, a);
    },
    chai() {
      steamBoost = 2.5;
    },
    honk() {
      hop = 1;
    },
    startAutoRide() {
      if (ride.on) return false;
      Object.assign(ride, { on: true, t: 0 });
      hop = 0.6;
      return true;
    },
    get autoDriving() {
      return ride.on;
    },
    autoSeat: (out) => autoModel.body.localToWorld(out.copy(autoModel.seatTop)),
    get autoYaw() {
      return auto.rotation.y;
    },
    cutKite(i) {
      const k = kites[i];
      if (k && k.userData.cut < 0) k.userData.cut = 0;
    },
    update(dt, { t, motion, riding }) {
      swingSt.phase += dt * 2.2;
      if (!riding) swingSt.amp = Math.max(0.06, swingSt.amp * Math.exp(-dt * 0.35));
      arm.rotation.x = Math.sin(swingSt.phase) * swingSt.amp * (motion > 0.5 ? 1 : 0.3);

      steamBoost = Math.max(0, steamBoost - dt);
      steam.forEach((s) => {
        const d = s.userData;
        d.life = (d.life + dt * (0.35 + steamBoost * 0.4)) % 1;
        s.position.set(-0.35 + 0.12 + Math.sin(d.life * 6 + t) * 0.04, 1.25 + d.life * 0.6, 0);
        s.scale.setScalar(0.6 + d.life * 1.4 + steamBoost * 0.3);
        s.material.opacity = (1 - d.life) * (0.25 + steamBoost * 0.2);
      });

      kites.forEach((k) => {
        const d = k.userData;
        const pos = seatV.copy(d.base);
        pos.x += Math.sin(t * 0.7 + d.seed) * 0.5 * motion;
        pos.y += Math.sin(t * 1.1 + d.seed) * 0.25 * motion;
        if (d.cut >= 0) {
          d.cut += dt;
          pos.x += d.cut * 1.6;
          pos.y += d.cut * 1.2;
          k.rotation.z = d.cut * 3;
          d.line.visible = false;
          k.visible = d.cut < 6;
          if (d.cut > 10) {
            d.cut = -1;
            k.visible = true;
            d.line.visible = true;
          }
        } else k.rotation.z = Math.sin(t * 1.7 + d.seed) * 0.3 * motion;
        k.position.copy(pos);
        const p = d.line.geometry.attributes.position;
        p.setXYZ(0, anchor.x, anchor.y, anchor.z);
        p.setXYZ(1, (anchor.x + pos.x) / 2, (anchor.y + pos.y) / 2 - 0.6, (anchor.z + pos.z) / 2);
        p.setXYZ(2, pos.x, pos.y - 0.25, pos.z);
        p.needsUpdate = true;
      });

      hop = Math.max(0, hop - dt * 1.6);
      const running = ride.on || hop > 0;
      if (ride.on) {
        ride.t = Math.min(1, ride.t + dt / ride.dur);
        const u = ride.t < 0.5 ? 2 * ride.t ** 2 : 1 - (-2 * ride.t + 2) ** 2 / 2;
        const before = auto.position.clone();
        loop.getPointAt(u % 1, lp);
        loop.getTangentAt(u % 1, lt);
        auto.position.x = lp.x;
        auto.position.z = lp.z;
        const yaw = Math.atan2(lt.x, lt.z);
        let d = (yaw - auto.rotation.y) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        auto.rotation.y += d * (1 - Math.exp(-dt * 8));
        autoModel.body.rotation.z = clamp(-d * 0.6, -0.12, 0.12);
        const rolled = Math.hypot(auto.position.x - before.x, auto.position.z - before.z) / HOMETOWN.autoScale;
        autoModel.wheels.forEach((w) => (w.rotation.x += rolled / 0.2));
        if (ride.t >= 1) {
          ride.on = false;
          autoModel.body.rotation.z = 0;
        }
      }
      auto.position.y = Math.abs(Math.sin(hop * Math.PI * 3)) * 0.08 * hop;
      autoModel.body.position.y = running ? Math.sin(t * 38) * 0.006 * motion : 0;
      autoLight.emissiveIntensity = 0.3 + (hop > 0 ? (Math.sin(t * 30) > 0 ? 2 : 0.3) : 0) + (ride.on ? 1.2 : 0);
      autoModel.amber.emissiveIntensity = ride.on && Math.sin(t * 9) > 0 ? 1.5 : 0.2;
      cowHead.rotation.y = Math.sin(t * 0.4) * 0.4 * motion;
    }
  };
}

// Cricket ground. The pitch runs along local x; the batter faces -x.
export const CRICKET = { bat: [2.45, 0], machine: [-3.35, 0], stumpX: 2.78, boundary: 4.55 };
CRICKET.obstacles = [[...CRICKET.machine, 0.45], [-0.6, -4.05, 0.6], [0.6, -4.05, 0.6], [-4.3, 0, 0.3]];

export function createCricket({ onCall, onSound, onEnd }) {
  const g = group();
  const stripes = canvasTexture(256, 256, (ctx, w) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#5fae4e' : '#69bb57';
      ctx.fillRect((i * w) / 8, 0, w / 8 + 1, w);
    }
  });
  const field = new THREE.Mesh(new THREE.CircleGeometry(4.95, 48), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95 }));
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.006;
  field.receiveShadow = true;
  g.add(field);
  const rope = mesh(new THREE.TorusGeometry(CRICKET.boundary, 0.035, 6, 96), mat('#f4f1ea'), [0, 0.04, 0]);
  rope.rotation.x = Math.PI / 2;
  g.add(rope);
  g.add(mesh(new THREE.BoxGeometry(6.0, 0.02, 0.62), mat('#d8c39a', { roughness: 0.95 }), [0, 0.012, 0]));
  const white = mat('#f7f5f0');
  [-2.5, 2.5, -2.78, 2.78].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.02, 0.006, 0.9), white, [x, 0.025, 0])));

  const stumpMat = mat('#f1e3c2', { roughness: 0.6 });
  const bails = [];
  [-CRICKET.stumpX, CRICKET.stumpX].forEach((x) => {
    [-0.06, 0, 0.06].forEach((z) => g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), stumpMat, [x, 0.225, z])));
    [-0.03, 0.03].forEach((z) => {
      const b = mesh(new THREE.BoxGeometry(0.02, 0.02, 0.07), stumpMat, [x, 0.46, z]);
      g.add(b);
      if (x > 0) bails.push({ b, home: b.position.clone(), vel: new THREE.Vector3(), flying: false });
    });
  });

  const [mx] = CRICKET.machine;
  const machine = group(mx, 0, 0);
  machine.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat('#3a5a8c', { metalness: 0.3, roughness: 0.5 }), [0, 0.35, 0]));
  const tube = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 12), mat('#c9ced8', { metalness: 0.7, roughness: 0.3 }), [0.25, 0.8, 0]);
  tube.rotation.z = -1.2;
  machine.add(tube);
  [-0.22, 0.22].forEach((z) => {
    const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), mat('#1b1d21'), [0, 0.1, z]);
    w.rotation.x = Math.PI / 2;
    machine.add(w);
  });
  g.add(machine);
  g.add(mesh(new THREE.BoxGeometry(0.08, 1.2, 1.6), white, [-4.3, 0.6, 0]));

  const pav = group(0, 0, -4.05);
  pav.add(mesh(new THREE.BoxGeometry(2.2, 1.1, 0.9), mat('#f3ead7'), [0, 0.55, 0]));
  const pavRoof = mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), mat('#b5462e'), [0, 1.2, 0.05]);
  pavRoof.rotation.x = -0.12;
  pav.add(pavRoof);
  const board = { runs: 0, wkts: 0, balls: 0 };
  const boardTex = canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#12301e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f4f1ea';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f4f1ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 30px Outfit, sans-serif';
    ctx.fillText('RUNS   WKTS   BALLS', w / 2, 46);
    ctx.font = '700 70px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${String(board.runs).padStart(2, '0')}   ${board.wkts}   ${board.balls}/6`, w / 2, 124);
  });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.56), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }));
  boardMesh.position.set(0, 0.62, 0.46);
  pav.add(boardMesh);
  g.add(pav);

  const ball = mesh(new THREE.SphereGeometry(0.06, 14, 10), mat('#b3132a', { roughness: 0.4 }));
  ball.visible = false;
  g.add(ball);

  const BOWL_T = 1.05;
  const st = { on: false, phase: 'idle', t: 0, q: 0, swung: false, bounced: false, crossed: 0, vel: new THREE.Vector3() };
  const redraw = () => boardTex.userData.redraw();

  const resetBails = () =>
    bails.forEach((d) => {
      d.flying = false;
      d.b.position.copy(d.home);
      d.b.rotation.set(0, 0, 0);
    });

  const result = (runs, call) => {
    board.balls += 1;
    board.runs += runs;
    redraw();
    onCall?.(call);
    Object.assign(st, { phase: 'result', t: 0 });
  };

  const hit = (q) => {
    onSound?.('thwack');
    const a = Math.PI + spread(1.7);
    const speed = 5 + q * 9;
    st.vel.set(Math.cos(a) * speed, 2.5 + q * 5.5, Math.sin(a) * speed);
    Object.assign(st, { phase: 'hit', t: 0, q, bounced: false, crossed: 0 });
  };

  return {
    group: g,
    get on() {
      return st.on;
    },
    start() {
      Object.assign(board, { runs: 0, wkts: 0, balls: 0 });
      Object.assign(st, { on: true, phase: 'wait', t: 0 });
      resetBails();
      redraw();
    },
    stop() {
      st.on = false;
      st.phase = 'idle';
      ball.visible = false;
    },
    swing() {
      if (!st.on || st.phase !== 'bowl' || st.swung) return;
      st.swung = true;
      const u = st.t / BOWL_T;
      if (u > 0.72 && u < 1) hit(clamp(1 - Math.abs(u - 0.88) / 0.16, 0, 1));
    },
    update(dt) {
      bails.forEach((d) => {
        if (!d.flying) return;
        d.vel.y -= 9.8 * dt;
        d.b.position.addScaledVector(d.vel, dt);
        d.b.rotation.x += dt * 12;
        if (d.b.position.y < 0.02) {
          d.b.position.y = 0.02;
          d.flying = false;
        }
      });
      if (!st.on) return;
      st.t += dt;
      if (st.phase === 'wait') {
        ball.visible = false;
        if (st.t > 1.3) {
          Object.assign(st, { phase: 'bowl', t: 0, swung: false });
          resetBails();
          ball.visible = true;
        }
      } else if (st.phase === 'bowl') {
        const u = Math.min(1, st.t / BOWL_T);
        const y = u < 0.68 ? lerp(0.9, 0.05, (u / 0.68) ** 1.6) : 0.05 + Math.sin(((u - 0.68) / 0.32) * Math.PI * 0.5) * 0.24;
        ball.position.set(lerp(mx + 0.45, CRICKET.stumpX, u), y, 0);
        if (u >= 1) {
          board.wkts += 1;
          bails.forEach((d) => {
            d.flying = true;
            d.vel.set(1.5 + rand(), 2 + rand() * 1.5, spread(2));
          });
          result(0, 'Bowled! Out!');
        }
      } else if (st.phase === 'hit') {
        st.vel.y -= 9.8 * dt;
        ball.position.addScaledVector(st.vel, dt);
        if (ball.position.y < 0.06) {
          ball.position.y = 0.06;
          st.bounced = true;
          st.vel.y = Math.abs(st.vel.y) * 0.35;
          st.vel.x *= 0.7;
          st.vel.z *= 0.7;
        }
        if (!st.crossed && Math.hypot(ball.position.x, ball.position.z) > CRICKET.boundary) st.crossed = st.bounced ? 4 : 6;
        if (st.t > 2.4) {
          const runs = st.crossed || (st.q > 0.55 ? 2 : 1);
          result(runs, runs === 6 ? 'SIX!' : runs === 4 ? 'FOUR!' : `${runs} run${runs > 1 ? 's' : ''}.`);
        }
      } else if (st.phase === 'result' && st.t > 1.4) {
        ball.visible = false;
        if (board.balls >= 6) {
          st.on = false;
          st.phase = 'idle';
          onEnd?.({ ...board });
        } else Object.assign(st, { phase: 'wait', t: 0 });
      }
    }
  };
}

// Hot air balloon
export function createBalloon() {
  const g = group();
  const wicker = mat('#a0703c', { roughness: 0.95 });
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), wicker, [0, 0.04, 0]));
  [[0, 0.45], [0, -0.45], [0.45, 0], [-0.45, 0]].forEach(([x, z]) => g.add(mesh(new THREE.BoxGeometry(x ? 0.05 : 0.9, 0.55, z ? 0.05 : 0.9), wicker, [x, 0.3, z])));
  g.add(mesh(new THREE.TorusGeometry(0.64, 0.035, 6, 4), mat('#6b4a2f'), [0, 0.58, 0]));
  g.children.at(-1).rotation.set(Math.PI / 2, 0, Math.PI / 4);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    g.add(between(new THREE.Vector3(sx * 0.42, 0.55, sz * 0.42), new THREE.Vector3(sx * 0.32, 1.95, sz * 0.32), 0.012, mat('#3a3f4a')));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 8), mat('#c9b48a'), [sx * 0.5, 0.25, sz * 0.5]));
  });
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), mat('#8f96a0', { metalness: 0.6, roughness: 0.3 }), [0, 1.8, 0]));
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 10), flameMat);
  flame.position.y = 2.0;
  flame.raycast = noPick;
  g.add(flame);

  const profile = [[0.32, 0], [0.55, 0.25], [1.15, 0.85], [1.55, 1.6], [1.62, 2.25], [1.45, 2.85], [1.0, 3.35], [0.45, 3.65], [0.01, 3.72]].map(([x, y]) => new THREE.Vector2(x, y));
  const stripes = canvasTexture(512, 64, (ctx, w, h) => {
    const cols = ['#e63946', '#ffd23f', '#2a9d8f', '#f4a261'];
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect((i * w) / 16, 0, w / 16 + 1, h);
    }
  });
  const envelope = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.7 }));
  envelope.position.y = 1.95;
  envelope.castShadow = true;
  g.add(envelope);

  return {
    group: g,
    floor: 0.08,
    update(dt, { t, motion, flying }) {
      const burn = flying ? 1 + Math.sin(t * 9) * 0.3 + Math.sin(t * 23) * 0.15 : 0.35;
      flame.scale.set(1, burn, 1);
      flameMat.opacity = flying ? 0.95 : 0.5;
      envelope.rotation.y += dt * 0.08 * motion;
      envelope.rotation.z = Math.sin(t * 0.7) * 0.03 * motion;
    }
  };
}
