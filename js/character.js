import * as THREE from 'three';
import { mat, mesh, group, canvasTexture, angleTo, rand } from './kit.js';

const SKIN = '#f3cfb1';
const HAIR = '#121212';
const HOODIE = '#2a7f8a';
const JEANS = '#2e3a55';
const SHOE = '#f1efe9';
const SPEED = 0.85;
const HIP_Y = 0.58;
const SIT_DROP = 0.22;
const NAMASTE = { ux: -0.4475, uz: 0.3175, fx: -2.0436, fz: 0.7621, twist: 0.341 };
const { lerp, clamp } = THREE.MathUtils;

const limb = (r, len, color) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(r, len - r * 2, 3, 7), mat(color), [0, -len / 2, 0]));
  return g;
};

const drawBubble = (ctx, w, h, text = '') => {
  ctx.clearRect(0, 0, w, h);
  ctx.font = '600 52px Outfit, sans-serif';
  const bw = Math.min(w - 12, ctx.measureText(text).width + 80);
  ctx.fillStyle = '#fbf7ef';
  ctx.beginPath();
  ctx.roundRect((w - bw) / 2, 6, bw, h - 40, 34);
  ctx.moveTo(w / 2 - 22, h - 36);
  ctx.lineTo(w / 2, h - 6);
  ctx.lineTo(w / 2 + 22, h - 36);
  ctx.fill();
  ctx.fillStyle = '#1d2433';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, (h - 34) / 2 + 4, w - 60);
};

export function createCharacter({ waypoints, onArrive, onLeave, blocked = () => false, reduced = false, start = null }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const legs = [1, -1].map((s) => {
    const thigh = limb(0.075, 0.27, JEANS);
    const shin = limb(0.07, 0.25, JEANS);
    shin.position.y = -0.27;
    shin.add(mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), mat(SHOE), [0, -0.27, 0.04]));
    thigh.add(shin);
    thigh.position.set(s * 0.1, HIP_Y, 0);
    body.add(thigh);
    return { thigh, shin, s };
  });

  const hoodie = mat(HOODIE);
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 10), hoodie, [0, HIP_Y + 0.3, 0]);
  torso.scale.set(1.05, 1, 0.82);
  body.add(torso);
  body.add(mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hoodie, [0, 1.1, -0.11]));
  body.add(mesh(new THREE.BoxGeometry(0.24, 0.1, 0.04), mat('#23707a'), [0, 0.78, 0.165]));
  [-0.05, 0.05].forEach((x) => body.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 4), mat('#f4efe6'), [x, 1.06, 0.17])));
  body.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), mat(SKIN), [0, 1.2, 0]));

  const arms = [1, -1].map((s) => {
    const upper = limb(0.06, 0.24, HOODIE);
    const fore = limb(0.055, 0.22, HOODIE);
    fore.position.y = -0.24;
    const skinMat = mat(SKIN);
    const hand = group(0, -0.25, 0);
    hand.add(mesh(new THREE.BoxGeometry(0.035, 0.075, 0.07), skinMat, [0, -0.03, 0]));
    [-0.024, -0.008, 0.008, 0.024].forEach((z, i) => {
      const len = i === 0 || i === 3 ? 0.035 : 0.045;
      hand.add(mesh(new THREE.CapsuleGeometry(0.009, len, 2, 5), skinMat, [0, -0.075 - len / 2, z]));
    });
    const thumb = mesh(new THREE.CapsuleGeometry(0.01, 0.03, 2, 5), skinMat, [-s * 0.012, -0.03, 0.045]);
    thumb.rotation.x = 0.6;
    hand.add(thumb);
    fore.add(hand);
    upper.add(fore);
    upper.position.set(s * 0.25, 1.1, 0);
    body.add(upper);
    return { upper, fore, hand, s };
  });

  const head = group(0, 1.25, 0);
  body.add(head);
  const skin = mat(SKIN);
  head.add(mesh(new THREE.IcosahedronGeometry(0.26, 2), skin, [0, 0.24, 0]));
  const hairMat = mat(HAIR, { roughness: 0.6 });
  const cap = mesh(new THREE.SphereGeometry(0.275, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, [0, 0.25, -0.01]);
  cap.rotation.x = -0.32;
  head.add(cap);
  head.add(mesh(new THREE.SphereGeometry(0.272, 14, 8, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.42), hairMat, [0, 0.23, -0.01]));
  [[0.1, 0.43, 0.2, -0.5], [-0.02, 0.45, 0.22, -0.25], [-0.13, 0.41, 0.19, 0.1]].forEach(([x, y, z, r]) => {
    const f = mesh(new THREE.IcosahedronGeometry(0.1, 0), hairMat, [x, y, z]);
    f.scale.set(1.2, 0.55, 0.7);
    f.rotation.z = r;
    head.add(f);
  });
  [1, -1].forEach((s) => {
    head.add(mesh(new THREE.BoxGeometry(0.04, 0.12, 0.08), hairMat, [s * 0.245, 0.24, 0.05]));
    head.add(mesh(new THREE.IcosahedronGeometry(0.05, 1), skin, [s * 0.262, 0.22, -0.01]));
    head.add(mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), hairMat, [s * 0.09, 0.34, 0.245]));
  });
  const eyeMat = mat('#16110e', { roughness: 0.3, flatShading: false });
  const eyes = [1, -1].map((s) => {
    const e = mesh(new THREE.SphereGeometry(0.034, 10, 8), eyeMat, [s * 0.09, 0.26, 0.235]);
    e.scale.z = 0.5;
    head.add(e);
    return e;
  });
  head.add(mesh(new THREE.IcosahedronGeometry(0.026, 1), skin, [0, 0.21, 0.26]));
  const smile = mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 12, Math.PI), mat('#5a2a20'), [0, 0.15, 0.24]);
  smile.rotation.z = Math.PI;
  head.add(smile);

  const scarf = group(0, 1.17, 0);
  const scarfMat = mat('#c0392b');
  const ring = mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 14), scarfMat);
  ring.rotation.x = Math.PI / 2;
  scarf.add(ring, mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), scarfMat, [0.08, -0.12, 0.15]));
  body.add(scarf);

  const umbrella = group(-0.27, 0, 0.36);
  const canopy = mesh(new THREE.ConeGeometry(0.72, 0.32, 8, 1, true), mat('#e8a53c', { side: THREE.DoubleSide }), [0, 2.05, 0]);
  umbrella.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 5), mat('#3a3a3a'), [0, 1.6, 0]), canopy, mesh(new THREE.IcosahedronGeometry(0.035, 0), mat('#3a3a3a'), [0, 2.24, 0]));
  body.add(umbrella);

  const laptop = group(0, HIP_Y + 0.08, 0.2);
  laptop.add(mesh(new THREE.BoxGeometry(0.34, 0.022, 0.22), mat('#c9ccd2', { metalness: 0.3 })));
  const lid = group(0, 0.01, 0.11);
  lid.rotation.x = 0.28;
  const screenMat = new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: '#7fd1ff', emissiveIntensity: 0.9 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), screenMat);
  screen.position.set(0, 0.11, -0.008);
  screen.rotation.y = Math.PI;
  lid.add(mesh(new THREE.BoxGeometry(0.34, 0.22, 0.012), mat('#c9ccd2', { metalness: 0.3 }), [0, 0.11, 0]), screen);
  laptop.add(lid);
  body.add(laptop);

  const bubbleTex = canvasTexture(1024, 170, drawBubble);
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthTest: false, opacity: 0 }));
  bubble.scale.set(3, 0.5, 1);
  bubble.position.set(0, 2.35, 0);
  bubble.renderOrder = 10;
  bubble.raycast = () => {};
  root.add(bubble);

  const st = { mode: 'idle', target: 0, timer: 2, wave: 0, waveK: 0, talk: 0, talkK: 0, walk: 0, sit: 0, pray: 0, blink: 0, nextBlink: 2, phase: 0, umb: 0, scarf: 0, moving: false, manualIdle: 0 };
  const input = { x: 0, z: 0 };
  const wPos = new THREE.Vector3();

  const place = (i) => {
    const wp = waypoints[i];
    root.position.set(wp.x, 0.6, wp.z);
    root.rotation.y = Math.atan2(wp.look[0] - wp.x, wp.look[1] - wp.z);
    st.target = i;
  };

  const startI = Math.max(0, waypoints.findIndex((w) => w.name === start?.name));
  place(startI);
  st.timer = reduced ? Infinity : (start?.timer ?? 3);
  onArrive?.(waypoints[startI].name);

  const turn = (desired, dt, rate = 8) => (root.rotation.y += angleTo(root.rotation.y, desired) * (1 - Math.exp(-dt * rate)));

  const say = (text, secs = 3, wave = false) => {
    bubbleTex.userData.redraw(text);
    st.talk = secs;
    if (wave) st.wave = secs;
  };

  if (waypoints[startI].line) say(waypoints[startI].line, Math.min(st.timer, 5));

  const nearest = () => {
    let best = 0;
    waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - root.position.x, w.z - root.position.z);
      if (d < Math.hypot(waypoints[best].x - root.position.x, waypoints[best].z - root.position.z)) best = i;
    });
    return best;
  };

  const drive = (dt) => {
    const len = Math.hypot(input.x, input.z);
    st.moving = len > 0.01;
    if (!st.moving) {
      if ((st.manualIdle += dt) > 10 && !reduced) {
        st.target = nearest();
        st.mode = 'walk';
      }
      return;
    }
    st.manualIdle = 0;
    const step = SPEED * 1.5 * dt;
    const { x, z } = root.position;
    const nx = x + (input.x / len) * step;
    const nz = z + (input.z / len) * step;
    if (blocked(x, z) || !blocked(nx, nz)) root.position.set(nx, 0.6, nz);
    else if (!blocked(nx, z)) root.position.x = nx;
    else if (!blocked(x, nz)) root.position.z = nz;
    turn(Math.atan2(input.x, input.z), dt, 12);
    st.phase += (step * 9) / SPEED;
  };

  const update = (dt, { t, motion, rain, snow, temp, cam }) => {
    const wp = waypoints[st.target];
    let sitTarget = 0;
    st.talk -= dt;

    if (Math.hypot(input.x, input.z) > 0.01 && st.mode !== 'manual') {
      if (st.mode === 'idle' && wp.wait) onLeave?.(wp.name);
      st.mode = 'manual';
      st.wave = 0;
    }

    if (st.mode === 'manual') {
      if (st.wave > 0) st.wave -= dt;
      drive(dt);
    } else if (st.wave > 0) {
      st.wave -= dt;
      if (wp.sit && st.mode === 'idle') sitTarget = st.sit > 0.5 ? 1 : 0;
    } else if (st.mode === 'walk') {
      const dx = wp.x - root.position.x;
      const dz = wp.z - root.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.04) {
        st.mode = 'idle';
        st.timer = wp.wait ? wp.wait[0] + rand() * (wp.wait[1] - wp.wait[0]) : 0;
        if (st.timer > 0) onArrive?.(wp.name);
        if (wp.line && st.timer > 0) say(wp.line, Math.min(st.timer, 4));
      } else {
        const step = Math.min(d, SPEED * dt * motion);
        root.position.x += (dx / d) * step;
        root.position.z += (dz / d) * step;
        turn(Math.atan2(dx, dz), dt);
        st.phase += dt * SPEED * 9 * motion;
      }
    } else {
      if (wp.look) turn(Math.atan2(wp.look[0] - wp.x, wp.look[1] - wp.z), dt, 5);
      st.timer -= dt;
      sitTarget = wp.sit && st.timer > 0 ? 1 : 0;
      if (st.timer <= 0 && st.sit < 0.05) {
        if (wp.wait) onLeave?.(wp.name);
        st.target = (st.target + 1) % waypoints.length;
        st.mode = 'walk';
      }
    }

    const k = (r) => 1 - Math.exp(-dt * r);
    st.walk = lerp(st.walk, (st.mode === 'walk' && st.wave <= 0) || (st.mode === 'manual' && st.moving) ? 1 : 0, k(8));
    st.talkK = lerp(st.talkK, st.talk > 0 ? 1 : 0, k(8));
    st.sit = lerp(st.sit, sitTarget, k(4));
    st.pray = lerp(st.pray, st.mode === 'idle' && wp.pray && st.timer > 0 && st.wave <= 0 ? 1 : 0, k(4));
    st.waveK = lerp(st.waveK, st.wave > 0 ? 1 : 0, k(8));
    st.umb = lerp(st.umb, (rain > 0.15 || snow > 0.3) && st.sit < 0.5 && st.pray < 0.5 ? 1 : 0, k(4));
    st.scarf = lerp(st.scarf, temp < 8 ? 1 : 0, k(3));

    const s = Math.sin(st.phase);
    const w = st.walk;
    const sit = st.sit;
    const typing = Math.sin(t * 18) * 0.06 * sit;

    legs.forEach(({ thigh, shin, s: side }) => {
      const sw = s * side;
      thigh.rotation.x = lerp(sw * 0.6 * w, -Math.PI / 2, sit);
      shin.rotation.x = lerp(Math.max(0, -sw) * 0.8 * w, Math.PI / 2, sit);
    });

    const waveArm = st.umb > 0.5 ? arms[0] : arms[1];
    arms.forEach((a) => {
      const swing = -s * a.s * 0.5 * w;
      let ux = lerp(swing, -0.55 + typing, sit);
      let uz = a.s * 0.12;
      let fx = lerp(-0.15 * w, -1.0 - typing, sit);
      let fz = 0;
      if (st.pray > 0.01) {
        ux = lerp(ux, NAMASTE.ux, st.pray);
        uz = lerp(uz, -a.s * NAMASTE.uz, st.pray);
        fx = lerp(fx, NAMASTE.fx, st.pray);
        fz = lerp(fz, -a.s * NAMASTE.fz, st.pray);
      }
      a.hand.rotation.y = -a.s * NAMASTE.twist * st.pray;
      if (a === arms[1] && st.umb > 0.01) {
        ux = lerp(ux, -2.0, st.umb);
        fx = lerp(fx, 0, st.umb);
      }
      if (a === waveArm && st.waveK > 0.01) {
        ux = lerp(ux, 0, st.waveK);
        uz = lerp(uz, a.s * 2.6, st.waveK);
        fz = Math.sin(t * 14) * 0.45 * st.waveK * a.s;
        fx = lerp(fx, 0, st.waveK);
      }
      a.upper.rotation.set(ux, 0, uz);
      a.fore.rotation.set(fx, 0, fz);
    });

    body.position.y = Math.abs(s) * 0.035 * w - SIT_DROP * sit + Math.sin(t * 2) * 0.006;
    body.rotation.x = 0.06 * w + 0.12 * st.pray;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.012;

    root.getWorldPosition(wPos);
    const toCam = angleTo(root.rotation.y, Math.atan2(cam.x - wPos.x, cam.z - wPos.z));
    const still = st.mode === 'idle' || st.wave > 0 || (st.mode === 'manual' && !st.moving);
    const look = still && st.pray < 0.5 ? clamp(toCam, -0.9, 0.9) : 0;
    head.rotation.y = lerp(head.rotation.y, sit > 0.5 && st.wave <= 0 ? 0 : look, k(4));
    head.rotation.x = lerp(head.rotation.x, sit > 0.5 && st.wave <= 0 ? 0.28 : st.pray * 0.3, k(4));
    head.rotation.z = Math.sin(st.phase * 0.5) * 0.04 * w;

    if ((st.nextBlink -= dt) <= 0) {
      st.blink = 0.14;
      st.nextBlink = 2 + rand() * 3.5;
    }
    st.blink -= dt;
    eyes.forEach((e) => (e.scale.y = st.blink > 0 ? 0.12 : 1));
    smile.scale.setScalar(1 + st.waveK * 0.35);

    umbrella.visible = st.umb > 0.02;
    umbrella.scale.setScalar(Math.max(0.001, st.umb));
    canopy.rotation.y += dt * 0.3 * w;
    scarf.visible = st.scarf > 0.02;
    scarf.scale.setScalar(Math.max(0.001, st.scarf));
    laptop.visible = sit > 0.3;
    laptop.scale.setScalar(clamp((sit - 0.3) / 0.7, 0.001, 1));
    screenMat.emissiveIntensity = 0.7 + Math.sin(t * 3) * 0.1;

    bubble.material.opacity = st.talkK;
    bubble.visible = st.talkK > 0.02;
    bubble.position.y = 2.35 - SIT_DROP * sit + Math.sin(t * 3) * 0.03;
  };

  return {
    root,
    update,
    wave: () => say("Hi, I'm Ashvini! Use arrow keys to walk me.", 3, true),
    say,
    setInput: (x, z) => Object.assign(input, { x, z }),
    get pos() {
      return root.position;
    },
    get manual() {
      return st.mode === 'manual';
    },
    get at() {
      return st.mode === 'idle' ? waypoints[st.target].name : null;
    }
  };
}
